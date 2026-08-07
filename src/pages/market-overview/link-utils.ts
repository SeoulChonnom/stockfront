/**
 * Guards an external URL before it's used as an `href`. Mirrors the
 * `getSafeExternalUrl` helper already used by `cluster-detail-page.tsx`.
 * The small local copy avoids coupling these page modules.
 *
 * `originalUrl`/`mirrorUrl` on `ArticleLink` and
 * `ClusterRepresentativeArticle` are nullable in the view model, so callers
 * must treat a `null` return as "render nothing" rather than a broken link.
 */
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
