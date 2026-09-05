import { cn, isRecord } from '@/lib/utils';
import type { KeyPoint, KeyPointDirection } from '@/lib/view-models';

/**
 * Render only valid server-provided items, hiding the entire empty section.
 * Direction always includes text; color and glyphs are supplementary.
 */

const DIRECTION_META: Record<
  KeyPointDirection,
  { word: string; glyph: string; toneClass: string }
> = {
  UP: { word: '상승', glyph: '▲', toneClass: 'text-up' },
  DOWN: { word: '하락', glyph: '▼', toneClass: 'text-down' },
  MIXED: {
    word: '혼조',
    glyph: '◆',
    toneClass: 'text-warning',
  },
  FLAT: { word: '보합', glyph: '■', toneClass: 'text-faint' },
};

const KEY_POINT_KINDS = ['direction', 'driver', 'watch'] as const;
type KeyPointKind = (typeof KEY_POINT_KINDS)[number];
const KEY_POINT_DIRECTIONS = ['UP', 'DOWN', 'MIXED', 'FLAT'] as const;
const KEY_POINT_LABELS = {
  direction: '시장 방향',
  driver: '주요 원인',
  watch: '관전 포인트',
} as const;

function isKeyPointKind(value: unknown): value is KeyPointKind {
  return (
    typeof value === 'string' &&
    (KEY_POINT_KINDS as readonly string[]).includes(value)
  );
}

function isKeyPointDirection(value: unknown): value is KeyPointDirection {
  return (
    typeof value === 'string' &&
    (KEY_POINT_DIRECTIONS as readonly string[]).includes(value)
  );
}

function toRenderableKeyPoint(value: unknown): KeyPoint | null {
  if (!isRecord(value) || !isKeyPointKind(value.kind)) {
    return null;
  }

  const kind = value.kind;
  if (
    value.label !== KEY_POINT_LABELS[kind] ||
    typeof value.text !== 'string' ||
    value.text.trim().length === 0
  ) {
    return null;
  }

  if (kind === 'direction') {
    return isKeyPointDirection(value.direction)
      ? {
          kind,
          label: KEY_POINT_LABELS.direction,
          text: value.text,
          direction: value.direction,
        }
      : null;
  }

  if (Object.hasOwn(value, 'direction')) {
    return null;
  }

  return kind === 'driver'
    ? { kind, label: KEY_POINT_LABELS.driver, text: value.text }
    : { kind, label: KEY_POINT_LABELS.watch, text: value.text };
}

function DirectionTag({ direction }: { direction: KeyPointDirection }) {
  const meta = DIRECTION_META[direction];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-body-sm font-semibold',
        meta.toneClass
      )}
    >
      <span aria-hidden='true'>{meta.glyph}</span>
      {meta.word}
    </span>
  );
}

export function KeyPointsBlock({ keyPoints }: { keyPoints: KeyPoint[] }) {
  const visibleKeyPoints = (Array.isArray(keyPoints) ? keyPoints : [])
    .map(toRenderableKeyPoint)
    .filter((point): point is KeyPoint => point !== null);

  if (visibleKeyPoints.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby='key-points-heading'
      className='-mx-5 border-t border-line px-5 pt-4'
    >
      <h2
        className='m-0 mb-3 text-h2 font-semibold text-fg'
        id='key-points-heading'
      >
        오늘의 핵심
      </h2>
      <ul className='m-0 flex list-none flex-col gap-4 p-0'>
        {visibleKeyPoints.map((point) => (
          <li
            className='flex flex-col gap-1'
            key={`${point.kind}-${point.text}`}
          >
            <div className='flex flex-wrap items-center gap-2'>
              <span className='text-body-sm font-semibold text-faint'>
                {point.label}
              </span>
              {point.kind === 'direction' ? (
                <DirectionTag direction={point.direction} />
              ) : null}
            </div>
            <p className='measure-summary text-pretty wrap-anywhere m-0 text-body text-fg'>
              {point.text}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
