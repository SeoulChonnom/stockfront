const ARCHIVE_DATE_ORIGIN_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Origin-aware first breadcrumb segment, shared with
 * `ClusterHeader`'s origin-aware back action (same three-way branch —
 * latest / archive date / direct entry — different label wording per call
 * site). Split into its own module (not colocated with `ClusterBreadcrumb`)
 * so both components can import a plain function without either one
 * re-exporting a non-component value, which breaks React Fast Refresh.
 */
export function getOriginLink(
  origin: string | null,
  businessDate: string
): { label: string; href: string } {
  if (origin === 'latest') {
    return { label: '최신 브리프', href: '/market/latest' };
  }

  if (origin && ARCHIVE_DATE_ORIGIN_PATTERN.test(origin)) {
    return { label: `아카이브 ${origin}`, href: `/market/archive/${origin}` };
  }

  // Direct entry (no `origin` query) falls back to this
  // cluster's OWN business-date archive snapshot, not always `/market/latest`.
  return { label: '시장 브리프', href: `/market/archive/${businessDate}` };
}
