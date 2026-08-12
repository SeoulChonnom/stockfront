/**
 * 등락 방향을 색상 토큰 클래스로 매핑한다.
 * 컴포넌트 파일(direction-indicator.tsx)과 분리해 Fast Refresh 규칙
 * (컴포넌트 전용 export)을 지킨다.
 */

export type Direction = 'up' | 'down';

export function directionTextClass(direction: Direction): string {
  return direction === 'up'
    ? 'text-[color:var(--up)]'
    : 'text-[color:var(--down)]';
}
