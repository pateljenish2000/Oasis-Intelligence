import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: '#f0f7f4',
        font: { family: 'Plus Jakarta Sans', size: 12, weight: 500 },
        usePointStyle: true,
        pointStyle: 'circle',
      },
    },
    tooltip: {
      backgroundColor: '#12221b',
      titleColor: '#10b981',
      bodyColor: '#f0f7f4',
      borderColor: '#223e31',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
    },
  },
  scales: {
    x: {
      ticks: { color: '#8ba89a', font: { family: 'JetBrains Mono' } },
      grid: { color: 'rgba(34, 62, 49, 0.4)' },
    },
    y: {
      ticks: { color: '#8ba89a', font: { family: 'JetBrains Mono' } },
      grid: { color: 'rgba(34, 62, 49, 0.4)' },
    },
  },
};

interface AnalyticsViewProps {
  chartData: any;
  loading: boolean;
  error: string;
  selectedElement: string;
  selectedCropsCount: number;
  selectedCountriesCount: number;
  totalDataPoints: number;
  yearRange: [number, number];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  chartData,
  loading,
  error,
  selectedElement,
  selectedCropsCount,
  selectedCountriesCount,
  totalDataPoints,
  yearRange,
}) => {
  // Calculate trends and volatility
  const analyticsInsights = useMemo(() => {
    if (!chartData || !chartData.datasets || chartData.datasets.length === 0 || !chartData.labels) {
      return null;
    }

    const years = chartData.labels.map(Number);
    const datasets = chartData.datasets;

    const insights = datasets.map((ds: any) => {
      const validPoints: { x: number; y: number }[] = [];
      ds.data.forEach((val: number | null, i: number) => {
        if (val !== null && !isNaN(val)) {
          validPoints.push({ x: years[i], y: val });
        }
      });

      if (validPoints.length < 2) return null;

      // Linear regression
      const n = validPoints.length;
      const sumX = validPoints.reduce((acc, p) => acc + p.x, 0);
      const sumY = validPoints.reduce((acc, p) => acc + p.y, 0);
      const sumXY = validPoints.reduce((acc, p) => acc + p.x * p.y, 0);
      const sumXX = validPoints.reduce((acc, p) => acc + p.x * p.x, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      // Volatility and deviation
      const meanY = sumY / n;
      const variance = validPoints.reduce((acc, p) => acc + Math.pow(p.y - meanY, 2), 0) / n;
      const stdDev = Math.sqrt(variance);
      const cv = meanY > 0 ? (stdDev / meanY) * 100 : 0;

      // Future forecast
      const forecast2030 = Math.max(0, slope * 2030 + intercept);
      const latestVal = validPoints[validPoints.length - 1].y;
      const percentGrowth = latestVal > 0 ? ((forecast2030 - latestVal) / latestVal) * 100 : 0;

      return {
        label: ds.label,
        slope,
        mean: meanY,
        stdDev,
        volatilityCV: cv.toFixed(1),
        forecast2030: forecast2030.toLocaleString(undefined, { maximumFractionDigits: 1 }),
        percentGrowth: percentGrowth.toFixed(1),
        isAnomalous: cv > 35.0,
      };
    }).filter(Boolean);

    return insights;
  }, [chartData]);

  return (
    <div className="analytics-card">
      <div className="analytics-header">
        <div className="analytics-title">
          <h2>{selectedElement || 'Select a Metric'}</h2>
          <div className="analytics-subtitle">
            Temporal trends spanning {yearRange[0]} to {yearRange[1]} across {selectedCropsCount} crop{selectedCropsCount === 1 ? '' : 's'} and {selectedCountriesCount} {selectedCountriesCount === 1 ? 'country' : 'countries'}
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-box">
            <div className="stat-label">Series Count</div>
            <div className="stat-value">
              {chartData?.datasets ? chartData.datasets.length : 0}
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Data Points</div>
            <div className="stat-value">{totalDataPoints}</div>
          </div>
        </div>
      </div>

      <div className="chart-container">
        {loading && (
          <div className="chart-message">
            <span>●</span> Computing query & rendering chart...
          </div>
        )}

        {!loading && error && (
          <div className="chart-message chart-error">
            <span>⚠️</span> {error}
          </div>
        )}

        {!loading && !error && !chartData && (
          <div className="chart-message">
            <span>📊</span> Select at least one crop and country above to visualize trends.
          </div>
        )}

        {!loading && !error && chartData && (
          <Line data={chartData} options={chartOptions} />
        )}
      </div>

      {/* Dynamic projections */}
      {!loading && !error && analyticsInsights && analyticsInsights.length > 0 && (
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(34, 62, 49, 0.6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#10b981', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              ⚡ Trend Projections
            </span>
            <span style={{ fontSize: '0.75rem', color: '#8ba89a' }}>
              Linear regression & volatility analysis
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {analyticsInsights.map((insight: any, idx: number) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(18, 34, 27, 0.7)',
                  border: insight.isAnomalous ? '1px solid rgba(239, 68, 68, 0.6)' : '1px solid rgba(34, 62, 49, 0.8)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#f0f7f4' }}>{insight.label}</span>
                  {insight.isAnomalous && (
                    <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      ⚠️ High Volatility
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#8ba89a', marginTop: '4px' }}>
                  <span>2030 Forecast: <strong style={{ color: '#10b981' }}>{insight.forecast2030}</strong></span>
                  <span>Proj. Trajectory: <strong style={{ color: Number(insight.percentGrowth) >= 0 ? '#10b981' : '#ef4444' }}>{Number(insight.percentGrowth) >= 0 ? `+${insight.percentGrowth}%` : `${insight.percentGrowth}%`}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
