/** Source of truth for document theme attributes, color-scheme, and theme-color metadata. */

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'stockfront.theme';
const LIGHT_THEME_COLOR = '#f6f8fb';
const DARK_THEME_COLOR = '#0a1120';

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark';
}

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

/** Applies theme attributes; persistence is handled by setTheme. */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  updateThemeColorMeta(theme);
}

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

/** Subscribes to OS theme changes, or returns a no-op unsubscribe without matchMedia. */
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
