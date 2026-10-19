import React from 'react';
import {
  ShieldCheck,
  Search,
  Sparkles,
  FolderOpen,
  ArrowRight,
  Cpu,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export function OnboardingModal({
  isOpen,
  onClose,
  onOpenAddFolder,
  ollamaStatus
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-dialog" style={{ maxWidth: '640px' }}>
        <div className="modal-header" style={{ background: 'var(--accent-forest)', color: '#FFFDF8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={22} color="#FFFDF8" />
            <div>
              <h2 style={{ fontSize: '1.35rem', color: '#FFFDF8', margin: 0 }}>Welcome to FileSense Local</h2>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)' }}>Private Semantic Document Search</div>
            </div>
          </div>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '22px', padding: '28px' }}>
          {/* Headline */}
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>
              Find the file. Not the folder.
            </h1>
            <p style={{ fontSize: '0.96rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Instead of digging through nested directories or struggling to recall exact filenames, search naturally across all your local PDF, DOCX, Markdown, and text files.
            </p>
          </div>

          {/* 3 Value Pillars */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
            <div style={{ background: 'var(--bg-subtle)', padding: '14px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <Sparkles size={20} color="var(--accent-forest)" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Semantic Meaning</div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Understands queries with different wording than the source.
              </div>
            </div>

            <div style={{ background: 'var(--bg-subtle)', padding: '14px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <ShieldCheck size={20} color="var(--accent-forest)" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>100% Offline</div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Runs completely on your computer with zero cloud telemetry.
              </div>
            </div>

            <div style={{ background: 'var(--bg-subtle)', padding: '14px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <FolderOpen size={20} color="var(--accent-forest)" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Explicit Folders</div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                You control precisely which directories get indexed.
              </div>
            </div>
          </div>

          {/* Ollama Readiness Card */}
          <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Cpu size={20} color="var(--accent-forest)" />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Local Ollama Engine</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Chat: {ollamaStatus?.chatModel || 'qwen2.5:3b'} · Embed: {ollamaStatus?.embedModel || 'nomic-embed-text'}
                </div>
              </div>
            </div>

            {ollamaStatus?.connected ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: 'var(--accent-forest)', fontWeight: 600 }}>
                <CheckCircle2 size={15} />
                <span>Ready</span>
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: 'var(--accent-terracotta)', fontWeight: 600 }}>
                <AlertTriangle size={15} />
                <span>Offline</span>
              </span>
            )}
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button className="btn btn-subtle btn-sm" onClick={onClose}>
            Skip to Dashboard
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              onClose();
              onOpenAddFolder();
            }}
          >
            <span>Choose Folders to Index</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
