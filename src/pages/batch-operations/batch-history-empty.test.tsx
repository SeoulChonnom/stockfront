import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BatchHistoryEmpty } from './batch-history-empty';

describe('BatchHistoryEmpty', () => {
  it.each([
    ['filtered', true],
    ['unfiltered', false],
  ])(
    'offers the filter-clear action for %s results',
    async (_label, hasAppliedFilter) => {
      const user = userEvent.setup();
      const onClearFilters = vi.fn();
      const onAnnounce = vi.fn();
      const clearFilters = () => {
        if (hasAppliedFilter) {
          onAnnounce('상태와 타입 조건을 해제했습니다.');
        }
        onClearFilters();
      };

      render(
        <table>
          <tbody>
            <BatchHistoryEmpty onClearFilters={clearFilters} />
          </tbody>
        </table>
      );

      expect(
        screen.getByText('표시할 실행 이력이 없습니다')
      ).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: '필터 해제' }));
      expect(onClearFilters).toHaveBeenCalledTimes(1);
      expect(onAnnounce).toHaveBeenCalledTimes(hasAppliedFilter ? 1 : 0);
    }
  );
});
