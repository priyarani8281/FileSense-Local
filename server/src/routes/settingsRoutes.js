import express from 'express';
import fs from 'fs';
import { getDb } from '../database/db.js';
import { checkHealth, generateEmbeddings } from '../services/ollamaService.js';
import { config } from '../config.js';

export const settingsRouter = express.Router();

// Get settings
settingsRouter.get('/', async (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settingsObj = {};
    for (const r of rows) {
      settingsObj[r.key] = r.value;
    }

    const health = await checkHealth();

    res.json({
      settings: settingsObj,
      ollamaStatus: health
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update settings
settingsRouter.put('/', (req, res) => {
  try {
    const db = getDb();
    const updates = req.body;

    const allowedKeys = [
      'chat_model',
      'embed_model',
      'ollama_url',
      'theme',
      'search_history_enabled',
      'chunk_size',
      'chunk_overlap',
      'top_k'
    ];

    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

    const updateTx = db.transaction(() => {
      for (const [key, value] of Object.entries(updates)) {
        if (allowedKeys.includes(key)) {
          stmt.run(key, String(value));
        }
      }
    });

    updateTx();

    res.json({ success: true, message: 'Settings saved successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test Ollama connection & embedding
settingsRouter.post('/test-ollama', async (req, res) => {
  try {
    const health = await checkHealth();
    let embeddingTest = { success: false, dimension: 0, error: null };

    if (health.connected && health.embedModelReady) {
      try {
        const testVec = await generateEmbeddings('FileSense Local test');
        embeddingTest = {
          success: true,
          dimension: testVec[0]?.length || 0,
          error: null
        };
      } catch (embErr) {
        embeddingTest = {
          success: false,
          dimension: 0,
          error: embErr.message
        };
      }
    }

    res.json({
      health,
      embeddingTest
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Privacy & storage audit
settingsRouter.get('/privacy-audit', (req, res) => {
  try {
    const db = getDb();

    let dbSizeBytes = 0;
    try {
      if (fs.existsSync(config.dbPath)) {
        dbSizeBytes = fs.statSync(config.dbPath).size;
      }
    } catch {}

    const docCount = db.prepare('SELECT COUNT(*) as c FROM documents').get().c;
    const chunkCount = db.prepare('SELECT COUNT(*) as c FROM chunks').get().c;
    const embeddedChunkCount = db.prepare('SELECT COUNT(*) as c FROM chunks WHERE embedding IS NOT NULL').get().c;
    const historyCount = db.prepare('SELECT COUNT(*) as c FROM search_history').get().c;

    res.json({
      privacyArchitecture: {
        networkMode: '100% Local (0 external requests)',
        databaseType: 'SQLite3 (Embedded)',
        databaseLocation: config.dbPath,
        databaseSizeBytes: dbSizeBytes,
        databaseSizeMB: Math.round((dbSizeBytes / (1024 * 1024)) * 100) / 100,
        ollamaEndpoint: config.ollamaHost,
        remoteTelemetry: false,
        cloudStorage: false
      },
      stats: {
        totalDocuments: docCount,
        totalChunks: chunkCount,
        embeddedChunks: embeddedChunkCount,
        searchHistoryEntries: historyCount
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset all index data with double confirmation
settingsRouter.post('/reset-index', (req, res) => {
  try {
    const { confirmation } = req.body;
    if (confirmation !== 'RESET_ALL_DATA') {
      return res.status(400).json({
        error: 'Confirmation string "RESET_ALL_DATA" required to perform destructive reset.'
      });
    }

    const db = getDb();
    const resetTx = db.transaction(() => {
      try { db.prepare('DELETE FROM chunks_fts').run(); } catch {}
      db.prepare('DELETE FROM chunks').run();
      db.prepare('DELETE FROM documents').run();
      db.prepare('DELETE FROM folders').run();
      db.prepare('DELETE FROM search_history').run();
    });

    resetTx();

    res.json({
      success: true,
      message: 'All indexed documents, chunks, vectors, and search history have been wiped. Your physical files remain completely untouched on your hard drive.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
