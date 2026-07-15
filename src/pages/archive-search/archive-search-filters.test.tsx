import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ArchiveSearchFilters } from './archive-search-filters';

describe('ArchiveSearchFilters', () => {
  it('controls the no-status select with the explicit all option', () => {
    render(
      <ArchiveSearchFilters
        initialFilters={{ from: '2026-03-01', to: '2026-03-14', status: '' }}
        onApply={vi.fn()}
      />
    );

    const statusSelect = screen.getByRole('combobox', { name: 'Status' });

    expect(statusSelect).toHaveTextContent('All Status');
    expect(statusSelect).not.toHaveAttribute('data-placeholder');
  });
});
