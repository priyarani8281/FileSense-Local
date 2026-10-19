import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  RefreshCw,
  Trash2,
  Calendar,
  HardDrive,
  Layers,
  FileText,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api.js';
import { formatBytes, formatDate, cleanPath } from '../utils/formatters.js';

export function DocumentDetailDrawer({
  documentId,
  onClose,
  onOpenDocument,
  onDocumentRemoved,
  showToast
}) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReindexing, setIsReindexing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!documentId) return;
    loadDetails();
  }, [documentId]);

  const loadDetails = async () => {
    setIsLoading(true);
    try {
      const res = await api.getDocumentDetails(documentId);
      setData(res);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReindex = async () => {
    setIsReindexing(true);
    try {
      await api.reindexDocument(documentId);
      showToast('Document re-indexed successfully.', 'success');
      loadDetails();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsReindexing(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm(`Remove "${data?.document?.filename}" from search index? The original file on your computer will NOT be deleted.`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await api.deleteDocument(documentId);
      showToast('Document removed from search index.', 'info');
      onDocumentRemoved?.(documentId);
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!documentId) return null;

  const doc = data?.document;
  const chunks = data?.chunks || [];

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <aside className="drawer" aria-label="Document Details">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="var(--accent-forest)" />
            <h3 style={{ fontSize: '1.15rem' }}>Document Details</h3>
          </div>
          <button className="btn btn-subtle btn-sm" onClick={onClose} aria-label="Close drawer">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px' }} />
              <div>Loading document details...</div>
            </div>
          ) : doc ? (
            <>
              <div>
                <h2 style={{ fontSize: '1.35rem', marginBottom: '4px' }}>{doc.filename}</h2>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                  {doc.path}
                </div>
              </div>

              {!doc.existsOnDisk && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--accent-terracotta-subtle)', border: '1px solid var(--accent-terracotta)', padding: '10px 12px', borderRadius: 'var(--radius-md)', color: 'var(--accent-terracotta)', fontSize: '0.84rem' }}>
                  <AlertCircle size={16} />
                  <span>File is no longer accessible at this disk location. It may have been moved or deleted.</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>SIZE</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {formatBytes(doc.size)}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>CHUNKS</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {doc.chunk_count} passages
                  </div>
                </div>

                <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>MODIFIED</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {formatDate(doc.mtime)}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>INDEX STATUS</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-forest)', marginTop: '2px', textTransform: 'capitalize' }}>
                    {doc.status}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                    Indexed Text Chunks ({chunks.length})
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Extracted passages & embeddings
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
                  {chunks.map((ch) => (
                    <div key={ch.id} style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-forest)', background: 'var(--accent-forest-subtle)', padding: '2px 6px', borderRadius: '4px' }}>
                          Chunk #{ch.chunk_index + 1}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Page {ch.page_number} · ~{ch.token_count} tokens
                        </span>
                      </div>
                      <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                        {ch.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div>Document details not available.</div>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button
            className="btn btn-subtle btn-sm"
            style={{ color: 'var(--accent-terracotta)' }}
            onClick={handleRemove}
            disabled={isDeleting}
          >
            <Trash2 size={15} />
            <span>Remove from Index</span>
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleReindex}
              disabled={isReindexing}
            >
              <RefreshCw size={14} className={isReindexing ? 'animate-spin' : ''} />
              <span>Re-index</span>
            </button>

            <button
              className="btn btn-primary btn-sm"
              onClick={() => onOpenDocument(documentId)}
            >
              <ExternalLink size={14} />
              <span>Open File</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
