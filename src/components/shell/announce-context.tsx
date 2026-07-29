import { type ReactNode, useMemo, useState } from 'react';

import { AnnounceContext, type AnnounceFn } from './use-announce';

/**
 * Single app-wide `aria-live="polite"` region — README §7-1, §15.
 *
 * "화면당 단일 `aria-live` region. 시각 텍스트와 중복 낭독되지 않게 하고
 * 라우트 변경 시 비운다." Exactly one instance of this region exists for
 * the whole authenticated app (mounted once by `AppShell`) — screens never
 * render their own live region, they call `useAnnounce()`
 * (`use-announce.ts`) instead:
 *
 * ```ts
 * const announce = useAnnounce();
 * announce('검색 결과 46건을 찾았습니다.');
 * ```
 *
 * `pathname` is passed in by `AppShell`; the provider clears the
 * announcement whenever it changes, so a stale message from the previous
 * screen is never re-read after navigating (§7-1).
 *
 * WHY THE CLEAR IS KEYED ON `pathname`, NOT `pathname + search`:
 *
 * Several §9 Interaction Contract announcements are paired with a
 * QUERY-ONLY navigation in the same synchronous call — Pagination's
 * "N페이지를 불러옵니다." (`components/ui/pagination.tsx` `goTo()` announces
 * immediately before `onPageChange` -> `navigate()`) and Batch row
 * selection's "job N 상세를 표시합니다." (`batch-history-list.tsx`). When
 * this provider cleared on `pathname + search`, those transitions changed
 * the key too, so the clear overwrote the just-announced text back to `''`
 * in the same commit — the announcements were swallowed 100% of the time
 * (caught by `e2e/archive-search.spec.ts` §16-12).
 *
 * A query-only change is not a new screen: it's the same page updating, and
 * §9 explicitly wants it to announce. Only a pathname change is a real route
 * change whose leftover message would be stale. Keying on `pathname` fixes
 * the swallowing and removes the need to track "did an announce accompany
 * this transition" with a ref at all.
 *
 * Errors are a separate contract: `role="alert"` components (`InlineAlert`,
 * `PermissionState`, the auth-bootstrap `StatusCard`) announce themselves
 * and are NOT routed through this hook.
 */
export function AnnounceProvider({
  children,
  pathname,
}: {
  children: ReactNode;
  pathname: string;
}) {
  const [message, setMessage] = useState('');
  const [lastPathname, setLastPathname] = useState(pathname);

  // React's sanctioned "adjust state during render" pattern — no effect, no
  // ref read during render. Clearing here (rather than in a layout effect)
  // also means the stale message is gone before anything paints for the new
  // screen, so it can never be re-read.
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setMessage('');
  }

  const announce = useMemo<AnnounceFn>(() => (next) => setMessage(next), []);

  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <div aria-live='polite' className='sr-only'>
        {message}
      </div>
    </AnnounceContext.Provider>
  );
}
