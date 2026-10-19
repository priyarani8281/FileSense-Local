import express from 'express';
import path from 'path';
import { getDb } from '../database/db.js';
import { validateDirectory, listSubdirectories, openNativeFolderDialog } from '../utils/fileSystem.js';
import { indexingManager } from '../services/indexingQueue.js';

export const folderRouter = express.Router();

// List all registered folders
folderRouter.get('/', (req, res) => {
  try {
    const db = getDb();
    const folders = db.prepare(`
      SELECT 
        f.*,
        (SELECT COUNT(*) FROM documents WHERE folder_id = f.id AND status = 'indexed') AS active_files,
        (SELECT COUNT(*) FROM documents WHERE folder_id = f.id AND status = 'failed') AS failed_files,
        (SELECT COUNT(*) FROM documents WHERE folder_id = f.id AND status = 'missing') AS missing_files
      FROM folders f
      ORDER BY f.created_at DESC
    `).all();

    res.json({ folders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a folder to index
folderRouter.post('/', async (req, res) => {
  try {
    const { folderPath, name, autoIndex = true } = req.body;
    const validation = validateDirectory(folderPath);

    if (!validation.isValid) {
      return res.status(400).json({ error: validation.reason });
    }

    const resolved = validation.resolvedPath;
    const folderName = name || path.basename(resolved);
    const db = getDb();

    // Check if folder or parent is already added
    const existing = db.prepare('SELECT id, name FROM folders WHERE path = ?').get(resolved);
    if (existing) {
      return res.status(409).json({
        error: `Folder is already added as "${existing.name}".`,
        folderId: existing.id
      });
    }

    const info = db.prepare(`
      INSERT INTO folders (path, name, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    `).run(resolved, folderName);

    const newFolderId = info.lastInsertRowid;

    // Trigger initial indexing in background if requested
    if (autoIndex && !indexingManager.getStatus().isIndexing) {
      indexingManager.indexFolder(newFolderId, false).catch(err => {
        console.error('[FolderRoute] Background index error:', err);
      });
    }

    res.status(201).json({
      success: true,
      folderId: newFolderId,
      path: resolved,
      name: folderName,
      message: 'Folder added successfully. Indexing started in background.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove folder from index (does NOT delete disk files!)
folderRouter.delete('/:id', (req, res) => {
  try {
    const folderId = parseInt(req.params.id, 10);
    const db = getDb();

    const folder = db.prepare('SELECT path, name FROM folders WHERE id = ?').get(folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found in index.' });
    }

    // Clean up FTS5 entries
    const docIds = db.prepare('SELECT id FROM documents WHERE folder_id = ?').all(folderId).map(d => d.id);
    for (const dId of docIds) {
      try {
        db.prepare('DELETE FROM chunks_fts WHERE document_id = ?').run(dId);
      } catch {}
    }

    // CASCADE delete removes documents and chunks
    db.prepare('DELETE FROM folders WHERE id = ?').run(folderId);

    res.json({
      success: true,
      message: `Folder "${folder.name}" removed from index. Files on your computer were untouched.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger indexing for a folder
folderRouter.post('/:id/index', async (req, res) => {
  try {
    const folderId = parseInt(req.params.id, 10);
    const { forceReindex = false } = req.body;

    if (indexingManager.getStatus().isIndexing) {
      return res.status(409).json({ error: 'An indexing job is already active.' });
    }

    // Launch in background
    indexingManager.indexFolder(folderId, forceReindex).catch(err => {
      console.error('[FolderRoute] Background index error:', err);
    });

    res.json({ success: true, message: 'Indexing job started.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current indexing progress
folderRouter.get('/indexing-status', (req, res) => {
  res.json(indexingManager.getStatus());
});

// Cancel active indexing
folderRouter.post('/indexing-cancel', (req, res) => {
  indexingManager.cancel();
  res.json({ success: true, message: 'Cancellation signal sent.' });
});

// Subdirectory explorer for in-app picker
folderRouter.get('/browse-subdirs', (req, res) => {
  try {
    const targetPath = req.query.path ? String(req.query.path) : undefined;
    const subdirs = listSubdirectories(targetPath);
    res.json({
      currentPath: targetPath || process.env.USERPROFILE || 'C:\\Users',
      subdirs
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Launch native Windows folder dialog
folderRouter.post('/native-dialog', async (req, res) => {
  try {
    const selectedPath = await openNativeFolderDialog();
    if (!selectedPath) {
      return res.json({ selectedPath: null, cancelled: true });
    }
    res.json({ selectedPath, cancelled: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
