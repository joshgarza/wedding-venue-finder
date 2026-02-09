import React from 'react';
import type { SortOption } from '../types';

interface SortDropdownProps {
  value: SortOption;
  onChange: (sort: SortOption) => void;
  hasLocation?: boolean;
}

const sortOptions: { value: SortOption; label: string; requiresLocation?: boolean }[] = [
  { value: 'taste_score', label: 'Best Match' },
  { value: 'pricing_tier', label: 'Price' },
  { value: 'distance', label: 'Distance', requiresLocation: true },
];

export function SortDropdown({ value, onChange, hasLocation }: SortDropdownProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <label htmlFor="sort-select" style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>
        Sort by:
      </label>
      <select
        id="sort-select"
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        style={{
          padding: '8px 12px',
          borderRadius: 8,
          border: '1px solid #e5e7eb',
          background: 'white',
          fontSize: 14,
          cursor: 'pointer',
        }}
      >
        {sortOptions.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.requiresLocation && !hasLocation}
          >
            {option.label}
            {option.requiresLocation && !hasLocation ? ' (requires location)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
