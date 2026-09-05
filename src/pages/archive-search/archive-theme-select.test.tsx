import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

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
});
