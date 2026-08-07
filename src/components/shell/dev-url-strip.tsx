/** Development-only URL context for QA. */
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
