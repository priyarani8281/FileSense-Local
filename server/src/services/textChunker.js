import { config } from '../config.js';

/**
 * Split text from parsed document into contextual chunks with page references
 * @param {Array<{text: string, pageNumber: number}>} pages
 * @param {number} [targetChunkSize]
 * @param {number} [targetOverlap]
 * @returns {Array<{chunkIndex: number, content: string, pageNumber: number, tokenCount: number}>}
 */
export function chunkDocumentPages(pages, targetChunkSize, targetOverlap) {
  const chunkSize = targetChunkSize || config.chunkSize;
  const chunkOverlap = targetOverlap || config.chunkOverlap;

  const chunks = [];
  let globalIndex = 0;

  for (const page of pages) {
    const pageText = page.text ? page.text.trim() : '';
    if (!pageText) continue;

    const pageChunks = splitTextRecursively(pageText, chunkSize, chunkOverlap);

    for (const chunkText of pageChunks) {
      if (chunkText.trim().length < 15) continue; // Skip tiny empty fragments

      chunks.push({
        chunkIndex: globalIndex++,
        content: chunkText.trim(),
        pageNumber: page.pageNumber || 1,
        tokenCount: Math.ceil(chunkText.length / 4)
      });
    }
  }

  return chunks;
}

/**
 * Recursive character splitter adhering to natural semantic boundaries
 */
function splitTextRecursively(text, chunkSize, chunkOverlap) {
  if (text.length <= chunkSize) {
    return [text];
  }

  // Separators in order of preference
  const separators = ['\n\n', '\n', '. ', '? ', '! ', '; ', ', ', ' '];
  let chosenSeparator = null;

  for (const sep of separators) {
    if (text.includes(sep)) {
      chosenSeparator = sep;
      break;
    }
  }

  if (!chosenSeparator) {
    // If no separator found, hard split
    const parts = [];
    let start = 0;
    while (start < text.length) {
      parts.push(text.slice(start, start + chunkSize));
      start += chunkSize - chunkOverlap;
    }
    return parts;
  }

  const splits = text.split(chosenSeparator);
  const resultChunks = [];
  let currentAccumulator = [];
  let currentLen = 0;

  for (const split of splits) {
    const item = split.trim();
    if (!item) continue;

    const itemLen = item.length + chosenSeparator.length;

    if (currentLen + itemLen > chunkSize && currentAccumulator.length > 0) {
      const fullChunk = currentAccumulator.join(chosenSeparator);
      resultChunks.push(fullChunk);

      // Overlap: retain last item(s) up to chunkOverlap characters
      let overlapAccumulator = [];
      let overlapLen = 0;
      for (let i = currentAccumulator.length - 1; i >= 0; i--) {
        const candidate = currentAccumulator[i];
        if (overlapLen + candidate.length <= chunkOverlap) {
          overlapAccumulator.unshift(candidate);
          overlapLen += candidate.length;
        } else {
          break;
        }
      }

      currentAccumulator = overlapAccumulator;
      currentLen = overlapLen;
    }

    currentAccumulator.push(item);
    currentLen += itemLen;
  }

  if (currentAccumulator.length > 0) {
    resultChunks.push(currentAccumulator.join(chosenSeparator));
  }

  return resultChunks;
}
