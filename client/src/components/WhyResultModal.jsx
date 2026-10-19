import React from 'react';
import { X, Sparkles, FileText, Search, ShieldCheck } from 'lucide-react';

export function WhyResultModal({ result, query, onClose }) {
  if (!result) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="var(--accent-forest)" />
            <h3 style={{ fontSize: '1.2rem' }}>Why This Result Matched</h3>
          </div>
          <button className="btn btn-subtle btn-sm" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              Search Query
            </div>
            <div style={{ fontSize: '1rem', fontStyle: 'italic', fontFamily: 'var(--font-serif)', color: 'var(--text-primary)', marginTop: '4px' }}>
              "{query}"
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              Matched Document
            </div>
            <div style={{ fontWeight: 600, fontSize: '1.05rem', marginTop: '4px' }}>
              {result.filename}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {result.filePath}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>SEMANTIC</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-forest)', marginTop: '2px' }}>
                {Math.round(result.semanticScore * 100)}%
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Vector meaning</div>
            </div>

            <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>KEYWORD</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-sage)', marginTop: '2px' }}>
                {Math.round(result.keywordScore * 100)}%
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>FTS token overlap</div>
            </div>

            <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>COMBINED</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-terracotta)', marginTop: '2px' }}>
                {result.combinedScore}%
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Hybrid ranking</div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '6px' }}>
              Transparent Explanation
            </div>
            <div style={{ background: 'var(--accent-forest-subtle)', border: '1px solid var(--accent-forest-border)', padding: '12px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', color: 'var(--accent-forest)', lineHeight: 1.5 }}>
              {result.explanation}
            </div>
          </div>

          {result.matchedKeywords?.length > 0 && (
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '6px' }}>
                Extracted Keyword Matches
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {result.matchedKeywords.map((kw, i) => (
                  <span key={i} className="chip active">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
            <ShieldCheck size={16} color="var(--accent-forest)" />
            <span>This calculation was performed locally on your device without transmitting data to any cloud service.</span>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
