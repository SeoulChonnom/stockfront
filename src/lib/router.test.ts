import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildUrl, navigate, withBasePath } from './router';

describe('buildUrl', () => {
  it('serializes query params and omits empty values', () => {
    expect(
      buildUrl('/market/archive/search', {
        from: '2026-03-01',
        to: '2026-03-14',
        status: '',
        page: 2,
      })
    ).toBe('/market/archive/search?from=2026-03-01&to=2026-03-14&page=2');
  });

  it('serializes archive theme selections as repeated query keys in order', () => {
    expect(
      buildUrl('/market/archive/search', {
        market: 'KR',
        theme: ['SECTOR', '', 'MARKET_FLOW_INVESTOR'],
        q: '외국인 매수',
      })
    ).toBe(
      '/market/archive/search?market=KR&theme=SECTOR&theme=MARKET_FLOW_INVESTOR&q=%EC%99%B8%EA%B5%AD%EC%9D%B8+%EB%A7%A4%EC%88%98'
    );
  });
});

describe('navigate', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('updates the browser location and dispatches a routechange event', () => {
    const routeChangeListener = vi.fn();

    window.addEventListener('routechange', routeChangeListener);
    navigate('/ops/batches?page=2');

    expect(window.location.pathname).toBe(withBasePath('/ops/batches'));
    expect(window.location.search).toBe('?page=2');
    expect(routeChangeListener).toHaveBeenCalledTimes(1);

    window.removeEventListener('routechange', routeChangeListener);
  });

  it('replaces history entries when replace is true', () => {
    window.history.pushState(null, '', '/market/latest');
    const startingLength = window.history.length;

    navigate('/market/archive/search', { replace: true });

    expect(window.location.pathname).toBe(
      withBasePath('/market/archive/search')
    );
    expect(window.history.length).toBe(startingLength);
  });
});
