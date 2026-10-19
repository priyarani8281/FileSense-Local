import React from 'react';
import { Sun, Moon, Plus, Shield, RefreshCw } from 'lucide-react';

export function Topbar({
  title,
  subtitle,
  theme,
  toggleTheme,
  onOpenAddFolder,
  onRefresh,
  isRefreshing
}) {
  return (
    <header className="topbar">
      <div>
        <h1 style={{ fontSize: '1.45rem', marginBottom: '2px' }}>{title}</h1>
        {subtitle && (
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>{subtitle}</p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {onRefresh && (
          <button
            className="btn btn-subtle btn-sm"
            onClick={onRefresh}
            title="Refresh data"
            disabled={isRefreshing}
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        )}

        <button
          className="btn btn-subtle btn-sm"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} theme`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <button
          className="btn btn-primary btn-sm"
          onClick={onOpenAddFolder}
          id="btn-add-folder-topbar"
        >
          <Plus size={16} />
          <span>Add Folder</span>
        </button>
      </div>
    </header>
  );
}
