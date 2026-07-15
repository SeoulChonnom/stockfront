import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BatchOperationsFilters } from './batch-operations-filters';

describe('BatchOperationsFilters', () => {
  it('controls the no-status select with the explicit all option', () => {
    render(
      <BatchOperationsFilters
        initialFilters={{ from: '2026-03-01', to: '2026-03-14', status: '' }}
        onApply={vi.fn()}
      />
    );

    const statusSelect = screen.getByRole('combobox', { name: 'Status' });

    expect(statusSelect).toHaveTextContent('ALL STATUSES');
    expect(statusSelect).not.toHaveAttribute('data-placeholder');
  });
});
