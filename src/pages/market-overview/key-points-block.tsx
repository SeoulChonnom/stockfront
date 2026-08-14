import { cn, isRecord } from '@/lib/utils';
import type { KeyPoint, KeyPointDirection } from '@/lib/view-models';

/**
 * B-1 "오늘의 핵심" (`keyPoints`). 서버 보장(A-2)은 all-or-nothing이고
 * `mapDailyPageToSnapshot`이 이미 그 조건을 강제한다. 다만 이 경계에서도
 * 빈 텍스트가 섞인 malformed view model은 개별 블록부터 제외한다.
 *
 * 렌더링 규칙(A-2):
 * - `keyPoints`가 비면 섹션 전체(제목 포함)를 렌더하지 않는다. 제목만 남고
 *   내용이 빈 landmark가 되면 스크린리더에서 의미 없는 헤딩이 읽힌다.
 * - `label`은 서버 고정 문자열을 그대로 쓴다. `text`는 plain text 노드로만
 *   렌더한다(HTML/Markdown/줄바꿈이 없다는 서버 계약).
 * - `direction`은 색이나 화살표만으로 표현하지 않는다 — 방향 단어(예: 혼조)를
 *   항상 텍스트로 노출하고, 아이콘/색은 보조 수단으로만 쓴다. `text` 문장
 *   자체가 이미 방향을 온전히 설명하므로 이 태그는 보조 요약일 뿐이다.
 * - `globalHeadline`이나 시장별 요약에서 항목을 합성하지 않는다 — 서버가
 *   내려준 순서를 그대로 표시할 뿐이다.
 */

const DIRECTION_META: Record<
  KeyPointDirection,
  { word: string; glyph: string; toneClass: string }
> = {
  UP: { word: '상승', glyph: '▲', toneClass: 'text-[color:var(--up)]' },
  DOWN: { word: '하락', glyph: '▼', toneClass: 'text-[color:var(--down)]' },
  MIXED: {
    word: '혼조',
    glyph: '◆',
    toneClass: 'text-[color:var(--warning)]',
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
        'inline-flex items-center gap-1 text-caption font-semibold',
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
      className='rounded-[var(--r-lg)] border border-line bg-[color:var(--surface)] p-5'
    >
      <h2
        className='m-0 mb-3 text-card-heading font-semibold text-fg'
        id='key-points-heading'
      >
        오늘의 핵심
      </h2>
      <ul className='m-0 flex list-none flex-col gap-3 p-0'>
        {visibleKeyPoints.map((point) => (
          <li
            className='flex flex-col gap-1 border-t border-line pt-3 first:border-t-0 first:pt-0'
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
            <p className='text-pretty wrap-anywhere m-0 text-body text-fg'>
              {point.text}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
