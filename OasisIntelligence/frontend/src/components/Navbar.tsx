import React, { useState, useEffect, useRef } from 'react';
import type { SearchResult } from '../types';

interface NavbarProps {
  email: string;
  onLogout: () => void;
  savedCount: number;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  apiBase: string;
  userId: number;
  onSearchResultClick: (item: SearchResult) => void;
  onOpenEfficiencyReport: () => void;
  onTakeSnapshot: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  email,
  onLogout,
  savedCount,
  isSidebarOpen,
  onToggleSidebar,
  apiBase,
  userId,
  onSearchResultClick,
  onOpenEfficiencyReport,
  onTakeSnapshot,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${apiBase}/api/search?q=${encodeURIComponent(query.trim())}&userId=${userId}`);
        if (res.ok) {
          const data: SearchResult[] = await res.json();
          setResults(data);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, apiBase, userId]);

  return (
    <nav className="navbar">
      <div className="brand">
        <div className="brand-icon">OI</div>
        <div className="brand-title">Oasis Intelligence</div>
        <div className="brand-badge">Exploratory Analytics</div>
      </div>

      <div className="navbar-search-container" ref={searchRef}>
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="navbar-search-input"
            placeholder="Keyword search across crops, countries, presets..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => {
              if (query.trim() && results.length > 0) setShowDropdown(true);
            }}
          />
          {query && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => {
                setQuery('');
                setResults([]);
                setShowDropdown(false);
              }}
            >
              ×
            </button>
          )}
        </div>

        {showDropdown && query.trim() && (
          <div className="search-dropdown">
            {searching ? (
              <div className="search-dropdown-message">Searching database across relations...</div>
            ) : results.length === 0 ? (
              <div className="search-dropdown-message">No records found matching "{query}"</div>
            ) : (
              results.map((item, idx) => (
                <div
                  key={`${item.type}-${item.id}-${idx}`}
                  className="search-dropdown-item"
                  onClick={() => {
                    onSearchResultClick(item);
                    setShowDropdown(false);
                    setQuery('');
                  }}
                >
                  <div className="search-item-badge">
                    {item.type === 'crop' && '🌾 CROP'}
                    {item.type === 'country' && '🌍 COUNTRY'}
                    {item.type === 'preset' && '★ PRESET'}
                  </div>
                  <div className="search-item-content">
                    <div className="search-item-title">{item.title}</div>
                    {item.subtitle && <div className="search-item-subtitle">{item.subtitle}</div>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="nav-actions">
        <button
          type="button"
          className="btn-advanced"
          onClick={onOpenEfficiencyReport}
          title="Generate multi-year crop efficiency report"
        >
          ⚡ Yield Report
        </button>

        <button
          type="button"
          className="btn-advanced"
          onClick={onTakeSnapshot}
          title="Take benchmark snapshot of current metrics"
        >
          📸 Snapshot
        </button>

        <button
          type="button"
          className={`saved-toggle-btn ${isSidebarOpen ? 'active' : ''}`}
          onClick={onToggleSidebar}
        >
          ★ Saved Presets ({savedCount})
        </button>

        <div className="user-pill">
          <span>{email}</span>
          <button type="button" className="logout-btn" onClick={onLogout}>
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
};
