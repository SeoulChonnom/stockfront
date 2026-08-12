/**
 * 등락 방향을 색상 토큰 클래스로 매핑한다.
 * 컴포넌트 파일(direction-indicator.tsx)과 분리해 Fast Refresh 규칙
 * (컴포넌트 전용 export)을 지킨다.
 *
 * `'none'`은 등락 방향을 알 수 없는 경우(예: changeValue 누락)로, 색상으로
 * 상승/하락을 암시하지 않도록 faint 톤을 쓴다.
 */

export type Direction = 'up' | 'down' | 'none';

export function directionTextClass(direction: Direction): string {
  if (direction === 'up') {
    return 'text-[color:var(--up)]';
  }

  if (direction === 'down') {
    return 'text-[color:var(--down)]';
  }

  return 'text-faint';
}
