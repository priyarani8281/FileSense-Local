import React, { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  BookOpen,
  FolderOpen,
  Layers,
  ShieldCheck,
  Cpu,
  ArrowRight,
  FileText,
  Clock,
  ExternalLink,
  Plus
} from 'lucide-react';
import { api } from '../services/api.js';
import { formatBytes, formatDate, getFileCategory } from '../utils/formatters.js';

export function DashboardPage({
  onSearch,
  onOpenAddFolder,
  onViewDoc,
  onOpenDoc,
  setTab,
  stats,
  ollamaStatus
}) {
  const [queryInput, setQueryInput] = useState('');
  const [suggestions, setSuggestions] = useState({
    curatedSuggestions: [],
    recentSearches: [],
    recentDocuments: []
  });
  const [recentDocs, setRecentDocs] = useState([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);

  useEffect(() => {
    loadSuggestions();
    loadRecentDocs();
  }, []);

  const loadSuggestions = async () => {
    try {
      const res = await api.getSuggestions();
      setSuggestions(res);
    } catch {}
  };

  const loadRecentDocs = async () => {
    setIsLoadingRecent(true);
    try {
      const res = await api.getDocuments({ limit: 6, sortBy: 'date' });
      setRecentDocs(res.documents || []);
    } catch {
    } finally {
      setIsLoadingRecent(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (queryInput.trim()) {
      onSearch(queryInput.trim());
    }
  };

  const handleSuggestionClick = (text) => {
    setQueryInput(text);
    onSearch(text);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Editorial Welcome Header */}
      <section style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto', paddingTop: '10px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--accent-forest-subtle)', color: 'var(--accent-forest)', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '0.78rem', fontWeight: 600, marginBottom: '14px' }}>
          <ShieldCheck size={14} />
          <span>Local Semantic Search · 100% Offline & Private</span>
        </div>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>
          Find the file. Not the folder.
        </h1>
        <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Search documents on your computer by meaning, concepts, or exact content without remembering filenames.
        </p>
      </section>

      {/* Prominent Natural-Language Search Bar */}
      <section style={{ maxWidth: '780px', width: '100%', margin: '0 auto' }}>
        <form onSubmit={handleSearchSubmit} className="search-hero-box">
          <Search size={22} color="var(--accent-forest)" style={{ flexShrink: 0 }} />
          <input
            id="dashboard-search-input"
            type="text"
            className="search-input"
            placeholder="Search naturally... e.g. 'Find my notes about React hooks' or 'March invoice ₹2,500' (Press / or Ctrl+K)"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            autoFocus
            aria-label="Natural language search"
          />
          <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '8px 16px' }}>
            <span>Search</span>
            <ArrowRight size={15} />
          </button>
        </form>

        {/* Curated Prompt Starters */}
        <div style={{ marginTop: '14px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Try:</span>
          {(suggestions.curatedSuggestions || []).map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              className="chip"
              onClick={() => handleSuggestionClick(prompt)}
            >
              <Sparkles size={12} color="var(--accent-terracotta)" />
              <span>{prompt}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Overview Stat Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'var(--accent-forest-subtle)', color: 'var(--accent-forest)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 700, lineHeight: 1.1 }}>{stats?.documents || 0}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Indexed Documents</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'var(--accent-sage-subtle)', color: 'var(--accent-sage)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FolderOpen size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 700, lineHeight: 1.1 }}>{stats?.folders || 0}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Indexed Folders</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'var(--accent-terracotta-subtle)', color: 'var(--accent-terracotta)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 700, lineHeight: 1.1 }}>{stats?.chunks || 0}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Vectorized Passages</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: ollamaStatus?.connected ? 'var(--accent-forest-subtle)' : 'var(--accent-terracotta-subtle)', color: ollamaStatus?.connected ? 'var(--accent-forest)' : 'var(--accent-terracotta)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Cpu size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, lineHeight: 1.2, color: ollamaStatus?.connected ? 'var(--accent-forest)' : 'var(--accent-terracotta)' }}>
              {ollamaStatus?.connected ? 'Ollama Online' : 'Ollama Offline'}
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              {ollamaStatus?.embedModel ? `${ollamaStatus.embedModel}` : 'Local AI Model'}
            </div>
          </div>
        </div>
      </section>

      {/* Recently Indexed Documents Section */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '1.25rem' }}>Recently Indexed Documents</h2>
          <button className="btn btn-subtle btn-sm" onClick={() => setTab('library')}>
            <span>View All Library</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {recentDocs.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <FolderOpen size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.15rem', marginBottom: '6px' }}>No documents indexed yet</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 16px' }}>
              Choose a folder on your computer to index, or load the included sample research notes and invoices.
            </p>
            <button className="btn btn-primary btn-sm" onClick={onOpenAddFolder}>
              <Plus size={15} />
              <span>Choose Folder to Index</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
            {recentDocs.map((doc) => {
              const cat = getFileCategory(doc.extension);
              return (
                <div key={doc.id} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div className={`file-type-icon-box ${cat}`}>
                      {doc.extension?.replace('.', '') || 'DOC'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.98rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.filename}>
                        {doc.filename}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {formatDate(doc.mtime)} · {formatBytes(doc.size)} · {doc.chunk_count} chunks
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                    <button className="btn btn-subtle btn-sm" onClick={() => onViewDoc(doc.id)}>
                      Inspect Chunks
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => onOpenDoc(doc.id)} title="Open in default program">
                      <ExternalLink size={13} />
                      <span>Open</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Privacy Guarantee Banner */}
      <section className="card card-elevated" style={{ background: 'var(--accent-forest-subtle)', border: '1px solid var(--accent-forest-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <ShieldCheck size={28} color="var(--accent-forest)" />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.98rem', color: 'var(--accent-forest)' }}>
              100% Local & Private Processing Guarantee
            </div>
            <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              FileSense Local runs entirely on your hardware. Your files, embeddings, and queries are never sent to external cloud APIs.
            </div>
          </div>
        </div>

        <button className="btn btn-primary btn-sm" onClick={() => setTab('settings')}>
          View Privacy Architecture
        </button>
      </section>
    </div>
  );
}
