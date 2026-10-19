import { app } from './app.js';
import { config } from './config.js';
import { initDatabase, closeDatabase } from './database/db.js';

// Initialize SQLite database
initDatabase();

const server = app.listen(config.port, config.host, () => {
  console.log('====================================================');
  console.log(` FileSense Local Backend is running!`);
  console.log(` Local URL: http://${config.host}:${config.port}`);
  console.log(` Ollama Host: ${config.ollamaHost}`);
  console.log(` Database: ${config.dbPath}`);
  console.log(` Privacy: Bound strictly to localhost (${config.host})`);
  console.log('====================================================');
});

function gracefulShutdown(signal) {
  console.log(`\n[Server] Received ${signal}. Gracefully stopping...`);
  server.close(() => {
    closeDatabase();
    console.log('[Server] Database closed and server terminated.');
    process.exit(0);
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
