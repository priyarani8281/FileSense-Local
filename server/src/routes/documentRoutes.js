import express from 'express';
import fs from 'fs';
import path from 'path';
import { getDb } from '../database/db.js';
import { openInDefaultApp } from '../utils/fileSystem.js';
import { indexingManager } from '../services/indexingQueue.js';

export const documentRouter = express.Router();

// List documents with filtering, sorting & pagination
documentRouter.get('/', (req, res) => {
  try {
    const db = getDb();
    const { folderId, fileType, isFavorite, search, sortBy = 'date', page = '1', limit = '50' } = req.query;

    let sql = `
      SELECT 
        d.id,
        d.folder_id,
        d.path,
        d.filename,
        d.extension,
        d.size,
        d.mtime,
        d.hash,
        d.is_favorite,
        d.last_opened_at,
        d.indexed_at,
        d.status,
        d.error_message,
        d.chunk_count,
        f.name AS folder_name,
        ((SELECT COUNT(*) FROM documents d2 WHERE d2.hash = d.hash AND d.hash IS NOT NULL) > 1) AS is_duplicate,
        (SELECT d3.filename FROM documents d3 WHERE d3.hash = d.hash AND d3.id != d.id AND d.hash IS NOT NULL LIMIT 1) AS duplicate_of
      FROM documents d
      LEFT JOIN folders f ON d.folder_id = f.id
      WHERE 1=1
    `;
    const params = [];

    if (folderId && folderId !== 'all') {
      sql += ' AND d.folder_id = ?';
      params.push(parseInt(folderId, 10));
    }
    if (fileType && fileType !== 'all') {
      const ext = fileType.toLowerCase().startsWith('.') ? fileType.toLowerCase() : `.${fileType.toLowerCase()}`;
      sql += ' AND d.extension = ?';
      params.push(ext);
    }
    if (isFavorite === 'true') {
      sql += ' AND d.is_favorite = 1';
    }
    if (search && search.trim()) {
      sql += ' AND (d.filename LIKE ? OR d.path LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    // Sorting
    if (sortBy === 'name') {
      sql += ' ORDER BY d.filename ASC';
    } else if (sortBy === 'size') {
      sql += ' ORDER BY d.size DESC';
    } else if (sortBy === 'chunks') {
      sql += ' ORDER BY d.chunk_count DESC';
    } else {
      sql += ' ORDER BY d.mtime DESC';
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * pageSize;

    const countSql = sql.replace(/SELECT\s+[\s\S]+?\s+FROM/, 'SELECT COUNT(*) as count FROM');
    const totalCount = db.prepare(countSql).get(...params)?.count || 0;

    sql += ' LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const documents = db.prepare(sql).all(...params).map(d => ({
      ...d,
      is_favorite: Boolean(d.is_favorite),
      existsOnDisk: fs.existsSync(d.path)
    }));

    res.json({
      documents,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total: totalCount,
        totalPages: Math.ceil(totalCount / pageSize)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get document details & chunks preview
documentRouter.get('/:id', (req, res) => {
  try {
    const docId = parseInt(req.params.id, 10);
    const db = getDb();

    const doc = db.prepare(`
      SELECT d.*, f.name AS folder_name
      FROM documents d
      LEFT JOIN folders f ON d.folder_id = f.id
      WHERE d.id = ?
    `).get(docId);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const chunks = db.prepare(`
      SELECT id, chunk_index, content, token_count, page_number
      FROM chunks
      WHERE document_id = ?
      ORDER BY chunk_index ASC
    `).all(docId);

    res.json({
      document: {
        ...doc,
        is_favorite: Boolean(doc.is_favorite),
        existsOnDisk: fs.existsSync(doc.path)
      },
      chunks
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle favorite
documentRouter.post('/:id/favorite', (req, res) => {
  try {
    const docId = parseInt(req.params.id, 10);
    const db = getDb();

    const current = db.prepare('SELECT is_favorite FROM documents WHERE id = ?').get(docId);
    if (!current) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const newVal = current.is_favorite ? 0 : 1;
    db.prepare('UPDATE documents SET is_favorite = ? WHERE id = ?').run(newVal, docId);

    res.json({ success: true, isFavorite: Boolean(newVal) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Open document in OS default app
documentRouter.post('/:id/open', async (req, res) => {
  try {
    const docId = parseInt(req.params.id, 10);
    const db = getDb();

    const doc = db.prepare('SELECT path, filename FROM documents WHERE id = ?').get(docId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found in index.' });
    }

    if (!fs.existsSync(doc.path)) {
      // Mark as missing
      db.prepare("UPDATE documents SET status = 'missing' WHERE id = ?").run(docId);
      return res.status(410).json({
        error: `File no longer exists at ${doc.path}. It may have been moved or deleted.`
      });
    }

    // Update last opened timestamp
    db.prepare('UPDATE documents SET last_opened_at = CURRENT_TIMESTAMP WHERE id = ?').run(docId);

    await openInDefaultApp(doc.path);
    res.json({ success: true, message: `Opened "${doc.filename}" in your default application.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove document from index (does NOT delete disk file)
documentRouter.delete('/:id', (req, res) => {
  try {
    const docId = parseInt(req.params.id, 10);
    const db = getDb();

    const doc = db.prepare('SELECT filename FROM documents WHERE id = ?').get(docId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    try {
      db.prepare('DELETE FROM chunks_fts WHERE document_id = ?').run(docId);
    } catch {}

    db.prepare('DELETE FROM documents WHERE id = ?').run(docId);

    res.json({
      success: true,
      message: `"${doc.filename}" removed from search index. The original file remains on your disk.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Re-index single document
documentRouter.post('/:id/reindex', async (req, res) => {
  try {
    const docId = parseInt(req.params.id, 10);
    const db = getDb();

    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(docId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    if (!fs.existsSync(doc.path)) {
      db.prepare("UPDATE documents SET status = 'missing' WHERE id = ?").run(docId);
      return res.status(410).json({ error: 'File does not exist on disk.' });
    }

    const stat = fs.statSync(doc.path);
    await indexingManager.processSingleFile({
      path: doc.path,
      filename: doc.filename,
      extension: doc.extension,
      size: stat.size,
      mtime: Math.floor(stat.mtimeMs)
    }, doc.folder_id, true);

    res.json({ success: true, message: `"${doc.filename}" re-indexed successfully.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
