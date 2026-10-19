import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';
import { getDb, initDatabase } from '../src/database/db.js';
import { validateDirectory } from '../src/utils/fileSystem.js';
import { parseDocument } from '../src/services/documentParser.js';
import { chunkDocumentPages } from '../src/services/textChunker.js';
import { cosineSimilarity, embeddingToBuffer, bufferToFloat32Array } from '../src/services/vectorStore.js';
import { checkHealth, generateEmbeddings } from '../src/services/ollamaService.js';
import { indexingManager } from '../src/services/indexingQueue.js';
import { executeSearch } from '../src/services/searchEngine.js';
import { askDocuments } from '../src/services/askService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    process.stdout.write(`  • ${name}... `);
    await fn();
    console.log(`\x1b[32mPASSED\x1b[0m`);
    passed++;
  } catch (err) {
    console.log(`\x1b[31mFAILED\x1b[0m`);
    console.error(`    Error: ${err.message}`);
    failed++;
  }
}

async function runSuite() {
  console.log('\n======================================================');
  console.log(' FileSense Local — Test Suite');
  console.log('======================================================\n');

  // Test 1: SQLite initialization
  await test('Database schema & WAL mode initialization', () => {
    const db = initDatabase();
    assert(db !== null, 'Database instance should exist');
    const journalMode = db.pragma('journal_mode', { simple: true });
    assert.strictEqual(journalMode, 'wal', 'Journal mode should be WAL');

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
    assert(tables.includes('folders'), 'folders table must exist');
    assert(tables.includes('documents'), 'documents table must exist');
    assert(tables.includes('chunks'), 'chunks table must exist');
    assert(tables.includes('search_history'), 'search_history table must exist');
    assert(tables.includes('settings'), 'settings table must exist');
  });

  // Test 2: Safe directory validation
  await test('Filesystem security & directory validation', () => {
    // Root drive must be rejected
    const rootCheck = validateDirectory('C:\\');
    assert.strictEqual(rootCheck.isValid, false, 'Root drive C:\\ must be blocked');

    // Nonexistent directory must be rejected
    const fakeCheck = validateDirectory('C:\\NonExistent_Folder_12345');
    assert.strictEqual(fakeCheck.isValid, false, 'Nonexistent folder must be rejected');

    // Valid sample directory
    const sampleDir = path.resolve(__dirname, '../../data/sample_documents');
    const validCheck = validateDirectory(sampleDir);
    assert.strictEqual(validCheck.isValid, true, 'Sample directory must be valid');
  });

  // Test 3: Document parser
  await test('Document parsing (PDF & Markdown)', async () => {
    const pdfPath = path.resolve(__dirname, '../../data/sample_documents/operating_systems_revision_notes.pdf');
    const parsedPdf = await parseDocument(pdfPath);
    assert(parsedPdf.text.length > 50, 'PDF text should be extracted');
    assert(parsedPdf.text.includes('OPERATING SYSTEMS'), 'PDF text should include title');
    assert(parsedPdf.pageCount >= 1, 'PDF should have at least 1 page');

    const mdPath = path.resolve(__dirname, '../../data/sample_documents/react_hooks_advanced_guide.md');
    const parsedMd = await parseDocument(mdPath);
    assert(parsedMd.text.includes('useState'), 'Markdown text should include useState');
  });

  // Test 4: Text chunker
  await test('Text chunking with page attribution', () => {
    const samplePages = [
      { text: 'First page content with important architectural concepts. '.repeat(20), pageNumber: 1 },
      { text: 'Second page content with performance optimization techniques. '.repeat(20), pageNumber: 2 }
    ];
    const chunks = chunkDocumentPages(samplePages, 300, 50);
    assert(chunks.length >= 2, 'Should produce multiple chunks');
    assert.strictEqual(chunks[0].chunkIndex, 0, 'First chunk index should be 0');
    assert(chunks.some(c => c.pageNumber === 1), 'Should have page 1 attribution');
    assert(chunks.some(c => c.pageNumber === 2), 'Should have page 2 attribution');
  });

  // Test 5: Vector serialization & Cosine similarity
  await test('Vector serialization & Float32Array cosine similarity', () => {
    const vecA = [1.0, 0.0, 0.0];
    const vecB = [1.0, 0.0, 0.0];
    const vecC = [0.0, 1.0, 0.0];

    const bufA = embeddingToBuffer(vecA);
    const floatArrA = bufferToFloat32Array(bufA);

    const simIdentical = cosineSimilarity(floatArrA, new Float32Array(vecB));
    assert(Math.abs(simIdentical - 1.0) < 0.0001, 'Identical vectors should have cosine similarity 1.0');

    const simOrthogonal = cosineSimilarity(floatArrA, new Float32Array(vecC));
    assert(Math.abs(simOrthogonal - 0.0) < 0.0001, 'Orthogonal vectors should have cosine similarity 0.0');
  });

  // Test 6: Ollama connection & embedding generation
  await test('Ollama API connectivity & live embeddings', async () => {
    const health = await checkHealth();
    assert(health.connected, 'Ollama service should be connected on localhost:11434');

    const embeddings = await generateEmbeddings('Testing semantic retrieval vector');
    assert(Array.isArray(embeddings), 'Should return array of embeddings');
    assert(embeddings[0].length > 100, `Embedding vector dimension should be >= 100 (got ${embeddings[0].length})`);
  });

  // Test 7: Indexing sample directory
  await test('Folder indexing pipeline & SQLite persistence', async () => {
    const db = getDb();
    const sampleDir = path.resolve(__dirname, '../../data/sample_documents');

    let folder = db.prepare('SELECT id FROM folders WHERE path = ?').get(sampleDir);
    if (!folder) {
      const info = db.prepare('INSERT INTO folders (path, name) VALUES (?, ?)').run(sampleDir, 'Test Sample Folder');
      folder = { id: info.lastInsertRowid };
    }

    await indexingManager.indexFolder(folder.id, true);
    const status = indexingManager.getStatus();
    assert.strictEqual(status.status, 'completed', 'Indexing should complete successfully');
    assert(status.processedFiles >= 5, 'Should process all 5 sample files');

    const count = db.prepare('SELECT COUNT(*) as c FROM documents WHERE folder_id = ?').get(folder.id).c;
    assert(count >= 5, 'At least 5 documents should be stored in database');
  });

  // Test 8: Hybrid search queries
  await test('Hybrid Search — "Find my notes about React hooks"', async () => {
    const results = await executeSearch('Find my notes about React hooks');
    assert(results.length > 0, 'Should find results');
    assert.strictEqual(results[0].filename, 'react_hooks_advanced_guide.md', 'Top match must be React hooks guide');
    assert(results[0].combinedScore > 40, 'Relevance score should be significant');
  });

  await test('Hybrid Search — "Show me the resume I used for internship applications"', async () => {
    const results = await executeSearch('Show me the resume I used for internship applications');
    assert(results.length > 0, 'Should find results');
    assert.strictEqual(results[0].filename, 'resume_software_engineering_internship.txt', 'Top match must be internship resume');
  });

  await test('Hybrid Search — "Find the document about landslide prediction and rainfall data"', async () => {
    const results = await executeSearch('Find the document about landslide prediction and rainfall data');
    assert(results.length > 0, 'Should find results');
    assert.strictEqual(results[0].filename, 'landslide_prediction_rainfall_analysis.md', 'Top match must be landslide report');
  });

  await test('Hybrid Search — "Find the invoice mentioning ₹2,500 from March"', async () => {
    const results = await executeSearch('Find the invoice mentioning ₹2,500 from March');
    assert(results.length > 0, 'Should find results');
    assert.strictEqual(results[0].filename, 'invoice_freelance_march_2026.txt', 'Top match must be March invoice');
  });

  await test('Hybrid Search — "Show me PDFs containing my operating systems revision notes"', async () => {
    const results = await executeSearch('Show me PDFs containing my operating systems revision notes');
    assert(results.length > 0, 'Should find results');
    assert.strictEqual(results[0].filename, 'operating_systems_revision_notes.pdf', 'Top match must be operating systems PDF');
  });

  // Test 9: Grounded Q&A with citations
  await test('Grounded Q&A — "What are the 4 conditions for deadlock?"', async () => {
    const res = await askDocuments('What are the 4 conditions for deadlock in operating systems?');
    assert(res.answer.length > 10, 'Answer must not be empty');
    assert(res.citations.length > 0, 'Should return citations');
    assert(res.citations.some(c => c.filename.includes('operating_systems')), 'Citation must reference operating systems doc');
  });

  console.log('\n======================================================');
  console.log(` Summary: \x1b[32m${passed} passed\x1b[0m, \x1b[31m${failed} failed\x1b[0m`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Test suite runner error:', err);
  process.exit(1);
});
