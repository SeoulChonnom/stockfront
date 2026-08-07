import { createContext, useContext } from 'react';

export type AnnounceFn = (message: string) => void;

export const AnnounceContext = createContext<AnnounceFn | null>(null);

function noopAnnounce() {}

/** Returns a stable announcer; outside the provider it safely becomes a no-op. */
export function useAnnounce(): AnnounceFn {
  const announce = useContext(AnnounceContext);
  return announce ?? noopAnnounce;
}
