const API_BASE = 'http://127.0.0.1:5050/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  try {
    const res = await fetch(url, config);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || `Request failed with HTTP status ${res.status}`);
    }

    return data;
  } catch (err) {
    console.error(`[API Error] ${endpoint}:`, err.message);
    throw err;
  }
}

export const api = {
  // Health
  getHealth: () => request('/health'),

  // Search
  search: (params = {}) => {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.fileType && params.fileType !== 'all') query.set('fileType', params.fileType);
    if (params.folderId && params.folderId !== 'all') query.set('folderId', params.folderId);
    if (params.isFavorite) query.set('isFavorite', 'true');
    if (params.minScore) query.set('minScore', params.minScore);
    if (params.sortBy) query.set('sortBy', params.sortBy);

    return request(`/search?${query.toString()}`);
  },
  getSuggestions: () => request('/search/suggestions'),
  getSearchHistory: () => request('/search/history'),
  clearSearchHistory: () => request('/search/history', { method: 'DELETE' }),

  // Folders
  getFolders: () => request('/folders'),
  addFolder: (folderPath, name) => request('/folders', {
    method: 'POST',
    body: JSON.stringify({ folderPath, name })
  }),
  deleteFolder: (id) => request(`/folders/${id}`, { method: 'DELETE' }),
  indexFolder: (id, forceReindex = false) => request(`/folders/${id}/index`, {
    method: 'POST',
    body: JSON.stringify({ forceReindex })
  }),
  getIndexingStatus: () => request('/folders/indexing-status'),
  cancelIndexing: () => request('/folders/indexing-cancel', { method: 'POST' }),
  browseSubdirs: (dirPath) => {
    const q = dirPath ? `?path=${encodeURIComponent(dirPath)}` : '';
    return request(`/folders/browse-subdirs${q}`);
  },
  openNativeFolderDialog: () => request('/folders/native-dialog', { method: 'POST' }),

  // Documents
  getDocuments: (params = {}) => {
    const query = new URLSearchParams();
    if (params.folderId && params.folderId !== 'all') query.set('folderId', params.folderId);
    if (params.fileType && params.fileType !== 'all') query.set('fileType', params.fileType);
    if (params.isFavorite) query.set('isFavorite', 'true');
    if (params.search) query.set('search', params.search);
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);

    return request(`/documents?${query.toString()}`);
  },
  getDocumentDetails: (id) => request(`/documents/${id}`),
  toggleFavorite: (id) => request(`/documents/${id}/favorite`, { method: 'POST' }),
  openDocument: (id) => request(`/documents/${id}/open`, { method: 'POST' }),
  deleteDocument: (id) => request(`/documents/${id}`, { method: 'DELETE' }),
  reindexDocument: (id) => request(`/documents/${id}/reindex`, { method: 'POST' }),

  // Ask AI
  askDocuments: (question, documentIds = []) => request('/ask', {
    method: 'POST',
    body: JSON.stringify({ question, documentIds })
  }),

  // Settings
  getSettings: () => request('/settings'),
  updateSettings: (settings) => request('/settings', {
    method: 'PUT',
    body: JSON.stringify(settings)
  }),
  testOllama: () => request('/settings/test-ollama', { method: 'POST' }),
  getPrivacyAudit: () => request('/settings/privacy-audit'),
  resetIndex: (confirmation) => request('/settings/reset-index', {
    method: 'POST',
    body: JSON.stringify({ confirmation })
  })
};
