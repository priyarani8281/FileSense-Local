import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getDb } from '../database/db.js';
import { config } from '../config.js';
import { parseDocument } from './documentParser.js';
import { chunkDocumentPages } from './textChunker.js';
import { generateEmbeddings } from './ollamaService.js';
import { embeddingToBuffer } from './vectorStore.js';

class IndexingManager {
  constructor() {
    this.state = {
      isIndexing: false,
      folderId: null,
      folderPath: '',
      totalFiles: 0,
      processedFiles: 0,
      currentFile: '',
      status: 'idle', // 'idle' | 'scanning' | 'indexing' | 'completed' | 'failed' | 'cancelled'
      errors: [],
      cancelRequested: false,
      startTime: null,
      endTime: null
    };
  }

  getStatus() {
    return { ...this.state };
  }

  cancel() {
    if (this.state.isIndexing) {
      this.state.cancelRequested = true;
      this.state.status = 'cancelling';
    }
  }

  /**
   * Scan and index a folder
   * @param {number} folderId
   * @param {boolean} [forceReindex=false]
   */
  async indexFolder(folderId, forceReindex = false) {
    if (this.state.isIndexing) {
      throw new Error('An indexing job is already in progress.');
    }

    const db = getDb();
    const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(folderId);

    if (!folder) {
      throw new Error(`Folder with ID ${folderId} not found.`);
    }

    if (!fs.existsSync(folder.path)) {
      throw new Error(`Folder path does not exist on disk: ${folder.path}`);
    }

    this.state = {
      isIndexing: true,
      folderId,
      folderPath: folder.path,
      totalFiles: 0,
      processedFiles: 0,
      currentFile: 'Scanning folder...',
      status: 'scanning',
      errors: [],
      cancelRequested: false,
      startTime: Date.now(),
      endTime: null
    };

    try {
      // 1. Discover all candidate files
      const discoveredFiles = this.discoverFiles(folder.path);
      this.state.totalFiles = discoveredFiles.length;
      this.state.status = 'indexing';

      // 2. Detect missing files that were previously indexed
      const existingDocs = db.prepare('SELECT id, path FROM documents WHERE folder_id = ?').all(folderId);
      const discoveredSet = new Set(discoveredFiles.map(f => path.normalize(f.path)));

      for (const doc of existingDocs) {
        if (!discoveredSet.has(path.normalize(doc.path))) {
          // File was deleted or moved
          db.prepare("UPDATE documents SET status = 'missing' WHERE id = ?").run(doc.id);
        }
      }

      // 3. Process each file incrementally
      for (const fileInfo of discoveredFiles) {
        if (this.state.cancelRequested) {
          this.state.status = 'cancelled';
          break;
        }

        this.state.currentFile = path.basename(fileInfo.path);

        try {
          await this.processSingleFile(fileInfo, folderId, forceReindex);
        } catch (err) {
          console.error(`[IndexQueue] Error indexing file ${fileInfo.path}:`, err.message);
          this.state.errors.push({
            file: path.basename(fileInfo.path),
            path: fileInfo.path,
            error: err.message
          });

          // Mark document as failed in DB
          db.prepare(`
            INSERT INTO documents (folder_id, path, filename, extension, size, mtime, status, error_message)
            VALUES (?, ?, ?, ?, ?, ?, 'failed', ?)
            ON CONFLICT(path) DO UPDATE SET status = 'failed', error_message = excluded.error_message
          `).run(
            folderId,
            fileInfo.path,
            path.basename(fileInfo.path),
            fileInfo.extension,
            fileInfo.size,
            fileInfo.mtime,
            err.message
          );
        }

        this.state.processedFiles++;
      }

      // 4. Update folder stats
      const docCountRow = db.prepare(
        "SELECT COUNT(*) as count FROM documents WHERE folder_id = ? AND status = 'indexed'"
      ).get(folderId);

      db.prepare(`
        UPDATE folders 
        SET last_scanned_at = CURRENT_TIMESTAMP, file_count = ? 
        WHERE id = ?
      `).run(docCountRow.count, folderId);

      this.state.status = this.state.cancelRequested ? 'cancelled' : 'completed';
    } catch (err) {
      console.error('[IndexQueue] Fatal error during folder indexing:', err);
      this.state.status = 'failed';
      this.state.errors.push({ file: 'General', error: err.message });
    } finally {
      this.state.isIndexing = false;
      this.state.endTime = Date.now();
    }
  }

  /**
   * Recursively scan a folder for supported files, respecting ignore lists
   */
  discoverFiles(dirPath) {
    const results = [];

    const traverse = (currentDir) => {
      try {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);
          const lowerName = entry.name.toLowerCase();

          // Skip hidden files & system folders
          if (entry.name.startsWith('.')) continue;
          if (config.blockedDirectories.some(b => lowerName === b || lowerName.includes(b))) continue;

          if (entry.isDirectory()) {
            traverse(fullPath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (config.supportedExtensions.includes(ext)) {
              try {
                const stat = fs.statSync(fullPath);
                results.push({
                  path: fullPath,
                  filename: entry.name,
                  extension: ext,
                  size: stat.size,
                  mtime: Math.floor(stat.mtimeMs)
                });
              } catch (e) {
                // Skip if unreadable
              }
            }
          }
        }
      } catch (err) {
        console.warn(`[IndexQueue] Cannot read directory ${currentDir}:`, err.message);
      }
    };

