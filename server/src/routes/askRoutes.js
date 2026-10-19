import express from 'express';
import { askDocuments } from '../services/askService.js';

export const askRouter = express.Router();

askRouter.post('/', async (req, res) => {
  try {
    const { question, documentIds } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Please enter a question to ask your documents.' });
    }

    const answerResponse = await askDocuments(question, { documentIds });
    res.json(answerResponse);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
