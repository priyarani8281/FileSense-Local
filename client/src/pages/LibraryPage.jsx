import {
  LayoutGrid,
  List,
  Search,
  Filter,
  ExternalLink,
  Star,
  RefreshCw,
  FolderOpen,
  FileText,
  AlertCircle,
  Trash2,
  Calendar,
  HardDrive,
  Copy
} from 'lucide-react';
import { api } from '../services/api.js';
import { formatBytes, formatDate, cleanPath, getFileCategory } from '../utils/formatters.js';

export function LibraryPage({
  onViewDoc,
  onOpenDoc,
  onOpenAddFolder,
  showToast
}) {
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [search, setSearch] = useState('');
  const [folderId, setFolderId] = useState('all');
  const [fileType, setFileType] = useState('all');
  const [isFavorite, setIsFavorite] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFolders();
    loadDocuments();
  }, [folderId, fileType, isFavorite, sortBy, search]);

  const loadFolders = async () => {
    try {
      const res = await api.getFolders();
      setFolders(res.folders || []);
    } catch {}
  };

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await api.getDocuments({
        folderId,
        fileType,
        isFavorite,
        search,
        sortBy,
        limit: 100
      });
      setDocuments(res.documents || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFavorite = async (docId, e) => {
    e.stopPropagation();
    try {
      const res = await api.toggleFavorite(docId);
      setDocuments(prev => prev.map(d =>
        d.id === docId ? { ...d, is_favorite: res.isFavorite } : d
      ));
      showToast(res.isFavorite ? 'Added to favorites.' : 'Removed from favorites.', 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async (docId, filename, e) => {
    e.stopPropagation();
    if (!window.confirm(`Remove "${filename}" from search index? The original file remains on your disk.`)) {
      return;
    }
    try {
      await api.deleteDocument(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
      showToast(`"${filename}" removed from index.`, 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Filter Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', background: 'var(--bg-surface)', padding: '14px 18px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
        {/* Search within library */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '220px', maxWidth: '380px', background: 'var(--bg-muted)', padding: '6px 12px', borderRadius: 'var(--radius-md)' }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            className="search-input"
            style={{ fontSize: '0.86rem' }}
            placeholder="Filter library by filename..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {folders.length > 0 && (
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '6px 10px', fontSize: '0.82rem', color: 'var(--text-primary)' }}
            >
              <option value="all">All Folders</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          )}

          <select
            value={fileType}
            onChange={(e) => setFileType(e.target.value)}
            style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '6px 10px', fontSize: '0.82rem', color: 'var(--text-primary)' }}
          >
            <option value="all">All Types</option>
            <option value="pdf">PDF</option>
            <option value="docx">DOCX</option>
            <option value="md">Markdown</option>
            <option value="txt">Text</option>
          </select>

          <button
            type="button"
            className={`chip ${isFavorite ? 'active' : ''}`}
            onClick={() => setIsFavorite(!isFavorite)}
          >
            <Star size={13} fill={isFavorite ? 'currentColor' : 'none'} />
            <span>Favorites</span>
          </button>

          {/* View toggle */}
          <div style={{ display: 'flex', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <button
              className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-subtle'}`}
              style={{ borderRadius: 0, padding: '5px 9px' }}
              onClick={() => setViewMode('grid')}
              title="Grid View"
              aria-label="Grid view"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-subtle'}`}
              style={{ borderRadius: 0, padding: '5px 9px' }}
              onClick={() => setViewMode('list')}
              title="List View"
              aria-label="List view"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Document Count */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
        <div>
          Showing <strong>{documents.length}</strong> document{documents.length !== 1 ? 's' : ''} in library
        </div>
        <div style={{ fontSize: '0.78rem' }}>
          Click any card to inspect passages and extracted vectors
        </div>
      </div>

      {/* Main Grid or List Display */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', color: 'var(--accent-forest)' }} />
          <div>Loading indexed documents...</div>
        </div>
      ) : documents.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <FolderOpen size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>No documents in library</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 16px' }}>
            Index a folder on your computer to view its documents and search them with local AI.
          </p>
          <button className="btn btn-primary btn-sm" onClick={onOpenAddFolder}>
            Add Folder to Index
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {documents.map((doc) => {
            const cat = getFileCategory(doc.extension);
            return (
              <div
                key={doc.id}
                className="card"
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  padding: '18px'
                }}
                onClick={() => onViewDoc(doc.id)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div className={`file-type-icon-box ${cat}`}>
                    {doc.extension?.replace('.', '') || 'DOC'}
                  </div>

                  <button
                    className="btn btn-subtle btn-sm"
                    style={{ padding: '4px', color: doc.is_favorite ? '#E5A54B' : 'var(--text-muted)' }}
                    onClick={(e) => handleToggleFavorite(doc.id, e)}
                    title="Toggle Favorite"
                  >
                    <Star size={16} fill={doc.is_favorite ? '#E5A54B' : 'none'} />
                  </button>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.filename}>
                      {doc.filename}
                    </h3>
                    {Boolean(doc.is_duplicate) && (
                      <span
                        className="pill"
                        style={{
                          fontSize: '0.68rem',
                          background: 'rgba(217, 119, 6, 0.12)',
                          color: '#d97706',
                          border: '1px solid rgba(217, 119, 6, 0.25)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '1px 6px',
                          borderRadius: '10px',
                          fontWeight: 500
                        }}
                        title={`Duplicate copy of ${doc.duplicate_of || 'another document'}`}
                      >
                        <Copy size={9} />
                        <span>Duplicate</span>
                      </span>
                    )}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.path}>
                    {cleanPath(doc.path)}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                  <span>{formatDate(doc.mtime)}</span>
                  <span>{formatBytes(doc.size)}</span>
                  <span style={{ color: 'var(--accent-forest)', fontWeight: 600 }}>{doc.chunk_count} chunks</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
                  <button
                    className="btn btn-subtle btn-sm"
                    style={{ color: 'var(--accent-terracotta)', padding: '2px 6px' }}
                    onClick={(e) => handleDelete(doc.id, doc.filename, e)}
                    title="Remove from index"
                  >
                    <Trash2 size={13} />
                  </button>

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDoc(doc.id);
                    }}
                    title="Open original document in default OS program"
                  >
                    <ExternalLink size={13} />
                    <span>Open</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <th style={{ padding: '12px 18px' }}>Document</th>
                <th style={{ padding: '12px 14px' }}>Folder</th>
                <th style={{ padding: '12px 14px' }}>Size</th>
                <th style={{ padding: '12px 14px' }}>Modified</th>
                <th style={{ padding: '12px 14px' }}>Passages</th>
                <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => {
                const cat = getFileCategory(doc.extension);
                return (
                  <tr
                    key={doc.id}
                    style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background var(--transition-fast)' }}
                    onClick={() => onViewDoc(doc.id)}
                    className="library-table-row"
                  >
                    <td style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className={`file-type-icon-box ${cat}`} style={{ width: '28px', height: '28px', fontSize: '0.65rem' }}>
                        {doc.extension?.replace('.', '') || 'DOC'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600 }}>{doc.filename}</span>
                        {Boolean(doc.is_duplicate) && (
                          <span
                            className="pill"
                            style={{
                              fontSize: '0.68rem',
                              background: 'rgba(217, 119, 6, 0.12)',
                              color: '#d97706',
                              border: '1px solid rgba(217, 119, 6, 0.25)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '1px 5px',
                              borderRadius: '8px',
                              fontWeight: 500
                            }}
                            title={`Duplicate copy of ${doc.duplicate_of || 'another document'}`}
                          >
                            <Copy size={9} />
                            <span>Duplicate</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {doc.folder_name || 'Folder'}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                      {formatBytes(doc.size)}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                      {formatDate(doc.mtime)}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--accent-forest)', fontWeight: 600 }}>
                      {doc.chunk_count}
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn btn-subtle btn-sm"
                          style={{ padding: '4px', color: doc.is_favorite ? '#E5A54B' : 'var(--text-muted)' }}
                          onClick={(e) => handleToggleFavorite(doc.id, e)}
                        >
                          <Star size={14} fill={doc.is_favorite ? '#E5A54B' : 'none'} />
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => onOpenDoc(doc.id)}
                        >
                          <ExternalLink size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
