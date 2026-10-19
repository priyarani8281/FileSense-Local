import { getDb } from '../database/db.js';

/**
 * Convert number array to Buffer BLOB
 * @param {number[]} embedding
 * @returns {Buffer}
 */
export function embeddingToBuffer(embedding) {
  const float32 = new Float32Array(embedding);
  return Buffer.from(float32.buffer, float32.byteOffset, float32.byteLength);
}

/**
 * Convert Buffer BLOB back to Float32Array
 * @param {Buffer} buffer
 * @returns {Float32Array}
 */
export function bufferToFloat32Array(buffer) {
  return new Float32Array(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength / Float32Array.BYTES_PER_ELEMENT
  );
}

/**
 * Fast cosine similarity between two Float32Arrays
 * @param {Float32Array} a
 * @param {Float32Array} b
 * @returns {number} similarity between -1 and 1
 */
export function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const valA = a[i];
    const valB = b[i];
    dotProduct += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

/**
 * Search all stored chunks for semantic similarity against a query embedding
 * @param {number[]} queryEmbedding
 * @param {number} topK
 * @param {object} [options]
 * @param {number[]} [options.documentIds] - restrict to specific document IDs
 * @param {number} [options.minScore] - minimum similarity threshold (0-1)
 * @returns {Array<object>}
 */
export function findSimilarChunks(queryEmbedding, topK = 10, options = {}) {
  const db = getDb();
  const queryVec = new Float32Array(queryEmbedding);
  const minScore = options.minScore !== undefined ? options.minScore : 0.25;

  let sql = `
    SELECT 
      c.id AS chunk_id,
      c.document_id,
      c.chunk_index,
      c.content,
      c.page_number,
      c.embedding,
      d.filename,
      d.path AS file_path,
      d.extension,
      d.size AS file_size,
      d.mtime,
      d.is_favorite,
      f.name AS folder_name
    FROM chunks c
    JOIN documents d ON c.document_id = d.id
    LEFT JOIN folders f ON d.folder_id = f.id
    WHERE c.embedding IS NOT NULL
  `;

  const params = [];
  if (options.documentIds && options.documentIds.length > 0) {
    const placeholders = options.documentIds.map(() => '?').join(',');
    sql += ` AND c.document_id IN (${placeholders})`;
    params.push(...options.documentIds);
  }

  const stmt = db.prepare(sql);
  const rows = stmt.all(...params);

  const scoredResults = [];

  for (const row of rows) {
    if (!row.embedding) continue;
    const chunkVec = bufferToFloat32Array(row.embedding);
    const score = cosineSimilarity(queryVec, chunkVec);

    if (score >= minScore) {
      scoredResults.push({
        chunkId: row.chunk_id,
        documentId: row.document_id,
        chunkIndex: row.chunk_index,
        content: row.content,
        pageNumber: row.page_number,
        filename: row.filename,
        filePath: row.file_path,
        extension: row.extension,
        fileSize: row.file_size,
        mtime: row.mtime,
        isFavorite: Boolean(row.is_favorite),
        folderName: row.folder_name,
        similarityScore: Math.round(score * 1000) / 1000
      });
    }
  }

  // Sort descending by similarity score
  scoredResults.sort((a, b) => b.similarityScore - a.similarityScore);

  return scoredResults.slice(0, topK);
}
