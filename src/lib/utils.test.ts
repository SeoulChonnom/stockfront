import { describe, expect, it } from 'vitest';

import { cn } from './utils';

const semanticFontSizes = [
  'text-body',
  'text-body-sm',
  'text-label',
  'text-caption',
  'text-card-heading',
] as const;

describe('cn semantic typography utilities', () => {
  it.each(semanticFontSizes)(
    'preserves %s beside semantic color utilities',
    (fontSize) => {
      const merged = cn(fontSize, 'text-fg-soft');

      expect(merged).toContain(fontSize);
      expect(merged).toContain('text-fg-soft');
    }
  );

  it('keeps the last utility when two semantic font sizes conflict', () => {
    expect(cn('text-body', 'text-body-sm')).toBe('text-body-sm');
    expect(cn('text-card-heading', 'text-label')).toBe('text-label');
  });

  it('keeps standard Tailwind conflicts working', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});
