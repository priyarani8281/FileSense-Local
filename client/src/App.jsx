import React, { useState, useEffect } from 'react';
import { api } from './services/api.js';
import { Sidebar } from './components/Sidebar.jsx';
import { Topbar } from './components/Topbar.jsx';
import { ToastContainer } from './components/ToastContainer.jsx';
import { FolderSelectModal } from './components/FolderSelectModal.jsx';
import { DocumentDetailDrawer } from './components/DocumentDetailDrawer.jsx';
import { IndexingProgressDrawer } from './components/IndexingProgressDrawer.jsx';
import { OnboardingModal } from './pages/OnboardingModal.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { SearchPage } from './pages/SearchPage.jsx';
import { LibraryPage } from './pages/LibraryPage.jsx';
import { AskPage } from './pages/AskPage.jsx';
import { FoldersPage } from './pages/FoldersPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';

export function App() {
  const [currentTab, setTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [askInitialQuestion, setAskInitialQuestion] = useState('');
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [isAddFolderOpen, setIsAddFolderOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // System & Health stats
  const [stats, setStats] = useState({ folders: 0, documents: 0, chunks: 0, failed: 0 });
  const [ollamaStatus, setOllamaStatus] = useState(null);
  const [indexingStatus, setIndexingStatus] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Theme
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('filesense_theme') || 'light';
  });

  // Toasts
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info') => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('filesense_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Fetch health & stats
  const refreshHealth = async () => {
    setIsRefreshing(true);
    try {
      const data = await api.getHealth();
      setOllamaStatus(data.ollama);
      setStats(data.stats);

      // Check first-time onboarding
      const hasSeenOnboarding = localStorage.getItem('filesense_onboarded');
      if (!hasSeenOnboarding && data.stats.folders === 0) {
        setIsOnboardingOpen(true);
      }
    } catch (err) {
      console.warn('[App] Health refresh failed:', err.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshHealth();
  }, []);

  // Poll indexing status when running
  useEffect(() => {
    let interval = null;

    const checkStatus = async () => {
      try {
        const s = await api.getIndexingStatus();
        setIndexingStatus(s);
        if (s.isIndexing) {
          if (!interval) {
            interval = setInterval(checkStatus, 1500);
          }
        } else if (interval) {
          clearInterval(interval);
          interval = null;
          // Refresh counts when indexing finishes
          refreshHealth();
        }
      } catch {}
    };

    checkStatus();
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [indexingStatus?.isIndexing]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape key closes open drawers or modals
      if (e.key === 'Escape') {
        if (selectedDocId) setSelectedDocId(null);
        if (isAddFolderOpen) setIsAddFolderOpen(false);
        if (isOnboardingOpen) setIsOnboardingOpen(false);
        return;
      }

      // Check if user is typing in an input or textarea
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea' || document.activeElement?.isContentEditable;

      // Ctrl+K, Cmd+K, or pressing '/' while not inside an input
      if (((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) || (e.key === '/' && !isInput)) {
        e.preventDefault();
        if (currentTab === 'dashboard') {
          const dashInput = document.getElementById('dashboard-search-input');
          if (dashInput) {
            dashInput.focus();
            dashInput.select();
            return;
          }
        }
        setTab('search');
        setTimeout(() => {
          const mainInput = document.getElementById('main-search-input');
          if (mainInput) {
            mainInput.focus();
            mainInput.select();
          }
        }, 50);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTab, selectedDocId, isAddFolderOpen, isOnboardingOpen]);

  // Actions
  const handlePerformSearch = (queryText) => {
    setSearchQuery(queryText);
    setTab('search');
  };

  const handleOpenDocument = async (docId) => {
    try {
      const res = await api.openDocument(docId);
      showToast(res.message || 'Opened file in default application.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAskAboutDoc = (doc) => {
    setAskInitialQuestion(`Summarize key details from "${doc.filename}"`);
    setTab('ask');
  };

  const handleFolderAdded = () => {
    refreshHealth();
  };

  const handleCancelIndexing = async () => {
    try {
      await api.cancelIndexing();
      showToast('Indexing cancellation requested.', 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Tab Titles
  const tabMeta = {
    dashboard: { title: 'Dashboard', subtitle: 'Find any document across indexed folders using meaning.' },
    search: { title: 'Natural-Language Search', subtitle: 'Hybrid search across full-text, filename, and semantic vectors.' },
    library: { title: 'Document Library', subtitle: 'View, filter, and inspect all indexed files on your computer.' },
    ask: { title: 'Ask Your Documents', subtitle: 'Grounded question answering with source citations and page references.' },
    folders: { title: 'Indexed Folders', subtitle: 'Designate and manage the local directories you want to search.' },
    settings: { title: 'Settings & Privacy Center', subtitle: 'Tune AI models, inspect local storage, and configure indexing.' }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setTab={setTab}
        stats={stats}
        ollamaStatus={ollamaStatus}
      />

      {/* Main Content Area */}
      <div className="main-wrapper">
        <Topbar
          title={tabMeta[currentTab]?.title}
          subtitle={tabMeta[currentTab]?.subtitle}
          theme={theme}
          toggleTheme={toggleTheme}
          onOpenAddFolder={() => setIsAddFolderOpen(true)}
          onRefresh={refreshHealth}
          isRefreshing={isRefreshing}
        />

        <main className="content-area">
          {currentTab === 'dashboard' && (
            <DashboardPage
              onSearch={handlePerformSearch}
              onOpenAddFolder={() => setIsAddFolderOpen(true)}
              onViewDoc={(id) => setSelectedDocId(id)}
              onOpenDoc={handleOpenDocument}
              setTab={setTab}
              stats={stats}
              ollamaStatus={ollamaStatus}
            />
          )}

          {currentTab === 'search' && (
            <SearchPage
              initialQuery={searchQuery}
              onOpenDocument={handleOpenDocument}
              onViewDetails={(id) => setSelectedDocId(id)}
              onAskAboutDoc={handleAskAboutDoc}
              showToast={showToast}
            />
          )}

          {currentTab === 'library' && (
            <LibraryPage
              onViewDoc={(id) => setSelectedDocId(id)}
              onOpenDoc={handleOpenDocument}
              onOpenAddFolder={() => setIsAddFolderOpen(true)}
              showToast={showToast}
            />
          )}

          {currentTab === 'ask' && (
            <AskPage
              initialQuestion={askInitialQuestion}
              onOpenDocument={handleOpenDocument}
              onViewDoc={(id) => setSelectedDocId(id)}
              showToast={showToast}
            />
          )}

          {currentTab === 'folders' && (
            <FoldersPage
              onOpenAddFolder={() => setIsAddFolderOpen(true)}
              indexingStatus={indexingStatus}
              showToast={showToast}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsPage
              ollamaStatus={ollamaStatus}
              onRefreshHealth={refreshHealth}
              showToast={showToast}
            />
          )}
        </main>
      </div>

      {/* Modals & Drawers */}
      <FolderSelectModal
        isOpen={isAddFolderOpen}
        onClose={() => setIsAddFolderOpen(false)}
        onFolderAdded={handleFolderAdded}
        showToast={showToast}
      />

      <DocumentDetailDrawer
        documentId={selectedDocId}
        onClose={() => setSelectedDocId(null)}
        onOpenDocument={handleOpenDocument}
        onDocumentRemoved={() => refreshHealth()}
        showToast={showToast}
      />

      <IndexingProgressDrawer
        status={indexingStatus}
        onCancel={handleCancelIndexing}
      />

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => {
          setIsOnboardingOpen(false);
          localStorage.setItem('filesense_onboarded', 'true');
        }}
        onOpenAddFolder={() => setIsAddFolderOpen(true)}
        ollamaStatus={ollamaStatus}
      />

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
export default App;
