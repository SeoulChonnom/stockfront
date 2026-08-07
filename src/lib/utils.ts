import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        'text-body',
        'text-body-sm',
        'text-label',
        'text-caption',
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
