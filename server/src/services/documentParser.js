import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { config } from '../config.js';

/**
 * Parsed document representation
 * @typedef {Object} ParsedDocument
 * @property {string} text - Full extracted text
 * @property {Array<{text: string, pageNumber: number}>} pages - Page-separated text
 * @property {number} pageCount - Number of pages
 */

/**
 * Parse document content from disk
 * @param {string} filePath - Absolute path to document
 * @returns {Promise<ParsedDocument>}
 */
export async function parseDocument(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }

  const stat = fs.statSync(filePath);
  const maxBytes = config.maxFileSizeMB * 1024 * 1024;
  if (stat.size > maxBytes) {
    throw new Error(`File exceeds maximum size limit of ${config.maxFileSizeMB}MB`);
  }

  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.pdf':
      return parsePdf(filePath);
    case '.docx':
      return parseDocx(filePath);
    case '.txt':
    case '.md':
    case '.markdown':
    case '.json':
    case '.csv':
      return parsePlainText(filePath);
    default:
      throw new Error(`Unsupported file extension: ${ext}`);
  }
}

async function parsePdf(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const uint8 = new Uint8Array(buffer);
    const parser = new PDFParse(uint8);
    await parser.load();
    const result = await parser.getText();

    const pages = (result.pages || []).map((p, idx) => ({
      text: p.text || '',
      pageNumber: p.num || idx + 1
    }));

    const text = result.text || pages.map(p => p.text).join('\n\n');

    return {
      text: cleanText(text),
      pages: pages.length > 0 ? pages : [{ text: cleanText(text), pageNumber: 1 }],
      pageCount: result.total || pages.length || 1
    };
  } catch (err) {
    if (err.name === 'PasswordException' || err.message?.includes('password')) {
      throw new Error('PDF is password protected and cannot be indexed.');
    }
    throw new Error(`Failed to parse PDF: ${err.message}`);
  }
}

async function parseDocx(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    const text = cleanText(result.value || '');

    // Estimate page breaks every ~3000 characters if multiple paragraphs
    const paragraphs = text.split(/\n{2,}/);
    const pages = [];
    let currentPageText = [];
    let currentLen = 0;
    let pageNum = 1;

    for (const p of paragraphs) {
      currentPageText.push(p);
      currentLen += p.length;
      if (currentLen > 2500) {
        pages.push({ text: currentPageText.join('\n\n'), pageNumber: pageNum++ });
        currentPageText = [];
        currentLen = 0;
      }
    }
    if (currentPageText.length > 0) {
      pages.push({ text: currentPageText.join('\n\n'), pageNumber: pageNum });
    }

    return {
      text,
      pages: pages.length > 0 ? pages : [{ text, pageNumber: 1 }],
      pageCount: Math.max(1, pages.length)
    };
  } catch (err) {
    throw new Error(`Failed to parse DOCX: ${err.message}`);
  }
}

function parsePlainText(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const text = cleanText(raw);

    // Section by markdown headers or logical length
    const lines = text.split('\n');
    const pages = [];
    let chunk = [];
    let currentLen = 0;
    let pageNum = 1;

    for (const line of lines) {
      chunk.push(line);
      currentLen += line.length;
      if (currentLen > 2500) {
        pages.push({ text: chunk.join('\n'), pageNumber: pageNum++ });
        chunk = [];
        currentLen = 0;
      }
    }
    if (chunk.length > 0) {
      pages.push({ text: chunk.join('\n'), pageNumber: pageNum });
    }

    return {
      text,
      pages: pages.length > 0 ? pages : [{ text, pageNumber: 1 }],
      pageCount: Math.max(1, pages.length)
    };
  } catch (err) {
    throw new Error(`Failed to read text file: ${err.message}`);
  }
}

/**
 * Normalize and clean extracted text
 */
function cleanText(str) {
  if (!str) return '';
  return str
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // remove ASCII control characters
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
