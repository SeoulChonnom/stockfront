import { createContext, useContext } from 'react';

/**
 * The `useAnnounce()` hook + its context, split out from
 * `announce-context.tsx` (which owns the `AnnounceProvider` *component*)
 * purely so that file can stay component-only — same reason
 * `use-dismissable.ts` is split out from `drawer.tsx`/`dialog.tsx` in this
 * codebase. See `announce-context.tsx`'s doc comment for the full contract.
 */

export type AnnounceFn = (message: string) => void;

export const AnnounceContext = createContext<AnnounceFn | null>(null);

function noopAnnounce() {
  // Intentionally empty — see useAnnounce() doc comment below.
}

/**
 * Returns a stable function that publishes `message` to the single shared
 * live region rendered by `AnnounceProvider`. Safe to call from anywhere
 * under `AppShell`. If a screen is ever rendered outside the provider (e.g.
 * an isolated unit test), this degrades to a no-op rather than throwing —
 * announcements are an enhancement, not something that should crash a
 * render.
 */
export function useAnnounce(): AnnounceFn {
  const announce = useContext(AnnounceContext);
  return announce ?? noopAnnounce;
}
