/**
 * Theme resolution/persistence for Market Brief UI v2 (README §6, §7-1).
 *
 * Source of truth for `document.documentElement.dataset.theme`,
 * `color-scheme`, and the `<meta name="theme-color">` tags. Kept isolated
 * from React so it can be called during app bootstrap (before render) and
 * from any component without prop-drilling.
 */

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'stockfront.theme';
const LIGHT_THEME_COLOR = '#f6f8fb';
const DARK_THEME_COLOR = '#0a1120';

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark';
}

/** Reads the persisted theme choice, if any. SSR/no-storage safe. */
export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isTheme(stored) ? stored : null;
  } catch {
    // localStorage can throw in private-browsing/disabled-storage contexts.
    return null;
  }
}

/** Reads the OS/browser theme preference. Defaults to 'light' on SSR. */
function getSystemTheme(): Theme {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/** Stored choice wins; otherwise falls back to system preference (README §6). */
export function resolveInitialTheme(): Theme {
  return getStoredTheme() ?? getSystemTheme();
}

function updateThemeColorMeta(theme: Theme): void {
  if (typeof document === 'undefined') {
    return;
  }

  const color = theme === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
  const metas = document.querySelectorAll('meta[name="theme-color"]');

  if (metas.length === 0) {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    meta.setAttribute('content', color);
    document.head.appendChild(meta);
    return;
  }

  for (const meta of metas) {
    meta.setAttribute('content', color);
  }
}

/**
 * Applies a theme to the current document: `dataset.theme`, `color-scheme`,
 * and both `theme-color` meta tags. Does not persist — see `setTheme`.
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  updateThemeColorMeta(theme);
}

/** Persists the choice to localStorage and applies it immediately. */
export function setTheme(theme: Theme): void {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Storage unavailable — theme still applies for this session.
    }
  }

  applyTheme(theme);
}

/**
 * Calls `callback` whenever the OS-level color scheme preference changes.
 * Returns an unsubscribe function. No-op (returns a no-op unsubscribe) when
 * matchMedia isn't available (SSR).
 */
export function subscribeToSystemTheme(
  callback: (theme: Theme) => void
): () => void {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return () => {};
  }

  const query = window.matchMedia('(prefers-color-scheme: dark)');
  const listener = (event: MediaQueryListEvent) => {
    callback(event.matches ? 'dark' : 'light');
  };

  query.addEventListener('change', listener);

  return () => {
    query.removeEventListener('change', listener);
  };
}
