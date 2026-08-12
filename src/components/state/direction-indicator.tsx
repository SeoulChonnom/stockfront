import { cn } from '@/lib/utils';

import type { Direction } from './direction-text-class';

/**
 * 등락 방향을 색상만으로 표현하지 않기 위한 공용 표기.
 * 기호는 aria-hidden으로 두고, 스크린리더에는 상승/하락을 말로 읽어준다.
 *
 * The root span is `relative` so it is the containing block for the
 * absolutely-positioned `.sr-only` label below. Without a positioned
 * ancestor here, that label's containing block becomes the document root,
 * which lets it inflate `document.documentElement.scrollWidth` when this
 * indicator sits inside a horizontally-scrollable container (e.g. a table
 * inside `TableScrollWrapper`) — the scroll wrapper's `overflow-x: auto`
 * clips it visually but does not clip its contribution to root-level
 * scrollable overflow, since clipping follows the containing-block chain,
 * not the paint/DOM chain.
 */

const GLYPH: Record<'up' | 'down', string> = { up: '▲', down: '▼' };
const WORD: Record<'up' | 'down', string> = { up: '상승', down: '하락' };

export function DirectionIndicator({
  direction,
  className,
}: {
  direction: Direction;
  className?: string;
}) {
  // 등락 방향을 알 수 없으면(changeValue 누락) 화살표도, 상승/하락 낭독도
  // 하지 않는다 — 없는 방향을 지어내지 않는다.
  if (direction === 'none') {
    return null;
  }

  return (
    <span className={cn('relative inline-flex items-center gap-1', className)}>
      <span aria-hidden='true'>{GLYPH[direction]}</span>
      <span className='sr-only'>{WORD[direction]}</span>
    </span>
  );
}
