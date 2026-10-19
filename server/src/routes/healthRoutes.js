import express from 'express';
import { checkHealth } from '../services/ollamaService.js';
import { getDb } from '../database/db.js';

export const healthRouter = express.Router();

healthRouter.get('/', async (req, res) => {
  try {
    const db = getDb();
    const ollamaStatus = await checkHealth();

    const folderCount = db.prepare('SELECT COUNT(*) as count FROM folders').get().count;
    const docCount = db.prepare("SELECT COUNT(*) as count FROM documents WHERE status = 'indexed'").get().count;
    const chunkCount = db.prepare('SELECT COUNT(*) as count FROM chunks').get().count;
    const failedCount = db.prepare("SELECT COUNT(*) as count FROM documents WHERE status = 'failed'").get().count;

    res.json({
      status: 'ok',
      service: 'FileSense Local',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      ollama: ollamaStatus,
      stats: {
        folders: folderCount,
        documents: docCount,
        chunks: chunkCount,
        failed: failedCount
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
