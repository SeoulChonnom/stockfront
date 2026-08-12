import { cn } from '@/lib/utils';

/**
 * 등락 방향을 색상만으로 표현하지 않기 위한 공용 표기.
 * 기호는 aria-hidden으로 두고, 스크린리더에는 상승/하락을 말로 읽어준다.
 */

export type Direction = 'up' | 'down';

const GLYPH: Record<Direction, string> = { up: '▲', down: '▼' };
const WORD: Record<Direction, string> = { up: '상승', down: '하락' };

export function directionTextClass(direction: Direction): string {
  return direction === 'up'
    ? 'text-[color:var(--up)]'
    : 'text-[color:var(--down)]';
}

export function DirectionIndicator({
  direction,
  className,
}: {
  direction: Direction;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span aria-hidden='true'>{GLYPH[direction]}</span>
      <span className='sr-only'>{WORD[direction]}</span>
    </span>
  );
}
