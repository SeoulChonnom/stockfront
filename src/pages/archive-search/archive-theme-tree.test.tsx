import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { ThemeNodeResponse } from '@/lib/api/types';

import { ArchiveThemeTree } from '@/pages/archive-search/archive-theme-tree';
import { filterThemeNodes } from '@/pages/archive-search/theme-node-filter';

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
        children: [
          {
            code: 'SECTOR_SEMICONDUCTORS_MEMORY_HBM',
            label: '메모리·HBM',
            description: '메모리와 HBM 공급망',
            children: [],
          },
        ],
      },
    ],
  },
] satisfies ThemeNodeResponse[];

const searchCatalog = [
  {
    code: 'SECTOR',
    label: '업종',
    description: '기업의 주요 사업 영역',
    children: [
      {
        code: 'SECTOR_SEMICONDUCTORS',
        label: '반도체',
        description: '반도체 산업',
        children: [
          {
            code: 'SECTOR_SEMICONDUCTORS_MEMORY_HBM',
            label: '메모리·HBM',
            description: '메모리와 HBM 공급망',
            children: [],
          },
        ],
      },
      {
        code: 'SECTOR_CHEMICALS',
        label: '화학',
        description: 'AI 신소재 밸류체인',
        children: [],
      },
    ],
  },
  {
    code: 'MACRO',
    label: '거시경제',
    description: '금리와 환율',
    children: [],
  },
] satisfies ThemeNodeResponse[];

function ControlledTree({ initial = [] }: { initial?: string[] }) {
  const [selected, setSelected] = useState(initial);
  return (
    <ArchiveThemeTree
      nodes={catalog}
      onChange={setSelected}
      selectedCodes={selected}
    />
  );
}

describe('ArchiveThemeTree', () => {
  it('renders every recursive level with a full hierarchical accessible name', () => {
    render(<ControlledTree />);

    expect(screen.getByRole('checkbox', { name: '업종' })).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: '업종 / 반도체' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: '업종 / 반도체 / 메모리·HBM' })
    ).toBeInTheDocument();
    expect(screen.getByText('메모리와 HBM 공급망')).toBeInTheDocument();
  });

  it('selects parent and child independently while preserving selection order', async () => {
    const user = userEvent.setup();
    render(<ControlledTree />);

    const parent = screen.getByRole('checkbox', { name: '업종' });
    const child = screen.getByRole('checkbox', { name: '업종 / 반도체' });

    await user.click(parent);
    await user.click(child);

    expect(parent).toBeChecked();
    expect(child).toBeChecked();
  });

  // 상한 메시지 자체는 이제 `ArchiveThemeTree`가 그리지 않는다 — 스크롤
  // 컨테이너 밖의 `ThemeSelectPicker` 푸터가 그 역할을 넘겨받았다
  // (`archive-theme-select.test.tsx` 참고). 이 트리는 토글이 막혔다는
  // 사실만 `onLimitBlocked`로 위에 보고하면 된다.
  it('blocks the eleventh selection and reports the block via onLimitBlocked, without rendering the limit message itself', async () => {
    const user = userEvent.setup();
    const onLimitBlocked = vi.fn();
    const nodes = Array.from({ length: 11 }, (_, index) => ({
      code: `THEME_${index}`,
      label: `테마 ${index}`,
      description: `설명 ${index}`,
      children: [],
    })) satisfies ThemeNodeResponse[];
    render(
      <ArchiveThemeTree
        nodes={nodes}
        onChange={() => undefined}
        onLimitBlocked={onLimitBlocked}
        selectedCodes={nodes.slice(0, 10).map((node) => node.code)}
      />
    );

    const eleventh = screen.getByRole('checkbox', { name: '테마 10' });
    expect(eleventh).not.toBeChecked();
    await user.click(eleventh);

    expect(eleventh).not.toBeChecked();
    expect(onLimitBlocked).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByText(
        '테마는 최대 10개까지 선택할 수 있습니다. 선택한 테마를 해제한 뒤 다시 시도해 주세요.'
      )
    ).not.toBeInTheDocument();
  });

  it('matches on label text and keeps every ancestor of the match', () => {
    render(
      <ArchiveThemeTree
        nodes={searchCatalog}
        onChange={() => undefined}
        query='반도체'
        selectedCodes={[]}
      />
    );

    expect(screen.getByRole('checkbox', { name: '업종' })).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: '업종 / 반도체' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: '업종 / 반도체 / 메모리·HBM' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: '업종 / 화학' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: '거시경제' })
    ).not.toBeInTheDocument();
  });

  it('matches on description text even when the label does not match', () => {
    render(
      <ArchiveThemeTree
        nodes={searchCatalog}
        onChange={() => undefined}
        query='ai'
        selectedCodes={[]}
      />
    );

    expect(
      screen.getByRole('checkbox', { name: '업종 / 화학' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: '업종 / 반도체' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: '거시경제' })
    ).not.toBeInTheDocument();
  });

  it('never hides an already-selected node, even without a text match', () => {
    render(
      <ArchiveThemeTree
        nodes={searchCatalog}
        onChange={() => undefined}
        query='존재하지-않는-검색어'
        selectedCodes={['MACRO']}
      />
    );

    expect(
      screen.getByRole('checkbox', { name: '거시경제' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: '업종' })
    ).not.toBeInTheDocument();
  });

  it('shows the no-match message when nothing survives the filter', () => {
    render(
      <ArchiveThemeTree
        nodes={searchCatalog}
        onChange={() => undefined}
        query='존재하지-않는-검색어'
        selectedCodes={[]}
      />
    );

    const message = screen.getByText('일치하는 테마가 없습니다.');
    expect(message).toBeInTheDocument();
    expect(message).toHaveAttribute('role', 'status');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
});

describe('filterThemeNodes', () => {
  it('preserves original hierarchy and ordering of surviving nodes', () => {
    const result = filterThemeNodes(searchCatalog, '반도체', []);

    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('SECTOR');
    expect(result[0].children.map((child) => child.code)).toEqual([
      'SECTOR_SEMICONDUCTORS',
    ]);
    expect(result[0].children[0].children.map((child) => child.code)).toEqual([
      'SECTOR_SEMICONDUCTORS_MEMORY_HBM',
    ]);
  });

  it('returns the catalog unchanged when the query is blank', () => {
    expect(filterThemeNodes(searchCatalog, '   ', [])).toEqual(searchCatalog);
  });
});
