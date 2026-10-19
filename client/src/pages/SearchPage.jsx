import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  SlidersHorizontal,
  Sparkles,
  FolderOpen,
  Star,
  RefreshCw,
  Frown,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import { api } from '../services/api.js';
import { ResultCard } from '../components/ResultCard.jsx';
import { WhyResultModal } from '../components/WhyResultModal.jsx';

export function SearchPage({
  initialQuery = '',
  onOpenDocument,
  onViewDetails,
  onAskAboutDoc,
  showToast
}) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [folders, setFolders] = useState([]);

  // Filters
  const [fileType, setFileType] = useState('all');
  const [folderId, setFolderId] = useState('all');
  const [isFavorite, setIsFavorite] = useState(false);
  const [minScore, setMinScore] = useState(20);
  const [sortBy, setSortBy] = useState('relevance');

  // Modal
  const [selectedWhyResult, setSelectedWhyResult] = useState(null);

  const debounceTimeout = useRef(null);

  useEffect(() => {
    // Load folder filter options
    api.getFolders().then(r => setFolders(r.folders || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      executeSearch(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    // Auto re-search on filter change if query exists
    if (query.trim()) {
      executeSearch(query);
    }
  }, [fileType, folderId, isFavorite, minScore, sortBy]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    if (val.trim().length >= 2) {
      debounceTimeout.current = setTimeout(() => {
        executeSearch(val);
      }, 350);
    } else if (!val.trim()) {
      setResults([]);
      setHasSearched(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    if (query.trim()) {
      executeSearch(query);
    }
  };

  const executeSearch = async (q) => {
    const term = q.trim();
    if (!term) return;

    setIsLoading(true);
    setHasSearched(true);
    try {
      const res = await api.search({
        q: term,
        fileType,
        folderId,
        isFavorite,
        minScore,
        sortBy
      });
      setResults(res.results || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFavorite = async (docId) => {
    try {
      const res = await api.toggleFavorite(docId);
      setResults(prev => prev.map(r =>
        r.documentId === docId ? { ...r, isFavorite: res.isFavorite } : r
      ));
      showToast(res.isFavorite ? 'Added to favorites.' : 'Removed from favorites.', 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Search Input Bar */}
      <form onSubmit={handleFormSubmit} className="search-hero-box" style={{ maxWidth: '100%' }}>
        <Search size={20} color="var(--accent-forest)" style={{ flexShrink: 0 }} />
        <input
          id="main-search-input"
          type="text"
          className="search-input"
          placeholder='Search by meaning, keyword, exact "phrase", or filename... (Press / or Ctrl+K)'
          value={query}
          onChange={handleInputChange}
          autoFocus
          aria-label="Search documents"
        />
        {isLoading && <RefreshCw size={17} className="animate-spin" color="var(--accent-forest)" />}
        <button type="submit" className="btn btn-primary btn-sm">
          <span>Search</span>
        </button>
      </form>

      {/* Filter Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', background: 'var(--bg-surface)', padding: '12px 18px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
        {/* Type chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: '4px' }}>TYPE:</span>
          {['all', 'pdf', 'docx', 'md', 'txt'].map(t => (
            <button
              key={t}
              type="button"
              className={`chip ${fileType === t ? 'active' : ''}`}
              onClick={() => setFileType(t)}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Dropdown Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Folder filter */}
          {folders.length > 0 && (
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '5px 10px', fontSize: '0.82rem', color: 'var(--text-primary)' }}
            >
              <option value="all">All Folders</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          )}

          {/* Favorite filter */}
          <button
            type="button"
            className={`chip ${isFavorite ? 'active' : ''}`}
            onClick={() => setIsFavorite(!isFavorite)}
          >
            <Star size={13} fill={isFavorite ? 'currentColor' : 'none'} />
            <span>Favorites</span>
          </button>

          {/* Sort By */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowUpDown size={13} color="var(--text-muted)" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '5px 10px', fontSize: '0.82rem', color: 'var(--text-primary)' }}
            >
              <option value="relevance">Sort: Relevance</option>
              <option value="date">Sort: Date Modified</option>
              <option value="name">Sort: Filename</option>
              <option value="size">Sort: File Size</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count & Query Echo */}
      {hasSearched && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.86rem', color: 'var(--text-muted)', padding: '0 4px' }}>
          <div>
            Found <strong style={{ color: 'var(--text-primary)' }}>{results.length}</strong> matching document{results.length !== 1 ? 's' : ''} for <em style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-serif)' }}>"{query}"</em>
          </div>
          <div style={{ fontSize: '0.78rem' }}>
            Combined Semantic Vector + FTS5 Keyword Ranking
          </div>
        </div>
      )}

      {/* Results List */}
      <div>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--accent-forest)' }} />
            <div style={{ fontSize: '1rem', fontWeight: 500 }}>Scanning vector index and matching contents...</div>
          </div>
        ) : hasSearched && results.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Frown size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>No matching documents found</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '460px', margin: '0 auto' }}>
              We couldn't find any documents matching "{query}" with the current filters. Try broader terms, clearing file-type filters, or indexing additional folders.
            </p>
          </div>
        ) : (
          results.map((result) => (
            <ResultCard
              key={result.documentId}
              result={result}
              query={query}
              onOpenDocument={onOpenDocument}
              onViewDetails={onViewDetails}
              onToggleFavorite={handleToggleFavorite}
              onAskAboutDoc={onAskAboutDoc}
              onShowWhy={(r) => setSelectedWhyResult(r)}
            />
          ))
        )}
      </div>

      {/* Why Result Modal */}
      {selectedWhyResult && (
        <WhyResultModal
          result={selectedWhyResult}
          query={query}
          onClose={() => setSelectedWhyResult(null)}
        />
      )}
    </div>
  );
}