    traverse(dirPath);
    return results;
  }

  /**
   * Compute fast SHA-256 hash of a file for content-level change and duplicate detection
   */
  computeFileHash(filePath) {
    try {
      const buffer = fs.readFileSync(filePath);
      return crypto.createHash('sha256').update(buffer).digest('hex');
    } catch {
      return null;
    }
  }

  /**
   * Process a single document: hash -> check duplicates -> parse -> chunk -> embed -> store
   */
  async processSingleFile(fileInfo, folderId, forceReindex) {
    const db = getDb();
    const fileHash = this.computeFileHash(fileInfo.path);

    // Check if file is already up-to-date by content hash
    const existing = db.prepare('SELECT id, mtime, size, hash, status FROM documents WHERE path = ?').get(fileInfo.path);

    if (
      !forceReindex &&
      existing &&
      existing.status === 'indexed' &&
      existing.hash === fileHash &&
      existing.size === fileInfo.size
    ) {
      // Content hash is identical, skip re-embedding
      return;
    }

    // Check if an identical document already exists in the database (duplicate file)
    let duplicateDoc = null;
    if (fileHash) {
      duplicateDoc = db.prepare(
        "SELECT id, filename FROM documents WHERE hash = ? AND status = 'indexed' AND path != ? LIMIT 1"
      ).get(fileHash, fileInfo.path);
    }

    let chunkEmbeddings = [];

    if (duplicateDoc && !forceReindex) {
      // Fast path: Reuse chunks and embeddings from the duplicate document!
      const existingChunks = db.prepare(
        'SELECT chunk_index, content, token_count, page_number, embedding FROM chunks WHERE document_id = ?'
      ).all(duplicateDoc.id);

      if (existingChunks.length > 0) {
        chunkEmbeddings = existingChunks;
      }
    }

    // If no duplicate chunks to reuse, perform full parse and embedding
    if (chunkEmbeddings.length === 0) {
      // 1. Parse document text
      const parsed = await parseDocument(fileInfo.path);
      if (!parsed.text || parsed.text.trim().length === 0) {
        throw new Error('Document contained no extractable text.');
      }

      // 2. Chunk pages
      const chunks = chunkDocumentPages(parsed.pages);
      if (chunks.length === 0) {
        throw new Error('Document produced 0 text chunks.');
      }

      // 3. Generate embeddings in batches (concurrency: 5)
      const BATCH_SIZE = 5;

      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        if (this.state.cancelRequested) break;

        const batch = chunks.slice(i, i + BATCH_SIZE);
        const texts = batch.map(c => c.content);

        try {
          const embeddings = await generateEmbeddings(texts);
          for (let j = 0; j < batch.length; j++) {
            chunkEmbeddings.push({
              ...batch[j],
              embedding: embeddings[j] || null
            });
          }
        } catch (embErr) {
          console.warn(`[IndexQueue] Failed to generate embedding for batch: ${embErr.message}`);
          for (const item of batch) {
            chunkEmbeddings.push({ ...item, embedding: null });
          }
        }
      }
    }

    // 4. Store in database transaction
    const saveTransaction = db.transaction(() => {
      let docId;
      if (existing) {
        docId = existing.id;
        db.prepare(`
          UPDATE documents 
          SET size = ?, mtime = ?, hash = ?, status = 'indexed', error_message = NULL, 
              chunk_count = ?, indexed_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(fileInfo.size, fileInfo.mtime, fileHash, chunkEmbeddings.length, docId);

        // Delete previous chunks & FTS entries
        db.prepare('DELETE FROM chunks WHERE document_id = ?').run(docId);
        try {
          db.prepare('DELETE FROM chunks_fts WHERE document_id = ?').run(docId);
        } catch {}
      } else {
        const info = db.prepare(`
          INSERT INTO documents (folder_id, path, filename, extension, size, mtime, hash, status, chunk_count)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'indexed', ?)
        `).run(
          folderId,
          fileInfo.path,
          fileInfo.filename,
          fileInfo.extension,
          fileInfo.size,
          fileInfo.mtime,
          fileHash,
          chunkEmbeddings.length
        );
        docId = info.lastInsertRowid;
      }

      // Insert chunks & FTS
      const insertChunk = db.prepare(`
        INSERT INTO chunks (document_id, chunk_index, content, token_count, page_number, embedding)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      let insertFts;
      try {
        insertFts = db.prepare(`
          INSERT INTO chunks_fts (content, chunk_id, document_id) VALUES (?, ?, ?)
        `);
      } catch {}

      for (const ch of chunkEmbeddings) {
        const embBuffer = ch.embedding ? embeddingToBuffer(ch.embedding) : null;
        const chunkRow = insertChunk.run(
          docId,
          ch.chunkIndex,
          ch.content,
          ch.tokenCount,
          ch.pageNumber,
          embBuffer
        );

        if (insertFts) {
          try {
            insertFts.run(ch.content, chunkRow.lastInsertRowid, docId);
          } catch {}
        }
      }
    });

    saveTransaction();
  }
}

export const indexingManager = new IndexingManager();
