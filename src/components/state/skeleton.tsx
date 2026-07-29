import type { CSSProperties } from 'react';

import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

/**
 * Skeleton family — README §8 "skeleton은 실제 레이아웃 골격을 유지한다"
 * (중앙 메시지로 화면을 대체하지 않는다).
 *
 * 이 파일의 컴포넌트들은 실제 콘텐츠가 차지할 자리(높이/열 구조)를 그대로
 * 유지하는 "자리표시자" 블록만 그린다 — 페이지 레이아웃 자체는 호출부가
 * 그대로 유지한 채 내용만 이 컴포넌트로 바꿔 끼우면 된다. 컨테이너 쪽에서
 * `aria-busy="true"`를 달아야 하고(이 컴포넌트들은 그 책임을 지지 않는다),
 * 스켈레톤 자신은 `aria-hidden`이라 스크린리더에 잡히지 않는다.
 *
 * shimmer는 `--dur-shimmer`(1.3s) linear로 흐른다. `prefers-reduced-motion:
 * reduce`에서는 base.css의 전역 규칙(`animation-duration: 0.01ms !important`)
 * 이 모든 애니메이션에 적용되므로 여기서 별도 처리가 필요 없다.
 */

const SHIMMER_CLASSES =
  'animate-[skeleton-shimmer_var(--dur-shimmer)_linear_infinite] rounded-[var(--r-md)] bg-[color:var(--surface-3)] bg-[length:200%_100%] [background-image:linear-gradient(100deg,var(--surface-3)_30%,var(--surface-2)_50%,var(--surface-3)_70%)]';

export type SkeletonProps = {
  className?: string;
  style?: CSSProperties;
};

/** 하나의 블록 자리표시자. width/height는 className이나 style로 지정한다. */
export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      aria-hidden='true'
      className={cn(SHIMMER_CLASSES, className)}
      style={style}
    />
  );
}

export type SkeletonTextProps = {
  /** 줄 수. 기본 3줄이며 마지막 줄은 짧게 그려 자연스러운 텍스트처럼 보이게 한다. */
  lines?: number;
  className?: string;
  lineClassName?: string;
};

export function SkeletonText({
  lines = 3,
  className,
  lineClassName,
}: SkeletonTextProps) {
  return (
    <div aria-hidden='true' className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }, (_, index) => {
        const isLast = index === lines - 1;
        return (
          <Skeleton
            className={cn('h-3.5', isLast ? 'w-2/3' : 'w-full', lineClassName)}
            key={index}
          />
        );
      })}
    </div>
  );
}

export type SkeletonTableRowsProps = {
  rows: number;
  cols: number;
  className?: string;
};

/** 표 본문 골격. 실제 <Table>과 같은 열 개수를 유지해 레이아웃이 흔들리지 않는다. */
export function SkeletonTableRows({
  rows,
  cols,
  className,
}: SkeletonTableRowsProps) {
  return (
    <Table aria-hidden='true' className={className}>
      <TableBody>
        {Array.from({ length: rows }, (_, rowIndex) => (
          <TableRow key={rowIndex}>
            {Array.from({ length: cols }, (_, colIndex) => (
              <TableCell key={colIndex}>
                <Skeleton className='h-4 w-full' />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
