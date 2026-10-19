import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5050', 10),
  host: process.env.HOST || '127.0.0.1',
  ollamaHost: (process.env.OLLAMA_HOST || 'http://127.0.0.1:11434').replace(/\/+$/, ''),
  defaultChatModel: process.env.DEFAULT_CHAT_MODEL || 'qwen2.5:3b',
  defaultEmbedModel: process.env.DEFAULT_EMBED_MODEL || 'nomic-embed-text',
  dbPath: process.env.DB_PATH || path.resolve(__dirname, '../../data/filesense.db'),
  chunkSize: parseInt(process.env.CHUNK_SIZE || '600', 10),
  chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '100', 10),
  supportedExtensions: ['.pdf', '.txt', '.md', '.markdown', '.docx'],
  maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10),
  // System directories to block for privacy and safety
  blockedDirectories: [
    'windows',
    'system32',
    'program files',
    'program files (x86)',
    'appdata',
    '.git',
    'node_modules',
    '$recycle.bin'
  ]
};
