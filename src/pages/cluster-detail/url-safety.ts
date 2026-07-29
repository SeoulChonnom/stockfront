/** Only `http:`/`https:` URLs are rendered as real links (README carries this rule over from the pre-v2 page — a malformed or `javascript:`/`data:` URL degrades to plain text instead of an `<a>`). */
export function getSafeExternalUrl(
  url: string | null | undefined
): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? url
      : null;
  } catch {
    return null;
  }
}
