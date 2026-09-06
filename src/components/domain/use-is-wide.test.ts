import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useIsWide } from '@/components/domain/use-is-wide';

type MediaQueryListenerMap = Map<string, Set<() => void>>;

function mockMatchMedia(initialMatches: boolean): {
  listeners: MediaQueryListenerMap;
  fireChange: (matches: boolean) => void;
} {
  const listeners: MediaQueryListenerMap = new Map();
  let matches = initialMatches;

  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => {
      const queryListeners = listeners.get(query) ?? new Set<() => void>();
      listeners.set(query, queryListeners);

      return {
        get matches() {
          return matches;
        },
        media: query,
        onchange: null,
        addEventListener: (_: string, handler: () => void) => {
          queryListeners.add(handler);
        },
        removeEventListener: (_: string, handler: () => void) => {
          queryListeners.delete(handler);
        },
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    })
  );

  return {
    listeners,
    fireChange: (next: boolean) => {
      matches = next;
      for (const queryListeners of listeners.values()) {
        for (const handler of queryListeners) {
          handler();
        }
      }
    },
  };
}

describe('useIsWide', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns true when matchMedia is unavailable (jsdom default) — features stay visible in unit tests', () => {
    const { result } = renderHook(() => useIsWide());

    expect(result.current).toBe(true);
  });

  it('reflects a narrow (min-width: 641px) match of false', () => {
    mockMatchMedia(false);

    const { result } = renderHook(() => useIsWide());

    expect(result.current).toBe(false);
  });

  it('reflects a wide match of true', () => {
    mockMatchMedia(true);

    const { result } = renderHook(() => useIsWide());

    expect(result.current).toBe(true);
  });

  it('updates when the media query change event fires', () => {
    const { fireChange } = mockMatchMedia(false);

    const { result } = renderHook(() => useIsWide());
    expect(result.current).toBe(false);

    act(() => {
      fireChange(true);
    });

    expect(result.current).toBe(true);
  });
});
