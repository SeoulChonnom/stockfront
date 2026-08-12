import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { MarketTabs } from './market-tabs';

const markets = [
  { label: '미국 증시', marketType: 'US' },
  { label: '한국 증시', marketType: 'KR' },
] as never;

describe('MarketTabs', () => {
  it('exposes one tablist with a selected tab', () => {
    render(
      <MarketTabs markets={markets} onSelect={vi.fn()} selectedIndex={0} />
    );

    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent(
      '미국 증시'
    );
  });

  it('moves selection with the right arrow key', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <MarketTabs markets={markets} onSelect={onSelect} selectedIndex={0} />
    );

    await user.click(screen.getByRole('tab', { selected: true }));
    await user.keyboard('{ArrowRight}');

    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('wraps from the last tab to the first', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <MarketTabs markets={markets} onSelect={onSelect} selectedIndex={1} />
    );

    await user.click(screen.getByRole('tab', { selected: true }));
    await user.keyboard('{ArrowRight}');

    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it('keeps only the selected tab in the tab order', () => {
    render(
      <MarketTabs markets={markets} onSelect={vi.fn()} selectedIndex={1} />
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('tabindex', '-1');
    expect(tabs[1]).toHaveAttribute('tabindex', '0');
  });
});
