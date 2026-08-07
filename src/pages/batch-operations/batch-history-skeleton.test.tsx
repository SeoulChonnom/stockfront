import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BatchHistorySkeleton } from './batch-history-skeleton';

describe('BatchHistorySkeleton', () => {
  it('renders local aria-hidden rows directly inside the caller table body', () => {
    const { container } = render(
      <table>
        <tbody>
          <BatchHistorySkeleton />
        </tbody>
      </table>
    );

    expect(container.querySelectorAll('table')).toHaveLength(1);
    expect(container.querySelectorAll('tbody > tr')).toHaveLength(5);
    expect(
      Array.from(container.querySelectorAll('tbody > tr')).every(
        (row) => row.getAttribute('aria-hidden') === 'true'
      )
    ).toBe(true);
    expect(
      container.querySelectorAll('tbody > tr:first-child > td')
    ).toHaveLength(5);
  });
});
