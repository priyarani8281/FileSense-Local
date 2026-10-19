import express from 'express';
import { executeSearch } from '../services/searchEngine.js';
import { getDb } from '../database/db.js';

export const searchRouter = express.Router();

// Execute search
searchRouter.get('/', async (req, res) => {
  try {
    const query = req.query.q || '';
    const filters = {
      fileType: req.query.fileType,
      folderId: req.query.folderId,
      isFavorite: req.query.isFavorite === 'true',
      minScore: req.query.minScore,
      sortBy: req.query.sortBy
    };

    if (!query.trim()) {
      return res.json({ results: [], query: '', count: 0 });
    }

    const results = await executeSearch(query, filters);
    res.json({
      query,
      results,
      count: results.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search suggestions & recent searches
searchRouter.get('/suggestions', (req, res) => {
  try {
    const db = getDb();

    // Default suggestions inspired by real user queries
    const defaultPrompts = [
      'Find my notes about React hooks',
      'Show me the resume I used for internship applications',
      'Find the document about landslide prediction and rainfall data',
      'Find the invoice mentioning ₹2,500 from March',
      'Show me PDFs containing my operating systems revision notes'
    ];

    let recentSearches = [];
    try {
      const historyRows = db.prepare(`
        SELECT DISTINCT query, created_at 
        FROM search_history 
        ORDER BY id DESC 
        LIMIT 6
      `).all();
      recentSearches = historyRows.map(r => r.query);
    } catch {}

    // Extract actual document keywords if documents exist
    let documentKeywords = [];
    try {
      const topDocs = db.prepare(`
        SELECT filename FROM documents WHERE status = 'indexed' ORDER BY indexed_at DESC LIMIT 5
      `).all();
      documentKeywords = topDocs.map(d => d.filename);
    } catch {}

    res.json({
      curatedSuggestions: defaultPrompts,
      recentSearches,
      recentDocuments: documentKeywords
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search history
searchRouter.get('/history', (req, res) => {
  try {
    const db = getDb();
    const history = db.prepare(`
      SELECT id, query, created_at 
      FROM search_history 
      ORDER BY id DESC 
      LIMIT 25
    `).all();
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear search history
searchRouter.delete('/history', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM search_history').run();
    res.json({ success: true, message: 'Search history cleared.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
