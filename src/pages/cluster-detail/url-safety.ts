/** Only `http:`/`https:` URLs become links; malformed or executable URLs degrade to plain text. */
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
