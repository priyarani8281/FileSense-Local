import React from 'react';
import {
  Compass,
  Search,
  BookOpen,
  MessageSquareQuote,
  FolderOpen,
  Settings,
  ShieldCheck,
  Cpu
} from 'lucide-react';

export function Sidebar({ currentTab, setTab, stats, ollamaStatus }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Compass },
    { id: 'search', label: 'Search', icon: Search, badge: stats?.documents || 0 },
    { id: 'library', label: 'My Library', icon: BookOpen },
    { id: 'ask', label: 'Ask AI', icon: MessageSquareQuote },
    { id: 'folders', label: 'Folders', icon: FolderOpen, badge: stats?.folders || 0 },
    { id: 'settings', label: 'Settings & Privacy', icon: Settings }
  ];

  return (
    <aside className="sidebar" aria-label="Main Navigation">
      <div className="sidebar-header">
        <div className="brand-badge">
          <div className="brand-icon">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="brand-title">FileSense Local</div>
            <div className="brand-tagline">100% Private Search</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Navigation</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setTab(item.id)}
              type="button"
            >
              <Icon size={18} />
              <span>{item.label}</span>
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span className="nav-badge">{item.badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="ai-status-pill" title={ollamaStatus?.error || 'Local Ollama status'}>
          <div className={`status-dot ${ollamaStatus?.connected ? '' : 'offline'}`} />
          <Cpu size={14} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {ollamaStatus?.connected
              ? `${ollamaStatus.chatModel || 'Ollama Active'}`
              : 'Ollama Offline'}
          </span>
        </div>
      </div>
    </aside>
  );
}
