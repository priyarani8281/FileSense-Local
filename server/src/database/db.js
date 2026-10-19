import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

let db = null;

export function initDatabase() {
  if (db) return db;

  const dbDir = path.dirname(config.dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(config.dbPath);

  // Performance optimizations
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#29483B',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_scanned_at TEXT,
      file_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folder_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
      path TEXT UNIQUE NOT NULL,
      filename TEXT NOT NULL,
      extension TEXT NOT NULL,
      size INTEGER NOT NULL,
      mtime INTEGER NOT NULL,
      hash TEXT,
      is_favorite INTEGER DEFAULT 0,
      last_opened_at TEXT,
      indexed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'indexed',
      error_message TEXT,
      chunk_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      token_count INTEGER DEFAULT 0,
      page_number INTEGER DEFAULT 1,
      embedding BLOB
    );

    CREATE TABLE IF NOT EXISTS search_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      result_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_docs_folder ON documents(folder_id);
    CREATE INDEX IF NOT EXISTS idx_docs_ext ON documents(extension);
    CREATE INDEX IF NOT EXISTS idx_docs_favorite ON documents(is_favorite);
    CREATE INDEX IF NOT EXISTS idx_docs_status ON documents(status);
    CREATE INDEX IF NOT EXISTS idx_docs_hash ON documents(hash);
    CREATE INDEX IF NOT EXISTS idx_chunks_doc ON chunks(document_id);
    CREATE INDEX IF NOT EXISTS idx_history_date ON search_history(created_at);
  `);

  // FTS5 Full Text Search index for lightning-fast keyword matching
  try {
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
        content,
        chunk_id UNINDEXED,
        document_id UNINDEXED,
        tokenize='porter unicode61'
      );
    `);
  } catch (err) {
    console.warn('[DB] FTS5 setup note:', err.message);
  }

  // Seed default settings if not exists
  const defaultSettings = [
    ['chat_model', config.defaultChatModel],
    ['embed_model', config.defaultEmbedModel],
    ['ollama_url', config.ollamaHost],
    ['theme', 'light'],
    ['search_history_enabled', 'true'],
    ['chunk_size', String(config.chunkSize)],
    ['chunk_overlap', String(config.chunkOverlap)],
    ['top_k', '5']
  ];

  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
  `);

  for (const [key, value] of defaultSettings) {
    insertSetting.run(key, value);
  }

  console.log('[DB] SQLite database initialized successfully at:', config.dbPath);
  return db;
}

export function getDb() {
  if (!db) {
    return initDatabase();
  }
  return db;
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}
