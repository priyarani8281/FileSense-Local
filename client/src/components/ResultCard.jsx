import {
  FileText,
  ExternalLink,
  Star,
  Info,
  Calendar,
  HardDrive,
  MessageSquareQuote,
  Sparkles,
  Copy
} from 'lucide-react';
import { formatBytes, formatDate, cleanPath, getFileCategory } from '../utils/formatters.js';

export function ResultCard({
  result,
  query,
  onOpenDocument,
  onViewDetails,
  onToggleFavorite,
  onAskAboutDoc,
  onShowWhy
}) {
  const cat = getFileCategory(result.extension);

  // Highlight query keywords in snippet
  const renderHighlightedSnippet = (text, q) => {
    if (!text || !q) return text;
    const words = q.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (words.length === 0) return text;

    const regex = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      words.includes(part.toLowerCase()) ? (
        <mark key={i} className="snippet-highlight">{part}</mark>
      ) : (
        part
      )
    );
  };

  return (
    <article className="result-card">
      <div className="result-header">
        <div className="result-file-title">
          <div className={`file-type-icon-box ${cat}`}>
            {result.extension?.replace('.', '') || 'DOC'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div className="result-name">{result.filename}</div>
              {result.isDuplicate && (
                <span
                  className="pill"
                  style={{
                    fontSize: '0.70rem',
                    background: 'rgba(217, 119, 6, 0.12)',
                    color: '#d97706',
                    border: '1px solid rgba(217, 119, 6, 0.25)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '1px 7px',
                    borderRadius: '12px',
                    fontWeight: 500
                  }}
                  title={`Duplicate copy of ${result.duplicateOf || 'another document'}`}
                >
                  <Copy size={10} />
                  <span>Duplicate Copy</span>
                </span>
              )}
            </div>
            <div className="result-path" title={result.filePath}>
              {cleanPath(result.filePath)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="result-score-badge" title="Combined Hybrid Match Score">
            <Sparkles size={12} />
            <span>{result.combinedScore}% Match</span>
          </div>

          <button
            className="btn btn-subtle btn-sm"
            style={{ padding: '6px', color: result.isFavorite ? '#E5A54B' : 'var(--text-muted)' }}
            onClick={() => onToggleFavorite(result.documentId)}
            title={result.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            aria-label="Toggle favorite"
          >
            <Star size={16} fill={result.isFavorite ? '#E5A54B' : 'none'} />
          </button>
        </div>
      </div>

      {result.bestSnippet && (
        <div className="result-snippet">
          {renderHighlightedSnippet(result.bestSnippet, query)}
        </div>
      )}

      {result.explanation && (
        <div className="result-why-box">
          <Info size={14} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{result.explanation}</span>
          <button
            className="btn btn-subtle btn-sm"
            style={{ padding: '2px 6px', fontSize: '0.72rem', color: 'var(--accent-forest)' }}
            onClick={() => onShowWhy(result)}
          >
            Details
          </button>
        </div>
      )}

      <div className="result-actions">
        <div className="result-metadata-pills">
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={13} />
            {formatDate(result.mtime)}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <HardDrive size={13} />
            {formatBytes(result.size)}
          </span>
          {result.pageNumber && (
            <span>Page {result.pageNumber}</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {onAskAboutDoc && (
            <button
              className="btn btn-subtle btn-sm"
              onClick={() => onAskAboutDoc(result)}
              title="Ask AI questions grounded in this document"
            >
              <MessageSquareQuote size={14} />
              <span>Ask AI</span>
            </button>
          )}

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onViewDetails(result.documentId)}
          >
            Preview Chunks
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => onOpenDocument(result.documentId)}
            title="Open in your default computer application"
          >
            <ExternalLink size={14} />
            <span>Open Original</span>
          </button>
        </div>
      </div>
    </article>
  );
}
