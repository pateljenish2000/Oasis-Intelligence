import React from 'react';

interface FilterBarProps {
  elementOptions: string[];
  cropMap: Record<number, string>;
  countryMap: Record<number, string>;
  selectedElement: string;
  onElementChange: (el: string) => void;
  yearMin: number;
  yearMax: number;
  onYearRangeChange: (min: number, max: number) => void;
  selectedCrops: Set<number>;
  onCropToggle: (id: number) => void;
  selectedCountries: Set<number>;
  onCountryToggle: (id: number) => void;
  onSaveViewClick: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  elementOptions,
  cropMap,
  countryMap,
  selectedElement,
  onElementChange,
  yearMin,
  yearMax,
  onYearRangeChange,
  selectedCrops,
  onCropToggle,
  selectedCountries,
  onCountryToggle,
  onSaveViewClick,
}) => {
  return (
    <div className="filter-card">
      <div className="filter-header">
        <div className="filter-title">
          <span>●</span> Live Exploratory Filters
        </div>
        <button type="button" className="btn-save-view" onClick={onSaveViewClick}>
          + Save as Preset
        </button>
      </div>

      <div className="filter-controls">
        <div className="control-item">
          <label className="control-label">Metric / Element</label>
          <select
            className="select-field"
            value={selectedElement}
            onChange={(e) => onElementChange(e.target.value)}
          >
            {elementOptions.map((el) => (
              <option key={el} value={el}>
                {el}
              </option>
            ))}
            {elementOptions.length === 0 && <option value="">Loading metrics...</option>}
          </select>
        </div>

        <div className="control-item">
          <label className="control-label">Year Range</label>
          <div className="year-range-inputs">
            <input
              type="number"
              className="year-input"
              min={1990}
              max={2024}
              value={yearMin}
              onChange={(e) => onYearRangeChange(parseInt(e.target.value, 10) || 1990, yearMax)}
            />
            <span className="range-separator">–</span>
            <input
              type="number"
              className="year-input"
              min={1990}
              max={2024}
              value={yearMax}
              onChange={(e) => onYearRangeChange(yearMin, parseInt(e.target.value, 10) || 2024)}
            />
          </div>
        </div>

        <div className="control-item">
          <label className="control-label">
            Selected Crops ({selectedCrops.size})
          </label>
          <div className="chip-select-box">
            {Object.entries(cropMap).map(([idStr, name]) => {
              const id = parseInt(idStr);
              const isSelected = selectedCrops.has(id);
              return (
                <div
                  key={id}
                  className={`filter-chip ${isSelected ? 'selected' : ''}`}
                  onClick={() => onCropToggle(id)}
                >
                  {name}
                </div>
              );
            })}
          </div>
        </div>

        <div className="control-item">
          <label className="control-label">
            Selected Countries ({selectedCountries.size})
          </label>
          <div className="chip-select-box">
            {Object.entries(countryMap).map(([idStr, name]) => {
              const id = parseInt(idStr);
              const isSelected = selectedCountries.has(id);
              return (
                <div
                  key={id}
                  className={`filter-chip ${isSelected ? 'selected' : ''}`}
                  onClick={() => onCountryToggle(id)}
                >
                  {name}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
