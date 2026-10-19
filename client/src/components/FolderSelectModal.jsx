import React, { useState } from 'react';
import {
  X,
  FolderPlus,
  FolderOpen,
  Monitor,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileCode
} from 'lucide-react';
import { api } from '../services/api.js';

export function FolderSelectModal({ isOpen, onClose, onFolderAdded, showToast }) {
  const [folderPath, setFolderPath] = useState('');
  const [folderName, setFolderName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBrowsingNative, setIsBrowsingNative] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleNativeBrowse = async () => {
    setIsBrowsingNative(true);
    setError('');
    try {
      const res = await api.openNativeFolderDialog();
      if (res.selectedPath) {
        setFolderPath(res.selectedPath);
        // Extract default name
        const parts = res.selectedPath.replace(/\\/g, '/').split('/');
        setFolderName(parts[parts.length - 1] || 'My Folder');
      }
    } catch (err) {
      setError('Could not open folder picker. You can enter the folder path manually below.');
    } finally {
      setIsBrowsingNative(false);
    }
  };

  const handleUseSample = () => {
    // Relative path to sample documents in the project
    setFolderPath('C:\\Users\\hp\\Documents\\fileorganizer\\data\\sample_documents');
    setFolderName('Sample Documents');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!folderPath.trim()) {
      setError('Please provide or browse for a folder path.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const res = await api.addFolder(folderPath.trim(), folderName.trim());
      showToast(`Added "${res.name}" and started indexing.`, 'success');
      onFolderAdded?.(res.folderId);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderPlus size={19} color="var(--accent-forest)" />
            <h3 style={{ fontSize: '1.2rem' }}>Add Folder to Index</h3>
          </div>
          <button className="btn btn-subtle btn-sm" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Choose a specific folder on your computer. FileSense Local will extract text from supported documents (PDF, DOCX, Markdown, Text) and generate local embeddings.
            </p>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--accent-terracotta-subtle)', border: '1px solid var(--accent-terracotta)', padding: '10px 12px', borderRadius: 'var(--radius-md)', color: 'var(--accent-terracotta)', fontSize: '0.85rem' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Quick Picker Action */}
            <div style={{ background: 'var(--bg-subtle)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-strong)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Select using your operating system
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleNativeBrowse}
                  disabled={isBrowsingNative}
                >
                  <FolderOpen size={15} />
                  <span>{isBrowsingNative ? 'Opening Folder Dialog...' : 'Browse Windows Folder...'}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleUseSample}
                >
                  <FileCode size={15} />
                  <span>Use Sample Documents Folder</span>
                </button>
              </div>
            </div>

            {/* Path Entry */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Folder Path on Disk
              </label>
              <input
                type="text"
                className="search-input"
                style={{
                  width: '100%',
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-md)',
                  padding: '9px 12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem'
                }}
                placeholder="e.g. C:\Users\YourName\Documents\Notes"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
              />
            </div>

            {/* Display Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Display Name (Optional)
              </label>
              <input
                type="text"
                className="search-input"
                style={{
                  width: '100%',
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-md)',
                  padding: '9px 12px',
                  fontSize: '0.88rem'
                }}
                placeholder="e.g. Research Papers, Invoices, Course Notes"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
              />
            </div>

            {/* Privacy Guarantee */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <ShieldCheck size={16} color="var(--accent-forest)" style={{ flexShrink: 0 }} />
              <span>
                Your files remain strictly on your local disk. No files are copied, uploaded, or transmitted across the internet.
              </span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
              {isSubmitting ? 'Validating...' : 'Add & Begin Indexing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
