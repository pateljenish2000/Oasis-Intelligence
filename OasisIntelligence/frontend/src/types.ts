export interface User {
  userId: number;
  email: string;
}

export interface SavedViewFilters {
  element: string;
  yearRange: [number, number];
  cropIds: number[];
  countryIds: number[];
}

export interface SavedView {
  viewId: number;
  userId: number;
  title: string;
  filters: SavedViewFilters;
}

export interface SavedViewLog {
  logId: number;
  viewId: number;
  userId: number;
  actionType: 'CREATE' | 'UPDATE' | 'DELETE';
  actionTime: string;
  message: string;
}


export interface ProductionRecord {
  recordId: number;
  cropName: string;
  countryName: string;
  element: string;
  unit: string;
  value: number;
  year: number;
}

export interface LookupItem {
  id: number;
  name: string;
}

export interface SearchResult {
  type: 'crop' | 'country' | 'preset';
  id: number;
  title: string;
  subtitle?: string;
}

export interface EfficiencyReportRecord {
  cropId: number;
  cropName: string;
  reportingCountries: number;
  avgYieldKgPerHa: number;
  peakYieldKgPerHa: number;
  earliestYear: number;
  latestYear: number;
  efficiencyClassification: 'High Efficiency' | 'Moderate Efficiency' | 'Developing Efficiency';
}

export interface SnapshotBenchmark {
  element: string;
  benchmarkAverage: number;
  totalCountries: number;
  totalCrops: number;
}
