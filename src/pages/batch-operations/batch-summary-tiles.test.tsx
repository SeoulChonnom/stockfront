import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BatchSummaryTiles } from './batch-summary-tiles';

describe('BatchSummaryTiles', () => {
  it('keeps status tiles in failure-first semantic order with readable labels and counts', () => {
    render(
      <BatchSummaryTiles
        avgDurationSeconds={190}
        failedCount={3}
        partialCount={4}
        successCount={20}
      />
    );

    const group = screen.getByRole('group', { name: '배치 실행 요약' });
    const labels = within(group)
      .getAllByText(/^(실패|부분 실패|성공)$/)
      .map((label) => label.textContent);

    expect(labels).toEqual(['실패', '부분 실패', '성공']);
    expect(within(group).getByText('3')).toBeInTheDocument();
    expect(within(group).getByText('4')).toBeInTheDocument();
    expect(within(group).getByText('20')).toBeInTheDocument();
    expect(within(group).getByText(/평균 소요/)).toHaveTextContent('3분 10초');
  });

  it('uses a compact three-column mobile contract while restoring the desktop grid', () => {
    render(
      <BatchSummaryTiles
        avgDurationSeconds={190}
        failedCount={3}
        partialCount={4}
        successCount={20}
      />
    );

    const group = screen.getByRole('group', { name: '배치 실행 요약' });

    expect(group).toHaveClass('grid-cols-3', 'gap-2');
    expect(group).toHaveClass('min-[641px]:grid-cols-2', 'min-[641px]:gap-3');
    expect(group).toHaveClass('min-[1181px]:grid-cols-3');

    const tiles = Array.from(group.children);
    expect(tiles).toHaveLength(3);
    expect(tiles.map((tile) => tile.textContent)).toEqual([
      expect.stringContaining('실패'),
      expect.stringContaining('부분 실패'),
      expect.stringContaining('성공'),
    ]);
  });
});
