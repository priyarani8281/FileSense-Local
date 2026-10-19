import { config } from '../config.js';
import { getDb } from '../database/db.js';

function getSetting(key, fallback) {
  try {
    const db = getDb();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : fallback;
  } catch {
    return fallback;
  }
}

export function getOllamaBaseUrl() {
  return getSetting('ollama_url', config.ollamaHost).replace(/\/+$/, '');
}

export function getChatModel() {
  return getSetting('chat_model', config.defaultChatModel);
}

export function getEmbedModel() {
  return getSetting('embed_model', config.defaultEmbedModel);
}

/**
 * Check connection to Ollama and verify model readiness
 */
export async function checkHealth() {
  const baseUrl = getOllamaBaseUrl();
  const chatModel = getChatModel();
  const embedModel = getEmbedModel();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return {
        connected: false,
        baseUrl,
        error: `Ollama returned HTTP ${res.status}: ${res.statusText}`,
        models: [],
        chatModel,
        embedModel,
        chatModelReady: false,
        embedModelReady: false
      };
    }

    const data = await res.json();
    const models = (data.models || []).map(m => m.name || m.model);

    // Check if models exist (exact or without tag)
    const chatModelReady = models.some(m => m === chatModel || m.startsWith(`${chatModel}:`));
    const embedModelReady = models.some(m => m === embedModel || m.startsWith(`${embedModel}:`));

    return {
      connected: true,
      baseUrl,
      models,
      chatModel,
      embedModel,
      chatModelReady,
      embedModelReady,
      error: null
    };
  } catch (err) {
    return {
      connected: false,
      baseUrl,
      error: err.name === 'AbortError' ? 'Connection timed out after 4 seconds' : err.message,
      models: [],
      chatModel,
      embedModel,
      chatModelReady: false,
      embedModelReady: false
    };
  }
}

/**
 * Generate vector embeddings for one or more text chunks
 * @param {string | string[]} input - text or array of texts
 * @param {string} [modelName] - optional model override
 * @returns {Promise<number[][]>} array of float arrays
 */
export async function generateEmbeddings(input, modelName) {
  const baseUrl = getOllamaBaseUrl();
  const model = modelName || getEmbedModel();
  const inputs = Array.isArray(input) ? input : [input];

  if (inputs.length === 0) return [];

  // Truncate overly long single chunk inputs to avoid context overflow
  const sanitizedInputs = inputs.map(t => (t ? t.slice(0, 3000) : ' '));

  try {
    // Try official /api/embed endpoint first
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const res = await fetch(`${baseUrl}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        input: sanitizedInputs
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.embeddings)) {
        return data.embeddings;
      }
    }

    // Fallback: older /api/embeddings endpoint (one at a time)
    const fallbackResults = [];
    for (const text of sanitizedInputs) {
      const fallbackRes = await fetch(`${baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: text })
      });
      if (!fallbackRes.ok) {
        throw new Error(`Embedding request failed: ${fallbackRes.statusText}`);
      }
      const fData = await fallbackRes.json();
      fallbackResults.push(fData.embedding);
    }
    return fallbackResults;
  } catch (err) {
    console.error(`[Ollama] Failed to generate embeddings with model '${model}':`, err.message);
    throw err;
  }
}

/**
 * Generate a chat completion using Ollama
 * @param {object} options
 * @param {Array<{role: string, content: string}>} options.messages
 * @param {string} [options.model]
 * @param {number} [options.temperature]
 * @param {string} [options.systemPrompt]
 * @returns {Promise<string>}
 */
export async function chatCompletion({ messages, model, temperature = 0.2, systemPrompt }) {
  const baseUrl = getOllamaBaseUrl();
  const activeModel = model || getChatModel();

  const fullMessages = [];
  if (systemPrompt) {
    fullMessages.push({ role: 'system', content: systemPrompt });
  }
  fullMessages.push(...messages);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: activeModel,
        messages: fullMessages,
        stream: false,
        options: {
          temperature
        }
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const errorText = await res.text().catch(() => res.statusText);
      throw new Error(`Ollama chat failed (${res.status}): ${errorText}`);
    }

    const data = await res.json();
    return data.message?.content || '';
  } catch (err) {
    console.error(`[Ollama] Chat completion error with '${activeModel}':`, err.message);
    throw err;
  }
}
