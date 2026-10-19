import React from 'react';
import { RefreshCw, XCircle, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';

export function IndexingProgressDrawer({ status, onCancel }) {
  if (!status || status.status === 'idle') return null;

  const isRunning = status.isIndexing;
  const percent = status.totalFiles > 0
    ? Math.min(100, Math.round((status.processedFiles / status.totalFiles) * 100))
    : 0;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '280px',
        right: '24px',
        maxWidth: '560px',
        background: 'var(--bg-surface-elevated)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-xl)',
        padding: '16px 20px',
        zIndex: 80,
        animation: 'toastIn 200ms ease'
      }}
      role="status"
      aria-live="polite"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isRunning ? (
            <RefreshCw size={16} className="animate-spin" color="var(--accent-forest)" />
          ) : status.status === 'completed' ? (
            <CheckCircle2 size={16} color="var(--accent-forest)" />
          ) : (
            <AlertTriangle size={16} color="var(--accent-terracotta)" />
          )}
          <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>
            {isRunning ? 'Indexing in progress...' : `Indexing ${status.status}`}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {status.processedFiles} / {status.totalFiles} files ({percent}%)
          </span>
          {isRunning && (
            <button
              className="btn btn-subtle btn-sm"
              style={{ color: 'var(--accent-terracotta)', padding: '2px 8px', fontSize: '0.75rem' }}
              onClick={onCancel}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="progress-track" style={{ marginBottom: '8px' }}>
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '380px' }}>
          {status.currentFile ? `Current: ${status.currentFile}` : 'Processing documents...'}
        </span>
        {status.errors?.length > 0 && (
          <span style={{ color: 'var(--accent-terracotta)', fontWeight: 600 }}>
            {status.errors.length} error{status.errors.length > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}
