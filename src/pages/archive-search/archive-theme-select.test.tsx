import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ThemeNodeResponse } from '@/lib/api/types';

import { ArchiveThemeSelect } from '@/pages/archive-search/archive-theme-select';

const catalog = [
  {
    code: 'SECTOR',
    label: '업종',
    description: '기업의 주요 사업 영역',
    children: [
      {
        code: 'SECTOR_SEMICONDUCTORS',
        label: '반도체',
        description: '반도체 산업',
        children: [],
      },
      {
        code: 'SECTOR_CHEMICALS',
        label: '화학',
        description: '화학 소재 산업',
        children: [],
      },
    ],
  },
] satisfies ThemeNodeResponse[];

function ControlledSelect({ initial = [] }: { initial?: string[] }) {
  const [selected, setSelected] = useState(initial);
  return (
    <ArchiveThemeSelect
      catalog={catalog}
      onChange={setSelected}
      selectedCodes={selected}
    />
  );
}

describe('ArchiveThemeSelect', () => {
  it('shows "테마 전체" on the trigger when nothing is selected', () => {
    render(
      <ArchiveThemeSelect
        catalog={catalog}
        onChange={vi.fn()}
        selectedCodes={[]}
      />
    );

    expect(
      screen.getByRole('button', { name: /테마 전체/ })
    ).toBeInTheDocument();
  });

  it('shows the selected count on the trigger for one selection', () => {
    render(
      <ArchiveThemeSelect
        catalog={catalog}
        onChange={vi.fn()}
        selectedCodes={['SECTOR']}
      />
    );

    expect(
      screen.getByRole('button', { name: '테마 1개 선택' })
    ).toBeInTheDocument();
  });

  it('shows the selected count on the trigger for three selections', () => {
    render(
      <ArchiveThemeSelect
        catalog={catalog}
        onChange={vi.fn()}
        selectedCodes={['SECTOR', 'SECTOR_SEMICONDUCTORS', 'SECTOR_CHEMICALS']}
      />
    );

    expect(
      screen.getByRole('button', { name: '테마 3개 선택' })
    ).toBeInTheDocument();
  });

  it('reveals the checkbox tree when the trigger opens the popover', async () => {
    const user = userEvent.setup();
    render(<ControlledSelect />);

    await user.click(screen.getByRole('button', { name: /테마 전체/ }));

    expect(screen.getByRole('checkbox', { name: '업종' })).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: '업종 / 반도체' })
    ).toBeInTheDocument();
  });

  it('renders the picker inside a dialog on the wide (default jsdom) branch', async () => {
    const user = userEvent.setup();
    render(<ControlledSelect />);

    await user.click(screen.getByRole('button', { name: /테마 전체/ }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('narrows the visible checkboxes as the search input changes', async () => {
    const user = userEvent.setup();
    render(<ControlledSelect />);

    await user.click(screen.getByRole('button', { name: /테마 전체/ }));
    await user.type(
      screen.getByRole('searchbox', { name: '테마 이름으로 좁히기' }),
      '반도체'
    );

    expect(
      screen.getByRole('checkbox', { name: '업종 / 반도체' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: '업종 / 화학' })
    ).not.toBeInTheDocument();
  });

  it('calls onChange with the ticked code when a checkbox is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ArchiveThemeSelect
        catalog={catalog}
        onChange={onChange}
        selectedCodes={[]}
      />
    );

    await user.click(screen.getByRole('button', { name: /테마 전체/ }));
    await user.click(screen.getByRole('checkbox', { name: '업종' }));

    expect(onChange).toHaveBeenCalledWith(['SECTOR']);
  });

  it('clears every selection when "선택 해제" is clicked, and hides it at zero selections', async () => {
    const user = userEvent.setup();
    render(<ControlledSelect initial={['SECTOR']} />);

    await user.click(screen.getByRole('button', { name: '테마 1개 선택' }));
    expect(
      screen.getByRole('button', { name: '선택 해제' })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '선택 해제' }));

    expect(
      screen.queryByRole('button', { name: '선택 해제' })
    ).not.toBeInTheDocument();
  });

  it('renders the loading copy while the catalog is loading', async () => {
    const user = userEvent.setup();
    render(
      <ArchiveThemeSelect
        catalog={[]}
        isLoading
        onChange={vi.fn()}
        selectedCodes={[]}
      />
    );

    await user.click(screen.getByRole('button', { name: /테마 전체/ }));

    expect(
      screen.getByText('테마 목록을 불러오는 중입니다.')
    ).toBeInTheDocument();
  });

  it('renders the error copy and wires the retry button', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <ArchiveThemeSelect
        catalog={[]}
        error={new Error('network')}
        onChange={vi.fn()}
        onRetry={onRetry}
        selectedCodes={[]}
      />
    );

    await user.click(screen.getByRole('button', { name: /테마 전체/ }));

    expect(
      screen.getByText('테마 목록을 불러오지 못했습니다.')
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '테마 다시 시도' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  describe('theme cap warning placement', () => {
    const manyThemes = Array.from({ length: 11 }, (_, index) => ({
      code: `THEME_${index}`,
      label: `테마 ${index}`,
      description: `설명 ${index}`,
      children: [],
    })) satisfies ThemeNodeResponse[];

    const LIMIT_MESSAGE =
      '테마는 최대 10개까지 선택할 수 있습니다. 선택한 테마를 해제한 뒤 다시 시도해 주세요.';

    it('surfaces the cap message in the always-visible footer, outside the scrollable tree container, and clears it once the selection drops below the cap', async () => {
      const user = userEvent.setup();

      function ControlledManySelect() {
        const [selected, setSelected] = useState(
          manyThemes.slice(0, 10).map((node) => node.code)
        );
        return (
          <ArchiveThemeSelect
            catalog={manyThemes}
            onChange={setSelected}
            selectedCodes={selected}
          />
        );
      }

      render(<ControlledManySelect />);

      await user.click(screen.getByRole('button', { name: '테마 10개 선택' }));

      const eleventh = screen.getByRole('checkbox', { name: '테마 10' });
      await user.click(eleventh);

      const message = screen.getByText(LIMIT_MESSAGE);
      expect(message).toBeInTheDocument();
      expect(message).toHaveAttribute('role', 'status');

      // The footer (선택 해제/count row) is outside the scrollable tree
      // container (`max-h-[300px] overflow-y-auto`), while the message
      // must sit in that same footer, not inside the scroll container.
      const scrollContainer = document.querySelector(
        '[class*="overflow-y-auto"]'
      );
      expect(scrollContainer).not.toBeNull();
      expect(scrollContainer?.contains(message)).toBe(false);
      const footer = screen
        .getByText('10개 선택됨')
        .closest('div')?.parentElement;
      expect(footer?.contains(message)).toBe(true);

      // Clear one selection (drop below the cap) — the message must clear.
      await user.click(screen.getByRole('checkbox', { name: '테마 0' }));
      expect(screen.queryByText(LIMIT_MESSAGE)).not.toBeInTheDocument();
    });
  });

  it('renders the empty-catalog copy when there are no themes to pick', async () => {
    const user = userEvent.setup();
    render(
      <ArchiveThemeSelect catalog={[]} onChange={vi.fn()} selectedCodes={[]} />
    );

    await user.click(screen.getByRole('button', { name: /테마 전체/ }));

    expect(
      screen.getByText('선택할 수 있는 테마가 없습니다.')
    ).toBeInTheDocument();
  });

  // `useIsWide`(`(min-width: 641px)`)가 없는 matchMedia에서 넓은 화면으로
  // 친다 — 좁은 branch를 테스트하려면 해당 쿼리가 `matches: false`를
  // 돌려주도록 직접 스텁해야 한다. `App.test.tsx`가 쓰는 것과 같은
  // `vi.stubGlobal('matchMedia', ...)` 방식을 그대로 따른다.
  describe('narrow branch (< 641px)', () => {
    function mockNarrowViewport() {
      vi.stubGlobal(
        'matchMedia',
        vi.fn().mockImplementation((query: string) => ({
          matches: false,
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }))
      );
    }

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('renders the trigger with aria-expanded=false and no dialog until opened', () => {
      mockNarrowViewport();
      render(<ControlledSelect />);

      const trigger = screen.getByRole('button', { name: /테마 전체/ });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).toHaveAttribute('aria-controls');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('opens the picker inline (no dialog) and toggles aria-expanded', async () => {
      const user = userEvent.setup();
      mockNarrowViewport();
      render(<ControlledSelect />);

      const trigger = screen.getByRole('button', { name: /테마 전체/ });
      await user.click(trigger);

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(
        screen.getByRole('checkbox', { name: '업종' })
      ).toBeInTheDocument();
    });

    it('Escape while focus is inside the panel closes it and returns focus to the trigger', async () => {
      const user = userEvent.setup();
      mockNarrowViewport();
      render(<ControlledSelect />);

      const trigger = screen.getByRole('button', { name: /테마 전체/ });
      await user.click(trigger);

      const searchInput = screen.getByRole('searchbox', {
        name: '테마 이름으로 좁히기',
      });
      searchInput.focus();

      await user.keyboard('{Escape}');

      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(
        screen.queryByRole('searchbox', { name: '테마 이름으로 좁히기' })
      ).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });

    it('still shows the 10-item cap warning in the footer, outside the scrollable tree', async () => {
      const user = userEvent.setup();
      mockNarrowViewport();

      const manyThemes = Array.from({ length: 11 }, (_, index) => ({
        code: `THEME_${index}`,
        label: `테마 ${index}`,
        description: `설명 ${index}`,
        children: [],
      })) satisfies ThemeNodeResponse[];
      const LIMIT_MESSAGE =
        '테마는 최대 10개까지 선택할 수 있습니다. 선택한 테마를 해제한 뒤 다시 시도해 주세요.';

      function ControlledManySelect() {
        const [selected, setSelected] = useState(
          manyThemes.slice(0, 10).map((node) => node.code)
        );
        return (
          <ArchiveThemeSelect
            catalog={manyThemes}
            onChange={setSelected}
            selectedCodes={selected}
          />
        );
      }

      render(<ControlledManySelect />);

      await user.click(screen.getByRole('button', { name: '테마 10개 선택' }));
      await user.click(screen.getByRole('checkbox', { name: '테마 10' }));

      const message = screen.getByText(LIMIT_MESSAGE);
      expect(message).toBeInTheDocument();

      const scrollContainer = document.querySelector(
        '[class*="overflow-y-auto"]'
      );
      expect(scrollContainer).not.toBeNull();
      expect(scrollContainer?.contains(message)).toBe(false);
    });
  });
});
