import { XIcon } from 'lucide-react';

import { ToneBadge } from '@/components/domain/tone-badge';
import { Button } from '@/components/ui/button';
import type { ThemeNodeResponse } from '@/lib/api/types';

import {
  getMarketSummaryLabel,
  getStatusSummaryLabel,
} from '@/pages/archive-search/filter-copy';

function findThemeLabel(
  nodes: readonly ThemeNodeResponse[],
  code: string
): string | null {
  for (const node of nodes) {
    if (node.code === code) {
      return node.label;
    }

    const childLabel = findThemeLabel(node.children, code);
    if (childLabel) {
      return childLabel;
    }
  }

  return null;
}

export type ArchiveFilterChipsProps = {
  applied: {
    from: string;
    to: string;
    status: string;
    market: string;
    themes: readonly string[];
    q: string;
  };
  themeCatalog: readonly ThemeNodeResponse[];
  onRemoveStatus: () => void;
  onRemoveMarket: () => void;
  onRemoveTheme: (code: string) => void;
  onRemoveQuery: () => void;
  onResetAll: () => void;
};

function RemovableChip({
  label,
  removeLabel,
  onRemove,
}: {
  label: string;
  removeLabel: string;
  onRemove: () => void;
}) {
  return (
    <li>
      <ToneBadge className='py-0.5 pr-0.5' size='compact' tone='info'>
        {label}
        <button
          aria-label={removeLabel}
          className='tap-target -my-0.5 -mr-0.5 rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
          onClick={onRemove}
          type='button'
        >
          <XIcon className='size-3' />
        </button>
      </ToneBadge>
    </li>
  );
}

/**
 * 필터 카드 헤더와 결과 카드 헤더에 각각 흩어져 있던 세 개의 요약 문자열을
 * 대체하는 단일 칩 목록. 기준일은 이 화면에서 항상 의미가 있고 해제할
 * 대상도 아니므로 제거 버튼 없는 첫 칩으로 고정한다.
 */
export function ArchiveFilterChips({
  applied,
  themeCatalog,
  onRemoveStatus,
  onRemoveMarket,
  onRemoveTheme,
  onRemoveQuery,
  onResetAll,
}: ArchiveFilterChipsProps) {
  const hasRemovable =
    Boolean(applied.status) ||
    Boolean(applied.market) ||
    applied.themes.length > 0 ||
    Boolean(applied.q);

  return (
    <ul
      aria-label='적용된 필터'
      className='m-0 flex list-none flex-wrap items-center gap-1.5 p-0'
    >
      <li>
        <ToneBadge className='tnum' size='compact' tone='neutral'>
          {applied.from} ~ {applied.to}
        </ToneBadge>
      </li>
      {applied.status ? (
        <RemovableChip
          label={getStatusSummaryLabel(applied.status)}
          onRemove={onRemoveStatus}
          removeLabel={`${getStatusSummaryLabel(applied.status)} 필터 해제`}
        />
      ) : null}
      {applied.market ? (
        <RemovableChip
          label={`시장 ${getMarketSummaryLabel(applied.market)}`}
          onRemove={onRemoveMarket}
          removeLabel={`시장 ${getMarketSummaryLabel(applied.market)} 필터 해제`}
        />
      ) : null}
      {applied.themes.map((code) => {
        const label = findThemeLabel(themeCatalog, code) ?? code;
        return (
          <RemovableChip
            key={code}
            label={`테마 ${label}`}
            onRemove={() => onRemoveTheme(code)}
            removeLabel={`테마 ${label} 필터 해제`}
          />
        );
      })}
      {applied.q ? (
        <RemovableChip
          label={`검색어 "${applied.q}"`}
          onRemove={onRemoveQuery}
          removeLabel='검색어 필터 해제'
        />
      ) : null}
      {hasRemovable ? (
        <li>
          <Button onClick={onResetAll} size='sm' type='button' variant='ghost'>
            전체 해제
          </Button>
        </li>
      ) : null}
    </ul>
  );
}
