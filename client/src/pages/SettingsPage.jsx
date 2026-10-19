import React, { useState, useEffect } from 'react';
import {
  Cpu,
  ShieldCheck,
  HardDrive,
  Database,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Sparkles,
  Server
} from 'lucide-react';
import { api } from '../services/api.js';

export function SettingsPage({
  ollamaStatus,
  onRefreshHealth,
  showToast
}) {
  const [settings, setSettings] = useState({
    chat_model: 'qwen2.5:3b',
    embed_model: 'nomic-embed-text',
    ollama_url: 'http://127.0.0.1:11434',
    theme: 'light',
    search_history_enabled: 'true',
    chunk_size: '600',
    chunk_overlap: '100',
    top_k: '5'
  });

  const [privacyAudit, setPrivacyAudit] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingOllama, setIsTestingOllama] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    loadSettings();
    loadPrivacyAudit();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.getSettings();
      if (res.settings) {
        setSettings(prev => ({ ...prev, ...res.settings }));
      }
    } catch {}
  };

  const loadPrivacyAudit = async () => {
    try {
      const audit = await api.getPrivacyAudit();
      setPrivacyAudit(audit);
    } catch {}
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    setIsSaving(true);
    try {
      await api.updateSettings(settings);
      showToast('Settings saved successfully.', 'success');
      onRefreshHealth?.();
      loadPrivacyAudit();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestOllama = async () => {
    setIsTestingOllama(true);
    setTestResult(null);
    try {
      const res = await api.testOllama();
      setTestResult(res);
      if (res.health?.connected && res.embeddingTest?.success) {
        showToast('Ollama and embedding model test passed!', 'success');
      } else {
        showToast(res.health?.error || res.embeddingTest?.error || 'Test failed.', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsTestingOllama(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await api.clearSearchHistory();
      showToast('Search history cleared.', 'info');
      loadPrivacyAudit();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleResetAllData = async () => {
    if (resetConfirmText !== 'RESET_ALL_DATA') {
      showToast('Please type RESET_ALL_DATA to confirm.', 'error');
      return;
    }

    setIsResetting(true);
    try {
      const res = await api.resetIndex('RESET_ALL_DATA');
      showToast(res.message, 'success');
      setResetConfirmText('');
      loadPrivacyAudit();
      onRefreshHealth?.();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', maxWidth: '860px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.6rem' }}>Settings & Privacy Center</h2>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          Manage local AI connections, model choices, indexing tuning, and data privacy.
        </p>
      </div>

      {/* Ollama Connection & Models */}
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Cpu size={20} color="var(--accent-forest)" />
            <h3 style={{ fontSize: '1.18rem' }}>Local AI Engine (Ollama)</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: ollamaStatus?.connected ? 'var(--accent-forest)' : 'var(--accent-terracotta)', fontWeight: 600 }}>
              {ollamaStatus?.connected ? 'Connected' : 'Offline / Unreachable'}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleTestOllama}
              disabled={isTestingOllama}
            >
              <RefreshCw size={13} className={isTestingOllama ? 'animate-spin' : ''} />
              <span>{isTestingOllama ? 'Testing...' : 'Test Connection'}</span>
            </button>
          </div>
        </div>

        {testResult && (
          <div style={{ background: testResult.embeddingTest?.success ? 'var(--accent-forest-subtle)' : 'var(--accent-terracotta-subtle)', border: '1px solid var(--border-subtle)', padding: '12px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
            <div><strong>Status:</strong> {testResult.health?.connected ? 'Ollama reachable' : 'Cannot reach Ollama'}</div>
            <div><strong>Chat Model:</strong> {testResult.health?.chatModelReady ? `${testResult.health.chatModel} ready` : `Not found: ${testResult.health.chatModel}`}</div>
            <div><strong>Embed Model:</strong> {testResult.embeddingTest?.success ? `${testResult.health.embedModel} ready (${testResult.embeddingTest.dimension}-dim vectors)` : testResult.embeddingTest?.error || 'Missing'}</div>
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
              Ollama Base URL
            </label>
            <input
              type="text"
              className="search-input"
              style={{ width: '100%', background: 'var(--bg-canvas)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '8px 12px', fontSize: '0.88rem', fontFamily: 'var(--font-mono)' }}
              value={settings.ollama_url}
              onChange={(e) => setSettings({ ...settings, ollama_url: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                Chat Model (Reasoning & Q&A)
              </label>
              <input
                type="text"
                className="search-input"
                style={{ width: '100%', background: 'var(--bg-canvas)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '8px 12px', fontSize: '0.88rem' }}
                value={settings.chat_model}
                onChange={(e) => setSettings({ ...settings, chat_model: e.target.value })}
                placeholder="e.g. qwen2.5:3b, llama3.2, mistral"
              />
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Used for synthesizing grounded answers with citations.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                Embedding Model (Semantic Search)
              </label>
              <input
                type="text"
                className="search-input"
                style={{ width: '100%', background: 'var(--bg-canvas)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '8px 12px', fontSize: '0.88rem' }}
                value={settings.embed_model}
                onChange={(e) => setSettings({ ...settings, embed_model: e.target.value })}
                placeholder="e.g. nomic-embed-text, all-minilm"
              />
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Used for vector cosine similarity search.
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save AI Configuration'}
            </button>
          </div>
        </form>
      </section>

      {/* Indexing Tuning */}
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
          <Sliders size={20} color="var(--accent-forest)" />
          <h3 style={{ fontSize: '1.18rem' }}>Document Indexing Preferences</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
              Chunk Size (Characters)
            </label>
            <input
              type="number"
              className="search-input"
              style={{ width: '100%', background: 'var(--bg-canvas)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '8px 12px', fontSize: '0.88rem' }}
              value={settings.chunk_size}
              onChange={(e) => setSettings({ ...settings, chunk_size: e.target.value })}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
              Chunk Overlap (Characters)
            </label>
            <input
              type="number"
              className="search-input"
              style={{ width: '100%', background: 'var(--bg-canvas)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '8px 12px', fontSize: '0.88rem' }}
              value={settings.chunk_overlap}
              onChange={(e) => setSettings({ ...settings, chunk_overlap: e.target.value })}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
              Search History
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleClearHistory}
              >
                Clear Search History
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px' }}>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Indexing Tuning'}
          </button>
        </div>
      </section>

      {/* Privacy Architecture & Storage Audit */}
      {privacyAudit && (
        <section className="card card-elevated" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <ShieldCheck size={20} color="var(--accent-forest)" />
            <h3 style={{ fontSize: '1.18rem' }}>Privacy Architecture & Storage Audit</h3>
          </div>

          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            FileSense Local enforces a strict zero-telemetry policy. The audit below verifies all files, vectors, and database records residing strictly on your disk.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>NETWORK ACTIVITY</div>
              <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--accent-forest)', marginTop: '2px' }}>
                {privacyAudit.privacyArchitecture.networkMode}
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>SQLITE DATABASE SIZE</div>
              <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                {privacyAudit.privacyArchitecture.databaseSizeMB} MB
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL EMBEDDINGS</div>
              <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--accent-forest)', marginTop: '2px' }}>
                {privacyAudit.stats.embeddedChunks} vectors
              </div>
            </div>
          </div>

          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
            Local Database Location: {privacyAudit.privacyArchitecture.databaseLocation}
          </div>
        </section>
      )}

      {/* Danger Zone: Reset Index */}
      <section className="card" style={{ borderColor: 'var(--accent-terracotta)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-terracotta)' }}>
          <Trash2 size={18} />
          <h3 style={{ fontSize: '1.15rem' }}>Factory Reset Search Index</h3>
        </div>

        <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
          Wipes all indexed documents, chunk vectors, and search history from the local database. <strong>Your physical files on your hard drive will remain completely untouched.</strong>
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="search-input"
            style={{ maxWidth: '280px', background: 'var(--bg-canvas)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', padding: '7px 12px', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}
            placeholder="Type RESET_ALL_DATA to confirm"
            value={resetConfirmText}
            onChange={(e) => setResetConfirmText(e.target.value)}
          />

          <button
            type="button"
            className="btn btn-terracotta btn-sm"
            onClick={handleResetAllData}
            disabled={resetConfirmText !== 'RESET_ALL_DATA' || isResetting}
          >
            {isResetting ? 'Resetting...' : 'Wipe Index Data'}
          </button>
        </div>
      </section>
    </div>
  );
}
