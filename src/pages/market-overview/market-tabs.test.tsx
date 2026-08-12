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

  // WAI-ARIA Authoring Practices' tabs pattern requires the newly selected
  // tab to receive real DOM focus, not just `aria-selected`/roving
  // `tabindex` — a screen-reader or sighted keyboard user must land on the
  // tab they just moved to.
  it('moves DOM focus to the newly selected tab on ArrowRight', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <MarketTabs markets={markets} onSelect={onSelect} selectedIndex={0} />
    );

    const tabs = screen.getAllByRole('tab');
    await user.click(tabs[0]);
    await user.keyboard('{ArrowRight}');

    expect(tabs[1]).toHaveFocus();
  });

  it('moves DOM focus to the newly selected tab on Home/End', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <MarketTabs markets={markets} onSelect={onSelect} selectedIndex={1} />
    );

    const tabs = screen.getAllByRole('tab');
    await user.click(tabs[1]);
    await user.keyboard('{Home}');

    expect(tabs[0]).toHaveFocus();
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

  it('moves selection back with the left arrow key', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <MarketTabs markets={markets} onSelect={onSelect} selectedIndex={1} />
    );

    await user.click(screen.getByRole('tab', { selected: true }));
    await user.keyboard('{ArrowLeft}');

    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it('wraps from the first tab back to the last', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <MarketTabs markets={markets} onSelect={onSelect} selectedIndex={0} />
    );

    await user.click(screen.getByRole('tab', { selected: true }));
    await user.keyboard('{ArrowLeft}');

    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('jumps to the first tab with Home and the last with End', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <MarketTabs markets={markets} onSelect={onSelect} selectedIndex={1} />
    );

    await user.click(screen.getByRole('tab', { selected: true }));
    await user.keyboard('{Home}');
    expect(onSelect).toHaveBeenCalledWith(0);

    await user.keyboard('{End}');
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('keeps only the selected tab in the tab order', () => {
    render(
      <MarketTabs markets={markets} onSelect={vi.fn()} selectedIndex={1} />
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('tabindex', '-1');
    expect(tabs[1]).toHaveAttribute('tabindex', '0');
  });

  // Only the selected panel is mounted, so an unselected tab must not point
  // aria-controls at an id that is absent from the DOM.
  it('points aria-controls only from the selected tab', () => {
    render(
      <MarketTabs markets={markets} onSelect={vi.fn()} selectedIndex={1} />
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).not.toHaveAttribute('aria-controls');
    expect(tabs[1]).toHaveAttribute('aria-controls');
  });

  // The selected tab must survive a greyscale rendering: weight and the
  // presence of the bottom indicator carry the state alongside colour.
  it('signals the selected tab without relying on colour', () => {
    render(
      <MarketTabs markets={markets} onSelect={vi.fn()} selectedIndex={0} />
    );

    const [selected, unselected] = screen.getAllByRole('tab');
    expect(selected).toHaveClass('font-bold');
    expect(unselected).toHaveClass('font-normal');
    expect(selected.className).toContain('border-b-[color:var(--primary)]');
    expect(unselected.className).not.toContain(
      'border-b-[color:var(--primary)]'
    );
  });
});
