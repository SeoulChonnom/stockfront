import type { ReactNode, Ref } from 'react';
import { BatchTypeBadge } from '@/components/domain/batch-type-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/domain/data-table';
import { TableScrollWrapper } from '@/components/domain/table-scroll-wrapper';
import { StatusBadge } from '@/components/state';
import type { BatchRunRow } from '@/lib/query-hooks';
import { cn } from '@/lib/utils';

import { getSnapshotLabel } from '@/pages/batch-operations/format-batch';

export type BatchHistoryTableProps = {
  rows: BatchRunRow[];
  selectedJobId: number | null;
  selectedRowButtonRef?: Ref<HTMLButtonElement>;
  onSelectRow: (jobId: number) => void;
  isLoading: boolean;
  children?: ReactNode;
};

export function BatchHistoryTable({
  rows,
  selectedJobId,
  selectedRowButtonRef,
  onSelectRow,
  isLoading,
  children,
}: BatchHistoryTableProps) {
  return (
    <TableScrollWrapper label='배치 실행 이력 표'>
      <Table aria-busy={isLoading} className='min-w-[520px]'>
        <TableHeader>
          <TableRow>
            <TableHead className='h-auto py-[9px] pl-4 sm:pl-[18px]'>
              작업 · 기준일
            </TableHead>
            <TableHead className='hidden h-auto min-[641px]:table-cell'>
              타입
            </TableHead>
            <TableHead className='h-auto'>상태</TableHead>
            <TableHead className='h-auto text-right'>소요</TableHead>
            <TableHead className='hidden h-auto py-[9px] pr-4 text-right whitespace-nowrap min-[1181px]:table-cell sm:pr-[18px]'>
              원문/정제/이슈
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {children ??
            rows.map((row) => (
              <BatchHistoryRow
                buttonRef={
                  row.id === selectedJobId ? selectedRowButtonRef : undefined
                }
                isSelected={row.id === selectedJobId}
                key={row.id}
                onSelect={() => onSelectRow(row.id)}
                row={row}
              />
            ))}
        </TableBody>
      </Table>
    </TableScrollWrapper>
  );
}

function BatchHistoryRow({
  buttonRef,
  row,
  isSelected,
  onSelect,
}: {
  buttonRef?: Ref<HTMLButtonElement>;
  row: BatchRunRow;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isFailed = row.rawStatus.trim().toUpperCase() === 'FAILED';

  return (
    // Keep the row hit area while preventing the inner keyboard button from firing twice.
    // 선택 강조는 레지스트리 기본 `data-[state=selected]:bg-muted`보다 진하게
    // 잡아야 한다 — hover가 `bg-muted/50`이라 알파값만으로는 마스터-디테일
    // 화면에서 선택 행이 눈에 띄지 않는다. `bg-primary-soft` + 좌측
    // `--primary` 바로 올리고, hover에도 같은 배경을 고정해 선택 표시가
    // 씻기지 않게 한다. danger(실패) 톤의 좌측 바는 선택 행에서는 가려야
    // 하므로 `not-data-[state=selected]:` 가드를 명시한다 — 두 `shadow-*`
    // 유틸의 등장 순서에 우선순위를 맡기지 않기 위함. (twMerge가 뒤에 오는
    // `bg-primary-soft`로 레지스트리의 `bg-muted`를 덮는다.)
    <TableRow
      aria-selected={isSelected ? true : undefined}
      className={cn(
        'cursor-pointer',
        'data-[state=selected]:bg-primary-soft data-[state=selected]:shadow-[inset_3px_0_0_var(--primary)] data-[state=selected]:hover:bg-primary-soft',
        'not-data-[state=selected]:data-[tone=danger]:shadow-[inset_3px_0_0_var(--danger)]'
      )}
      data-state={isSelected ? 'selected' : undefined}
      data-tone={isFailed ? 'danger' : undefined}
      onClick={onSelect}
    >
      <TableCell className='py-2.5 pl-4 align-top sm:pl-[18px]'>
        <button
          aria-label={`job ${row.id} 상세 선택`}
          className='tap-target tnum min-w-0 justify-start rounded-sm text-left text-body font-semibold text-fg outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
          ref={buttonRef}
          onClick={(event) => {
            event.stopPropagation();
            onSelect();
          }}
          type='button'
        >
          {row.businessDate}
        </button>
        <div className='tnum text-label text-faint'>
          job {row.id} · {getSnapshotLabel(row)}
        </div>
        <BatchTypeBadge
          className='mt-1 px-[7px] py-0.5 text-label min-[641px]:hidden'
          jobType={row.jobType}
        />
        <div className='tnum min-[1181px]:hidden text-label text-faint'>
          원문/정제/이슈 {row.counts}
        </div>
      </TableCell>
      <TableCell className='hidden py-2.5 px-3 align-top min-[641px]:table-cell'>
        <BatchTypeBadge className='py-0.5' jobType={row.jobType} />
      </TableCell>
      <TableCell className='py-2.5 px-3 align-top'>
        <StatusBadge size='sm' status={row.rawStatus} />
        {row.rawStatus.trim().toUpperCase() === 'PARTIAL' && row.detail ? (
          <div className='wrap-anywhere mt-1 text-body-sm text-faint'>
            {row.detail}
          </div>
        ) : null}
      </TableCell>
      <TableCell className='py-2.5 px-3 text-right align-top'>
        <div className='tnum text-body-sm text-fg'>{row.duration}</div>
        {/* `whitespace-nowrap` only from `sm` up. Below it the 520px table
            min-width already exceeds a 390px viewport, and forcing
            `2026-07-27 06:10 KST` onto one line pushed this column so far
            past the fold that only a stray digit stayed visible. Letting it
            wrap keeps 소요 inside the first screenful; the scroll wrapper
            still handles what genuinely does not fit. */}
        <div className='tnum text-label text-faint sm:whitespace-nowrap'>
          {row.startedAt}
        </div>
      </TableCell>
      <TableCell className='tnum hidden py-2.5 pr-4 text-right align-top whitespace-nowrap min-[1181px]:table-cell sm:pr-[18px]'>
        {row.counts}
      </TableCell>
    </TableRow>
  );
}
