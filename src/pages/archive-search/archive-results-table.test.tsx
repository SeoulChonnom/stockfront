import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ArchiveResultsTable } from './archive-results-table';

describe('ArchiveResultsTable', () => {
  it('links duplicate business-date rows with pageId identity', () => {
    render(
      <ArchiveResultsTable
        rows={[
          {
            pageId: 41,
            businessDate: '2026-03-31',
            headline: 'older version',
            status: 'READY',
            generatedAt: '06:12',
            detail: null,
          },
          {
            pageId: 42,
            businessDate: '2026-03-31',
            headline: 'newer version',
            status: 'READY',
            generatedAt: '06:20',
            detail: null,
          },
        ]}
      />
    );

    expect(screen.getByRole('link', { name: 'older version' })).toHaveAttribute(
      'href',
      '/market/archive/2026-03-31?pageId=41'
    );
    expect(screen.getByRole('link', { name: 'newer version' })).toHaveAttribute(
      'href',
      '/market/archive/2026-03-31?pageId=42'
    );
  });
});
