import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      // tailwind-merge는 커스텀 `text-*` 유틸리티가 글자 크기인지 색인지
      // 알지 못한다. 여기 등록되지 않은 역할은 `cn('text-h1', 'text-body')`
      // 같은 조합에서 서로를 지우지 못해 둘 다 남고, 나중에 선언된 쪽이
      // 이기는 대신 CSS 순서가 이긴다. 역할을 추가하면 반드시 여기도
      // 추가한다 (`src/index.css`의 `@theme inline` 목록과 1:1).
      'font-size': [
        'text-display',
        'text-h1',
        'text-h2',
        'text-lead',
        'text-body',
        'text-body-sm',
        'text-label',
        'text-card-heading',
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

export function computeTotalPages(totalCount: number, size: number): number {
  return Math.max(1, Math.ceil(totalCount / size));
}
