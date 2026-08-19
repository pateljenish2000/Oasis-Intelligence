import React, { useState, useEffect, useCallback } from 'react';
import type { User, SavedView, SavedViewLog, ProductionRecord, SearchResult, EfficiencyReportRecord, SnapshotBenchmark } from '../types';
import { Navbar } from './Navbar';
import { FilterBar } from './FilterBar';
import { AnalyticsView } from './AnalyticsView';
import { SavedViewsSidebar } from './SavedViewsSidebar';
import { AdvancedReportModal } from './AdvancedReportModal';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  apiBase: string;
}

const CHART_PALETTE = [
  '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4', '#14b8a6', '#f97316'
];

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, apiBase }) => {
  const [views, setViews] = useState<SavedView[]>([]);
  const [viewLogs, setViewLogs] = useState<SavedViewLog[]>([]);
  const [logsLoading, setLogsLoading] = useState<boolean>(false);
  const [logsError, setLogsError] = useState<string>('');
  const [cropMap, setCropMap] = useState<Record<number, string>>({});
  const [countryMap, setCountryMap] = useState<Record<number, string>>({});
  const [elementOptions, setElementOptions] = useState<string[]>([]);

  // Exploratory Filter States
  const [selectedElement, setSelectedElement] = useState<string>('');
  const [yearMin, setYearMin] = useState<number>(2000);
  const [yearMax, setYearMax] = useState<number>(2020);
  const [selectedCrops, setSelectedCrops] = useState<Set<number>>(new Set());
  const [selectedCountries, setSelectedCountries] = useState<Set<number>>(new Set());

  // Chart States
  const [chartData, setChartData] = useState<any>(null);
  const [chartLoading, setChartLoading] = useState<boolean>(false);
  const [chartError, setChartError] = useState<string>('');
  const [totalDataPoints, setTotalDataPoints] = useState<number>(0);

  // UI & Modal States
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [reportModalType, setReportModalType] = useState<'efficiency' | 'snapshot' | null>(null);
  const [reportLoading, setReportLoading] = useState<boolean>(false);
  const [efficiencyData, setEfficiencyData] = useState<EfficiencyReportRecord[]>([]);
  const [snapshotBenchmarks, setSnapshotBenchmarks] = useState<SnapshotBenchmark[]>([]);

  const loadLookups = useCallback(async () => {
    try {
      const [cropsRes, countriesRes] = await Promise.all([
        fetch(`${apiBase}/api/crops`),
        fetch(`${apiBase}/api/countries`),
      ]);
      if (cropsRes.ok && countriesRes.ok) {
        const crops = await cropsRes.json();
        const countries = await countriesRes.json();
        const cMap: Record<number, string> = {};
        const coMap: Record<number, string> = {};
        crops.forEach((c: any) => { cMap[c.cropId] = c.cropName; });
        countries.forEach((c: any) => { coMap[c.countryId] = c.countryName; });
        setCropMap(cMap);
        setCountryMap(coMap);

        if (crops.length > 0 && selectedCrops.size === 0) {
          setSelectedCrops(new Set([crops[0].cropId, crops[1]?.cropId || crops[0].cropId]));
        }
        if (countries.length > 0 && selectedCountries.size === 0) {
          setSelectedCountries(new Set([countries[0].countryId, countries[1]?.countryId || countries[0].countryId]));
        }
      }
    } catch (err) {
      console.error('Failed to load lookups', err);
    }
  }, [apiBase, selectedCrops.size, selectedCountries.size]);

  const loadElements = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/elements`);
      if (res.ok) {
        const elList = await res.json();
        setElementOptions(elList);
        if (elList.length > 0 && !selectedElement) {
          setSelectedElement(elList[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load elements', err);
    }
  }, [apiBase, selectedElement]);

  const loadViews = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/views?userId=${user.userId}`);
      if (res.ok) {
        const data = await res.json();
        setViews(data);
      }
    } catch (err) {
      console.error('Failed to load views', err);
    }
  }, [apiBase, user.userId]);

  const loadViewLogs = useCallback(async () => {
    setLogsLoading(true);
    setLogsError('');
    try {
      const res = await fetch(`${apiBase}/api/views/logs?userId=${user.userId}&limit=10`);
      if (!res.ok) throw new Error(`Activity query failed with status ${res.status}`);
      const data: SavedViewLog[] = await res.json();
      setViewLogs(data);
    } catch (err) {
      console.error('Failed to load saved view activity', err);
      setLogsError('Could not load activity. Make sure the trigger SQL has been installed.');
    } finally {
      setLogsLoading(false);
    }
  }, [apiBase, user.userId]);

  useEffect(() => {
    loadLookups();
    loadElements();
    loadViews();
    loadViewLogs();
  }, [loadLookups, loadElements, loadViews, loadViewLogs]);

  // Fetch chart data whenever filters change
  useEffect(() => {
    if (!selectedElement || selectedCrops.size === 0 || selectedCountries.size === 0) {
      setChartData(null);
      setTotalDataPoints(0);
      setChartError('');
      return;
    }

    const minV = Math.min(yearMin, yearMax);
    const maxV = Math.max(yearMin, yearMax);

    const fetchChartData = async () => {
      setChartLoading(true);
      setChartError('');
      try {
        const params = new URLSearchParams({
          cropIds: Array.from(selectedCrops).join(','),
          countryIds: Array.from(selectedCountries).join(','),
          element: selectedElement,
          yearStart: String(minV),
          yearEnd: String(maxV),
        });

        const res = await fetch(`${apiBase}/api/production?${params}`);
        if (!res.ok) throw new Error(`Query failed with status ${res.status}`);
        const rows: ProductionRecord[] = await res.json();

        setTotalDataPoints(rows.length);

        if (rows.length === 0) {
          setChartData(null);
          setChartError('No records matched your exact filters.');
          setChartLoading(false);
          return;
        }

        const seriesMap: Record<string, Record<number, number>> = {};
        rows.forEach((r) => {
          const key = `${r.cropName} (${r.countryName})`;
          if (!seriesMap[key]) seriesMap[key] = {};
          seriesMap[key][r.year] = r.value;
        });

        const years = Array.from(new Set(rows.map((r) => r.year))).sort((a, b) => a - b);
        const datasets = Object.entries(seriesMap).map(([key, yearValues], i) => ({
          label: key,
          data: years.map((y) => (yearValues[y] !== undefined ? yearValues[y] : null)),
          borderColor: CHART_PALETTE[i % CHART_PALETTE.length],
          backgroundColor: CHART_PALETTE[i % CHART_PALETTE.length],
          tension: 0.35,
          spanGaps: true,
          pointRadius: 3,
          pointHoverRadius: 6,
          borderWidth: 2,
        }));

        setChartData({
          labels: years,
          datasets,
        });
      } catch (err: any) {
        console.error('Chart error', err);
        setChartError('Could not compute chart data across network.');
      } finally {
        setChartLoading(false);
      }
    };

    fetchChartData();
  }, [selectedElement, yearMin, yearMax, selectedCrops, selectedCountries, apiBase]);

  const handleCropToggle = (id: number) => {
    const next = new Set(selectedCrops);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedCrops(next);
  };

  const handleCountryToggle = (id: number) => {
    const next = new Set(selectedCountries);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedCountries(next);
  };

  const handleSavePreset = async () => {
    if (!selectedElement || selectedCrops.size === 0 || selectedCountries.size === 0) {
      alert('Please select an element, at least one crop, and one country before saving.');
      return;
    }

    const title = window.prompt('Preset Title:', `${selectedElement} Preset`);
    if (title === null) return;

    try {
      const minV = Math.min(yearMin, yearMax);
      const maxV = Math.max(yearMin, yearMax);
      const res = await fetch(`${apiBase}/api/views`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.userId,
          title: title.trim(),
          filters: {
            element: selectedElement,
            yearRange: [minV, maxV],
            cropIds: Array.from(selectedCrops),
            countryIds: Array.from(selectedCountries),
          },
        }),
      });

      if (!res.ok) throw new Error('Could not save preset');
      await Promise.all([loadViews(), loadViewLogs()]);
      setIsSidebarOpen(true);
    } catch (err) {
      alert('Failed to save preset — check server.');
      console.error(err);
    }
  };

  const handleLoadPreset = (v: SavedView) => {
    const f = v.filters;
    if (f?.element) setSelectedElement(f.element);
    if (f?.yearRange) {
      setYearMin(f.yearRange[0]);
      setYearMax(f.yearRange[1]);
    }
    if (f?.cropIds) setSelectedCrops(new Set(f.cropIds));
    if (f?.countryIds) setSelectedCountries(new Set(f.countryIds));
  };

  const handleDeletePreset = async (v: SavedView) => {
    if (!window.confirm(`Delete preset "${v.title}"?`)) return;
    try {
      const res = await fetch(`${apiBase}/api/views/${v.viewId}?userId=${user.userId}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 204) throw new Error('Could not delete');
      await Promise.all([loadViews(), loadViewLogs()]);
    } catch (err) {
      alert('Could not delete preset');
      console.error(err);
    }
  };

  const handleUpdatePreset = async (v: SavedView, newTitle: string, updateFiltersToActive: boolean) => {
    try {
      const minV = Math.min(yearMin, yearMax);
      const maxV = Math.max(yearMin, yearMax);
      const targetFilters = updateFiltersToActive ? {
        element: selectedElement,
        yearRange: [minV, maxV],
        cropIds: Array.from(selectedCrops),
        countryIds: Array.from(selectedCountries),
      } : v.filters;

      const res = await fetch(`${apiBase}/api/views/${v.viewId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.userId,
          title: newTitle.trim(),
          filters: targetFilters,
        }),
      });

      if (!res.ok) throw new Error('Could not update preset');
      await Promise.all([loadViews(), loadViewLogs()]);
    } catch (err) {
      alert('Failed to update preset.');
      console.error(err);
    }
  };

  const handleSearchResultClick = (item: SearchResult) => {
    if (item.type === 'crop') {
      handleCropToggle(item.id);
    } else if (item.type === 'country') {
      handleCountryToggle(item.id);
    } else if (item.type === 'preset') {
      const found = views.find((v) => v.viewId === item.id);
      if (found) {
        handleLoadPreset(found);
        setIsSidebarOpen(true);
      }
    }
  };

  const handleOpenEfficiencyReport = async () => {
    setReportModalType('efficiency');
    setIsReportModalOpen(true);
    setReportLoading(true);
    try {
      const minV = Math.min(yearMin, yearMax);
      const maxV = Math.max(yearMin, yearMax);
      const res = await fetch(`${apiBase}/api/reports/efficiency?yearStart=${minV}&yearEnd=${maxV}&minYield=2000`);
      if (res.ok) {
        const data = await res.json();
        setEfficiencyData(data);
      }
    } catch (err) {
      console.error('Failed to run efficiency stored procedure:', err);
    } finally {
      setReportLoading(false);
    }
  };

  const handleTakeSnapshot = async () => {
    setReportModalType('snapshot');
    setIsReportModalOpen(true);
    setReportLoading(true);
    try {
      const minV = Math.min(yearMin, yearMax);
      const maxV = Math.max(yearMin, yearMax);
      const res = await fetch(`${apiBase}/api/analytics/snapshot?userId=${user.userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          element: selectedElement,
          yearRange: [minV, maxV],
          cropIds: Array.from(selectedCrops),
          countryIds: Array.from(selectedCountries),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSnapshotBenchmarks(data.benchmarks || []);
        await Promise.all([loadViews(), loadViewLogs()]);
      }
    } catch (err) {
      console.error('Failed to execute snapshot SQL transaction:', err);
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Navbar
        email={user.email}
        onLogout={onLogout}
        savedCount={views.length}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        apiBase={apiBase}
        userId={user.userId}
        onSearchResultClick={handleSearchResultClick}
        onOpenEfficiencyReport={handleOpenEfficiencyReport}
        onTakeSnapshot={handleTakeSnapshot}
      />

      <div className="workspace">
        <main className="main-content">
          <FilterBar
            elementOptions={elementOptions}
            cropMap={cropMap}
            countryMap={countryMap}
            selectedElement={selectedElement}
            onElementChange={setSelectedElement}
            yearMin={yearMin}
            yearMax={yearMax}
            onYearRangeChange={(min, max) => {
              setYearMin(min);
              setYearMax(max);
            }}
            selectedCrops={selectedCrops}
            onCropToggle={handleCropToggle}
            selectedCountries={selectedCountries}
            onCountryToggle={handleCountryToggle}
            onSaveViewClick={handleSavePreset}
          />

          <AnalyticsView
            chartData={chartData}
            loading={chartLoading}
            error={chartError}
            selectedElement={selectedElement}
            selectedCropsCount={selectedCrops.size}
            selectedCountriesCount={selectedCountries.size}
            totalDataPoints={totalDataPoints}
            yearRange={[Math.min(yearMin, yearMax), Math.max(yearMin, yearMax)]}
          />
        </main>

        <SavedViewsSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          views={views}
          onLoadView={handleLoadPreset}
          onDeleteView={handleDeletePreset}
          onUpdateView={handleUpdatePreset}
          logs={viewLogs}
          logsLoading={logsLoading}
          logsError={logsError}
          onRefreshLogs={loadViewLogs}
          cropMap={cropMap}
          countryMap={countryMap}
        />
      </div>

      <AdvancedReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        type={reportModalType}
        loading={reportLoading}
        efficiencyData={efficiencyData}
        snapshotBenchmarks={snapshotBenchmarks}
      />
    </div>
  );
};
