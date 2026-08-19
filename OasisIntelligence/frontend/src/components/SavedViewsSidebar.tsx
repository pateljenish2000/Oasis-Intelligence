import React, { useState } from 'react';
import type { SavedView, SavedViewLog } from '../types';

interface SavedViewsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  views: SavedView[];
  onLoadView: (view: SavedView) => void;
  onDeleteView: (view: SavedView) => void;
  onUpdateView: (view: SavedView, newTitle: string, updateFiltersToActive: boolean) => void;
  logs: SavedViewLog[];
  logsLoading: boolean;
  logsError: string;
  onRefreshLogs: () => void;
  cropMap: Record<number, string>;
  countryMap: Record<number, string>;
}

export const SavedViewsSidebar: React.FC<SavedViewsSidebarProps> = ({
  isOpen,
  onClose,
  views,
  onLoadView,
  onDeleteView,
  onUpdateView,
  logs,
  logsLoading,
  logsError,
  onRefreshLogs,
  cropMap,
  countryMap,
}) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [updateFiltersFlag, setUpdateFiltersFlag] = useState<boolean>(false);

  if (!isOpen) return null;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">Saved Presets</div>
        <button type="button" className="sidebar-close" onClick={onClose} aria-label="Close drawer">
          ×
        </button>
      </div>

      <div className="saved-list">
        {views.length === 0 && (
          <div className="sidebar-empty-message">
            No saved presets yet. Use "+ Save as Preset" on your active filters to create one.
          </div>
        )}

        {views.map((v) => {
          const f = v.filters;
          const isEditing = editingId === v.viewId;
          const cropsLabel = f?.cropIds?.map((id) => cropMap[id] || `#${id}`).slice(0, 2).join(', ');
          const countriesLabel = f?.countryIds?.map((id) => countryMap[id] || `#${id}`).slice(0, 2).join(', ');

          return (
            <div
              key={v.viewId}
              className="saved-item"
              onClick={() => {
                if (!isEditing) {
                  onLoadView(v);
                  onClose();
                }
              }}
            >
              <div className="saved-item-header">
                {isEditing ? (
                  <div className="saved-edit-box" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      className="saved-edit-input"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      autoFocus
                    />
                    <label className="saved-edit-checkbox">
                      <input
                        type="checkbox"
                        checked={updateFiltersFlag}
                        onChange={(e) => setUpdateFiltersFlag(e.target.checked)}
                      />
                      Sync to active filters
                    </label>
                    <div className="saved-edit-actions">
                      <button
                        type="button"
                        className="btn-save-inline"
                        onClick={() => {
                          onUpdateView(v, editTitle.trim() || v.title, updateFiltersFlag);
                          setEditingId(null);
                        }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="btn-cancel-inline"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="saved-item-title">{v.title}</div>
                    <div className="saved-item-buttons">
                      <button
                        type="button"
                        className="btn-edit-saved"
                        title="Edit Preset"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(v.viewId);
                          setEditTitle(v.title);
                          setUpdateFiltersFlag(false);
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="btn-delete-saved"
                        title="Delete Preset"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteView(v);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </>
                )}
              </div>

              {!isEditing && (
                <div className="saved-tags">
                  {f?.element && <span className="saved-tag">{f.element}</span>}
                  {f?.yearRange && (
                    <span className="saved-tag">
                      {f.yearRange[0]}–{f.yearRange[1]}
                    </span>
                  )}
                  {cropsLabel && <span className="saved-tag">🌾 {cropsLabel}</span>}
                  {countriesLabel && <span className="saved-tag">🌍 {countriesLabel}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <section className="activity-panel" aria-labelledby="activity-title">
        <div className="activity-header">
          <div>
            <div id="activity-title" className="activity-title">Recent Activity</div>
            <div className="activity-subtitle">Generated automatically by MySQL triggers</div>
          </div>
          <button
            type="button"
            className="activity-refresh"
            onClick={onRefreshLogs}
            disabled={logsLoading}
          >
            {logsLoading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
        {logsError && <div className="activity-error">{logsError}</div>}
        {!logsError && !logsLoading && logs.length === 0 && (
          <div className="activity-empty">No saved-view activity has been logged yet.</div>
        )}
        <div className="activity-list">
          {logs.map((log) => (
            <div key={log.logId} className="activity-item">
              <div className="activity-item-header">
                <span className={`activity-badge activity-badge-${log.actionType.toLowerCase()}`}>
                  {log.actionType}
                </span>
                <time dateTime={log.actionTime}>
                  {new Date(log.actionTime).toLocaleString()}
                </time>
              </div>
              <div className="activity-message">{log.message}</div>
              <div className="activity-view-id">View #{log.viewId}</div>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
};
