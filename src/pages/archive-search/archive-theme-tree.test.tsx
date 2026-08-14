import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import type { ThemeNodeResponse } from '@/lib/api/types';

import { ArchiveThemeTree } from './archive-theme-tree';

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

  it('blocks the eleventh selection and explains the ten-selection limit', async () => {
    const user = userEvent.setup();
    const nodes = Array.from({ length: 11 }, (_, index) => ({
      code: `THEME_${index}`,
      label: `테마 ${index}`,
      description: `설명 ${index}`,
      children: [],
    })) satisfies ThemeNodeResponse[];
    const { rerender } = render(
      <ArchiveThemeTree
        nodes={nodes}
        onChange={() => undefined}
        selectedCodes={nodes.slice(0, 10).map((node) => node.code)}
      />
    );

    const eleventh = screen.getByRole('checkbox', { name: '테마 10' });
    expect(eleventh).not.toBeChecked();
    await user.click(eleventh);

    expect(eleventh).not.toBeChecked();
    expect(
      screen.getByText(
        '테마는 최대 10개까지 선택할 수 있습니다. 선택한 테마를 해제한 뒤 다시 시도해 주세요.'
      )
    ).toBeInTheDocument();

    rerender(
      <ArchiveThemeTree
        nodes={nodes}
        onChange={() => undefined}
        selectedCodes={nodes.slice(0, 9).map((node) => node.code)}
      />
    );
    expect(
      screen.queryByText(
        '테마는 최대 10개까지 선택할 수 있습니다. 선택한 테마를 해제한 뒤 다시 시도해 주세요.'
      )
    ).not.toBeInTheDocument();
  });
});
