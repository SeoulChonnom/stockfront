import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BatchHistoryEmpty } from './batch-history-empty';

describe('BatchHistoryEmpty', () => {
  it('renders the empty table row and forwards the filter-clear action', async () => {
    const user = userEvent.setup();
    const onClearFilters = vi.fn();

    render(
      <table>
        <tbody>
          <BatchHistoryEmpty onClearFilters={onClearFilters} />
        </tbody>
      </table>
    );

    const row = screen.getByRole('row');
    expect(row.querySelector('td')).toHaveAttribute('colspan', '5');
    expect(screen.getByText('표시할 실행 이력이 없습니다')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '필터 해제' }));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });
});
