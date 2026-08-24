import { describe, expect, it } from 'vitest';

import { getPageMeta } from '@/app/page-meta';

describe('getPageMeta', () => {
  it('uses the archive page label in document metadata', () => {
    expect(getPageMeta({ page: 'archive-search' })).toEqual({
      title: 'Market Brief · 아카이브',
    });
  });
});
