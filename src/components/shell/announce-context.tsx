import { type ReactNode, useMemo, useState } from 'react';

import { AnnounceContext, type AnnounceFn } from './use-announce';

/** One app-wide polite live region; clear only on pathname changes so query-only messages survive. */
export function AnnounceProvider({
  children,
  pathname,
}: {
  children: ReactNode;
  pathname: string;
}) {
  const [message, setMessage] = useState('');
  const [lastPathname, setLastPathname] = useState(pathname);

  // Adjust state during render so stale announcements disappear before paint.
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
