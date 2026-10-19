import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  Plus,
  RefreshCw,
  Trash2,
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  FolderSync
} from 'lucide-react';
import { api } from '../services/api.js';
import { formatDate } from '../utils/formatters.js';

export function FoldersPage({
  onOpenAddFolder,
  indexingStatus,
  showToast
}) {
  const [folders, setFolders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [indexingFolderId, setIndexingFolderId] = useState(null);

  useEffect(() => {
    loadFolders();
  }, [indexingStatus]);

  const loadFolders = async () => {
    setIsLoading(true);
    try {
      const res = await api.getFolders();
      setFolders(res.folders || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleIndexFolder = async (folderId, force = false) => {
    setIndexingFolderId(folderId);
    try {
      await api.indexFolder(folderId, force);
      showToast('Indexing started in the background.', 'info');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIndexingFolderId(null);
    }
  };

  const handleDeleteFolder = async (folderId, name) => {
    if (!window.confirm(`Remove folder "${name}" from FileSense Local?\n\nThis will remove its documents and embeddings from the search index, but will NOT delete any files from your computer.`)) {
      return;
    }

    try {
      await api.deleteFolder(folderId);
      setFolders(prev => prev.filter(f => f.id !== folderId));
      showToast(`Removed "${name}" from index. Your physical files are untouched.`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header with Add Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem' }}>Indexed Folders</h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
            Only files inside these designated directories are indexed and searchable.
          </p>
        </div>

        <button className="btn btn-primary btn-sm" onClick={onOpenAddFolder}>
          <Plus size={16} />
          <span>Add Folder to Index</span>
        </button>
      </div>

      {/* Folders List */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', color: 'var(--accent-forest)' }} />
          <div>Loading indexed folders...</div>
        </div>
      ) : folders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <FolderOpen size={40} color="var(--text-muted)" style={{ margin: '0 auto 14px' }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>No folders indexed yet</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto 18px' }}>
            To start discovering documents, pick a folder from your disk. You can index course materials, work projects, or invoices.
          </p>
          <button className="btn btn-primary btn-sm" onClick={onOpenAddFolder}>
            <Plus size={15} />
            <span>Choose Folder</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {folders.map((folder) => {
            const isThisIndexing = indexingStatus?.isIndexing && indexingStatus?.folderId === folder.id;
            return (
              <div key={folder.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', background: 'var(--accent-forest-subtle)', color: 'var(--accent-forest)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FolderOpen size={22} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.18rem', fontWeight: 600 }}>{folder.name}</h3>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {folder.path}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleIndexFolder(folder.id, false)}
                      disabled={isThisIndexing || indexingStatus?.isIndexing}
                      title="Scan for new or modified files"
                    >
                      <FolderSync size={14} className={isThisIndexing ? 'animate-spin' : ''} />
                      <span>{isThisIndexing ? 'Scanning...' : 'Scan Now'}</span>
                    </button>

                    <button
                      className="btn btn-subtle btn-sm"
                      style={{ color: 'var(--accent-terracotta)', padding: '6px' }}
                      onClick={() => handleDeleteFolder(folder.id, folder.name)}
                      title="Remove folder from index"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '18px', fontSize: '0.82rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <FileText size={14} color="var(--accent-forest)" />
                    <strong>{folder.active_files || 0}</strong> active documents
                  </span>

                  {folder.failed_files > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--accent-terracotta)' }}>
                      <AlertTriangle size={14} />
                      <strong>{folder.failed_files}</strong> failed parsing
                    </span>
                  )}

                  {folder.missing_files > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--accent-terracotta)' }}>
                      <AlertTriangle size={14} />
                      <strong>{folder.missing_files}</strong> moved/deleted from disk
                    </span>
                  )}

                  <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Calendar size={13} />
                    Last scan: {folder.last_scanned_at ? formatDate(folder.last_scanned_at) : 'Never'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
