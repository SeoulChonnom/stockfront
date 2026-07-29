/**
 * URL context strip — README §7-1 ("선택, 개발/QA에 유용"), resolved in
 * `docs/design_v2/v2-decisions.md` A-05 as dev-build-only (never rendered in
 * a production build). Shows the current `pathname` + query string in mono
 * so QA can confirm what the app believes the URL/contract state is without
 * opening devtools.
 */
export function DevUrlStrip({
  pathname,
  search,
}: {
  pathname: string;
  search: string;
}) {
  return (
    <div className='mono border-b border-[color:var(--line)] bg-[color:var(--surface-2)] px-3 py-1 text-[11.5px] text-[color:var(--text-faint)]'>
      {pathname}
      {search}
    </div>
  );
}
