import { getDb } from '../database/db.js';
import { generateEmbeddings } from './ollamaService.js';
import { findSimilarChunks } from './vectorStore.js';

/**
 * Perform advanced hybrid document search combining:
 * 1. Semantic vectors (Ollama embeddings)
 * 2. SQLite FTS5 Porter full-text keyword search
 * 3. Exact phrase & currency/numerical token boosting
 * 4. Filename & extension matching
 * 5. Duplicate detection & sensible tie-breaking
 *
 * @param {string} query
 * @param {object} filters - { fileType, folderId, isFavorite, minScore, sortBy }
 * @returns {Promise<Array<object>>}
 */
export async function executeSearch(query, filters = {}) {
  const cleanQuery = (query || '').trim();
  if (!cleanQuery) return [];

  const db = getDb();

  // 1. Check if search history is enabled and log query
  try {
    const historySetting = db.prepare("SELECT value FROM settings WHERE key = 'search_history_enabled'").get();
    if (!historySetting || historySetting.value === 'true') {
      db.prepare('INSERT INTO search_history (query) VALUES (?)').run(cleanQuery);
    }
  } catch (err) {
    console.warn('[SearchEngine] History log error:', err.message);
  }

  // Parse exact phrases in quotes (e.g. "React hooks")
  const exactQuotes = [];
  const quoteRegex = /"([^"]+)"/g;
  let quoteMatch;
  while ((quoteMatch = quoteRegex.exec(cleanQuery)) !== null) {
    if (quoteMatch[1].trim()) {
      exactQuotes.push(quoteMatch[1].trim().toLowerCase());
    }
  }

  // Extract special tokens like currency (₹2,500), codes (INV-2026), numbers
  const specialTokens = cleanQuery.match(/(?:[₹$€£]\s*[\d,]+|[\w]+-[\w-]+|\b\d{2,}\b)/g) || [];

  // General query words (minimum 2 chars)
  const queryWords = cleanQuery
    .toLowerCase()
    .replace(/["']/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1);

  // Map of documentId -> DocumentSearchResult
  const docMap = new Map();

  function getDocResult(row) {
    if (!docMap.has(row.id)) {
      docMap.set(row.id, {
        documentId: row.id,
        filename: row.filename,
        filePath: row.path,
        folderId: row.folder_id,
        folderName: row.folder_name || 'Root',
        extension: row.extension,
        size: row.size,
        mtime: row.mtime,
        hash: row.hash || null,
        isFavorite: Boolean(row.is_favorite),
        lastOpenedAt: row.last_opened_at,
        bestChunk: null,
        bestSnippet: '',
        pageNumber: 1,
        semanticScore: 0,
        keywordScore: 0,
        filenameScore: 0,
        exactPhraseScore: 0,
        combinedScore: 0,
        matchTypes: new Set(),
        matchedKeywords: new Set(),
        matchedPhrases: new Set(),
        isDuplicate: false,
        duplicateOf: null,
        explanation: ''
      });
    }
    return docMap.get(row.id);
  }

  // --- Filter eligible documents ---
  let docSql = `
    SELECT d.*, f.name AS folder_name 
    FROM documents d
    LEFT JOIN folders f ON d.folder_id = f.id
    WHERE d.status = 'indexed'
  `;
  const docParams = [];

  if (filters.fileType && filters.fileType !== 'all') {
    docSql += ' AND d.extension = ?';
    docParams.push(filters.fileType.toLowerCase().startsWith('.') ? filters.fileType.toLowerCase() : `.${filters.fileType.toLowerCase()}`);
  }
  if (filters.folderId && filters.folderId !== 'all') {
    docSql += ' AND d.folder_id = ?';
    docParams.push(parseInt(filters.folderId, 10));
  }
  if (filters.isFavorite) {
    docSql += ' AND d.is_favorite = 1';
  }

  const allEligibleDocs = db.prepare(docSql).all(...docParams);
  const eligibleDocIds = new Set(allEligibleDocs.map(d => d.id));

  // --- SIGNAL 1: Filename Matching ---
  for (const doc of allEligibleDocs) {
    const lowerName = doc.filename.toLowerCase();
    let fnMatches = 0;
    for (const word of queryWords) {
      if (lowerName.includes(word)) {
        fnMatches++;
      }
    }
    if (fnMatches > 0) {
      const res = getDocResult(doc);
      res.filenameScore = Math.min(1.0, (fnMatches / Math.max(1, queryWords.length)) * 0.9 + 0.1);
      res.matchTypes.add('filename');
    }
  }

  // --- SIGNAL 2: Full-Text / Keyword Search & Special Tokens ---
  let keywordResults = [];
  try {
    const sanitizedFtsTerms = queryWords
      .map(w => w.replace(/[^\w]/g, ''))
      .filter(w => w.length > 1);

    if (sanitizedFtsTerms.length > 0) {
      const ftsExpression = sanitizedFtsTerms.join(' OR ');
      const ftsRows = db.prepare(`
        SELECT 
          f.chunk_id, 
          f.document_id,
          f.content,
          c.page_number,
          d.filename,
          d.path,
          d.folder_id,
          d.extension,
          d.size,
          d.mtime,
          d.hash,
          d.is_favorite,
          fold.name AS folder_name
        FROM chunks_fts f
        JOIN chunks c ON f.chunk_id = c.id
        JOIN documents d ON f.document_id = d.id
        LEFT JOIN folders fold ON d.folder_id = fold.id
        WHERE chunks_fts MATCH ? AND d.status = 'indexed'
        LIMIT 60
      `).all(ftsExpression);

      keywordResults = ftsRows;
    }
  } catch (ftsErr) {
    // Graceful fallback
    console.warn('[SearchEngine] FTS5 query fallback:', ftsErr.message);
  }

  // Also search for special tokens (currency symbols, numbers, invoice codes) via LIKE
  for (const token of specialTokens) {
    try {
      const tokenRows = db.prepare(`
        SELECT 
          c.id AS chunk_id,
          c.document_id,
          c.content,
          c.page_number,
          d.filename,
          d.path,
          d.folder_id,
          d.extension,
          d.size,
          d.mtime,
          d.hash,
          d.is_favorite,
          fold.name AS folder_name
        FROM chunks c
        JOIN documents d ON c.document_id = d.id
        LEFT JOIN folders fold ON d.folder_id = fold.id
        WHERE c.content LIKE ? AND d.status = 'indexed'
        LIMIT 20
      `).all(`%${token}%`);

      keywordResults.push(...tokenRows);
    } catch {}
  }

  // Process keyword matches
  for (const row of keywordResults) {
    if (!eligibleDocIds.has(row.document_id)) continue;

    const res = getDocResult({
      id: row.document_id,
      filename: row.filename,
      path: row.path,
      folder_id: row.folder_id,
      folder_name: row.folder_name,
      extension: row.extension,
      size: row.size,
      mtime: row.mtime,
      hash: row.hash,
      is_favorite: row.is_favorite
    });

    res.matchTypes.add('keyword');

    const lowerContent = (row.content || '').toLowerCase();

    // Check exact phrases
    for (const phrase of exactQuotes) {
      if (lowerContent.includes(phrase)) {
        res.matchedPhrases.add(phrase);
        res.exactPhraseScore = Math.max(res.exactPhraseScore, 0.95);
        res.matchTypes.add('exact_phrase');
      }
    }

    // Check individual keywords
    for (const w of queryWords) {
      if (lowerContent.includes(w)) {
        res.matchedKeywords.add(w);
      }
    }

    // Check special tokens
    for (const st of specialTokens) {
      if (row.content && row.content.includes(st)) {
        res.matchedKeywords.add(st);
        res.exactPhraseScore = Math.max(res.exactPhraseScore, 0.9);
      }
    }

    const keywordRatio = queryWords.length > 0 ? res.matchedKeywords.size / queryWords.length : 0.5;
    const kwScore = Math.min(1.0, keywordRatio * 0.75 + 0.25);

    if (kwScore > res.keywordScore) {
      res.keywordScore = kwScore;
      if (!res.bestChunk || res.semanticScore === 0) {
        res.bestChunk = row.content;
        res.bestSnippet = extractRelevantSnippet(row.content, cleanQuery);
        res.pageNumber = row.page_number || 1;
      }
    }
  }

  // --- SIGNAL 3: Semantic Vector Search ---
  try {
    const embeddings = await generateEmbeddings(cleanQuery);
    if (embeddings && embeddings.length > 0) {
      const queryEmbedding = embeddings[0];
      const vectorMatches = findSimilarChunks(queryEmbedding, 30, {
        documentIds: Array.from(eligibleDocIds),
        minScore: 0.25
      });

      for (const vm of vectorMatches) {
        const res = getDocResult({
          id: vm.documentId,
          filename: vm.filename,
          path: vm.filePath,
          folder_id: null,
          folder_name: vm.folderName,
          extension: vm.extension,
          size: vm.fileSize,
          mtime: vm.mtime,
          hash: null,
          is_favorite: vm.isFavorite
        });

        res.matchTypes.add('semantic');

        if (vm.similarityScore > res.semanticScore) {
          res.semanticScore = vm.similarityScore;
          res.bestChunk = vm.content;
          res.bestSnippet = extractRelevantSnippet(vm.content, cleanQuery);
          res.pageNumber = vm.pageNumber || 1;
        }
      }
    }
  } catch (semErr) {
    console.warn('[SearchEngine] Semantic vector search skipped/failed:', semErr.message);
  }

  // --- SIGNAL 4: Hybrid Score Aggregation & Ranking ---
  const results = [];
  const seenHashes = new Map(); // hash -> first document seen

  for (const doc of docMap.values()) {
    if (!doc.bestSnippet) {
      const firstChunk = db.prepare('SELECT content, page_number FROM chunks WHERE document_id = ? LIMIT 1').get(doc.documentId);
      if (firstChunk) {
        doc.bestChunk = firstChunk.content;
        doc.bestSnippet = firstChunk.content.slice(0, 240) + '...';
        doc.pageNumber = firstChunk.page_number || 1;
      } else {
        doc.bestSnippet = 'Indexed document';
      }
    }

    const hasSemantic = doc.semanticScore > 0;
    const hasKeyword = doc.keywordScore > 0;
    const hasFilename = doc.filenameScore > 0;
    const hasExact = doc.exactPhraseScore > 0;

    let finalScore;
    if (hasExact) {
      finalScore = 0.40 * doc.exactPhraseScore + 0.35 * (doc.semanticScore || doc.keywordScore) + 0.15 * doc.keywordScore + 0.10 * doc.filenameScore;
    } else if (hasSemantic && hasKeyword) {
      finalScore = 0.50 * doc.semanticScore + 0.35 * doc.keywordScore + 0.15 * doc.filenameScore;
    } else if (hasSemantic) {
      finalScore = 0.80 * doc.semanticScore + 0.20 * doc.filenameScore;
    } else {
      finalScore = 0.70 * doc.keywordScore + 0.30 * doc.filenameScore;
    }

    doc.combinedScore = Math.min(100, Math.round(finalScore * 100));

    // Duplicate detection: check if exact hash was already seen
    if (doc.hash) {
      if (seenHashes.has(doc.hash)) {
        doc.isDuplicate = true;
        doc.duplicateOf = seenHashes.get(doc.hash);
      } else {
        seenHashes.set(doc.hash, doc.filename);
      }
    }

    doc.matchTypes = Array.from(doc.matchTypes);
    doc.matchedKeywords = Array.from(doc.matchedKeywords);
    doc.matchedPhrases = Array.from(doc.matchedPhrases);

    doc.explanation = generateExplanation(doc, cleanQuery);

    const minScoreThreshold = filters.minScore ? parseInt(filters.minScore, 10) : 20;
    if (doc.combinedScore >= minScoreThreshold) {
      results.push(doc);
    }
  }

  // Sensible Multi-tier Tie-breaking:
  // Primary: Combined score descending
  // Secondary: Favorites first
  // Tertiary: Newer documents first
  // Quaternary: Non-duplicates before duplicates
  const sortBy = filters.sortBy || 'relevance';
  if (sortBy === 'date') {
    results.sort((a, b) => b.mtime - a.mtime);
  } else if (sortBy === 'name') {
    results.sort((a, b) => a.filename.localeCompare(b.filename));
  } else if (sortBy === 'size') {
    results.sort((a, b) => b.size - a.size);
  } else {
    results.sort((a, b) => {
      if (b.combinedScore !== a.combinedScore) return b.combinedScore - a.combinedScore;
      if (a.isDuplicate !== b.isDuplicate) return a.isDuplicate ? 1 : -1;
      if (b.isFavorite !== a.isFavorite) return (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0);
      return b.mtime - a.mtime;
    });
  }

  return results;
}

/**
 * Extract a relevant excerpt around query keywords or beginning of chunk
 */
function extractRelevantSnippet(text, query) {
  if (!text) return '';
  const clean = text.replace(/\s+/g, ' ').trim();
  const lower = clean.toLowerCase();
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  let bestIndex = -1;
  for (const word of words) {
    const idx = lower.indexOf(word);
    if (idx !== -1) {
      bestIndex = idx;
      break;
    }
  }

  const snippetLength = 260;
  if (bestIndex === -1 || clean.length <= snippetLength) {
    return clean.slice(0, snippetLength) + (clean.length > snippetLength ? '...' : '');
  }

  const start = Math.max(0, bestIndex - 70);
  const end = Math.min(clean.length, start + snippetLength);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < clean.length ? '...' : '';

  return prefix + clean.slice(start, end).trim() + suffix;
}

/**
 * Generate transparent, crisp "Why this result?" explanation
 */
function generateExplanation(doc, query) {
  const parts = [];

  if (doc.matchedPhrases && doc.matchedPhrases.length > 0) {
    parts.push(`Exact phrase match for "${doc.matchedPhrases[0]}"`);
  }

  if (doc.matchTypes.includes('filename')) {
    parts.push(`Filename matches query terms`);
  }

  if (doc.semanticScore > 0.6) {
    parts.push(`Strong conceptual similarity (${Math.round(doc.semanticScore * 100)}%)`);
  } else if (doc.semanticScore > 0.35) {
    parts.push(`Semantic contextual match (${Math.round(doc.semanticScore * 100)}%)`);
  }

  if (doc.matchedKeywords.length > 0) {
    const kwSample = doc.matchedKeywords.slice(0, 3).map(k => `"${k}"`).join(', ');
    parts.push(`Contains keywords: ${kwSample}`);
  }

  if (doc.isDuplicate) {
    parts.push(`Identical content duplicate of "${doc.duplicateOf}"`);
  }

  if (parts.length === 0) {
    return `Document content aligns with query intent (${doc.combinedScore}% match)`;
  }

  return parts.join(' · ');
}
