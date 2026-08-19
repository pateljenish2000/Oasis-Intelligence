import React from 'react';
import type { EfficiencyReportRecord, SnapshotBenchmark } from '../types';

interface AdvancedReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'efficiency' | 'snapshot' | null;
  loading: boolean;
  efficiencyData: EfficiencyReportRecord[];
  snapshotBenchmarks: SnapshotBenchmark[];
}

export const AdvancedReportModal: React.FC<AdvancedReportModalProps> = ({
  isOpen,
  onClose,
  type,
  loading,
  efficiencyData,
  snapshotBenchmarks,
}) => {
  if (!isOpen || !type) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card advanced-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            {type === 'efficiency' ? '⚡ Crop Yield Efficiency Report' : '📸 Benchmark Snapshot'}
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              Executing database queries...
            </div>
          )}

          {!loading && type === 'efficiency' && (
            <div>
              <p style={{ color: '#8ba89a', fontSize: '0.9rem', marginBottom: '1.2rem' }}>
                Yield efficiency classification across reporting countries (2000–2024):
              </p>
              {efficiencyData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No efficiency records computed.</div>
              ) : (
                <table className="advanced-table">
                  <thead>
                    <tr>
                      <th>Crop</th>
                      <th>Countries</th>
                      <th>Avg Yield (kg/ha)</th>
                      <th>Peak Yield</th>
                      <th>Years</th>
                      <th>Classification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {efficiencyData.map((row) => (
                      <tr key={row.cropId}>
                        <td style={{ fontWeight: 600, color: '#f0f7f4' }}>🌾 {row.cropName}</td>
                        <td>{row.reportingCountries}</td>
                        <td style={{ color: 'var(--accent)' }}>{row.avgYieldKgPerHa.toLocaleString()}</td>
                        <td>{row.peakYieldKgPerHa.toLocaleString()}</td>
                        <td>{row.earliestYear}–{row.latestYear}</td>
                        <td>
                          <span className={`efficiency-badge ${row.efficiencyClassification.toLowerCase().replace(/\s+/g, '-')}`}>
                            {row.efficiencyClassification}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {!loading && type === 'snapshot' && (
            <div>
              <p style={{ color: '#8ba89a', fontSize: '0.9rem', marginBottom: '1.2rem' }}>
                Benchmark averages calculated across all reporting countries and crops (2015–2024):
              </p>
              <div className="snapshot-success-box" style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--accent)', borderRadius: '8px', marginBottom: '1.5rem', color: '#10b981' }}>
                ✓ Snapshot computed and saved to your presets drawer!
              </div>
              <table className="advanced-table">
                <thead>
                  <tr>
                    <th>Metric Element</th>
                    <th>2015–2024 Benchmark Avg</th>
                    <th>Total Reporting Countries</th>
                    <th>Total Crops</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshotBenchmarks.map((b, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, color: '#f0f7f4' }}>{b.element}</td>
                      <td style={{ color: 'var(--accent)' }}>{b.benchmarkAverage.toLocaleString()}</td>
                      <td>{b.totalCountries}</td>
                      <td>{b.totalCrops}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn-primary" onClick={onClose} style={{ maxWidth: '140px' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
