/** Role/capability checks are UX affordances; backend authorization is the security boundary. */

import { useMemo, useSyncExternalStore } from 'react';

import {
  getAuthBootstrapState,
  subscribeToAuthBootstrap,
} from './auth-bootstrap';
import { isDevelopmentBypassEnabled } from './auth-config';

export type Role = 'user' | 'admin';

export type Capability = 'ops.view' | 'ops.trigger' | 'ops.viewLogs';

type Listener = () => void;

const listeners = new Set<Listener>();

let roleOverride: Role | null = null;

/** Production fallback is least-privilege `user`; only the development bypass defaults to `admin`. */
function getDefaultRole(): Role {
  if (isDevelopmentBypassEnabled()) {
    // Development bypass has no token roleList, so keep the local preview usable.
    return 'admin';
  }

  return 'user';
}

function notifyListeners(): void {
  listeners.forEach((listener) => {
    listener();
  });
}

export function setRoleOverride(role: Role | null): void {
  if (roleOverride === role) {
    return;
  }

  roleOverride = role;
  notifyListeners();
}

export function resetRoleOverrideForTesting(): void {
  setRoleOverride(null);
}

/** Normalizes a non-empty roleList; an empty/malformed list uses the fallback. */
function deriveRoleFromRoleList(roles: readonly string[]): Role | null {
  if (roles.length === 0) {
    return null;
  }

  const isAdmin = roles.some((entry) => entry.trim().toLowerCase() === 'admin');

  return isAdmin ? 'admin' : 'user';
}

export function getRole(): Role {
  if (roleOverride) {
    return roleOverride;
  }

  const bootstrapRole = deriveRoleFromRoleList(getAuthBootstrapState().roles);

  if (bootstrapRole) {
    return bootstrapRole;
  }

  return getDefaultRole();
}

function subscribeToOverrideStore(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/** Subscribe to both override and bootstrap stores so role changes rerender consumers. */
function subscribeRole(listener: Listener): () => void {
  const unsubscribeOverride = subscribeToOverrideStore(listener);
  const unsubscribeBootstrap = subscribeToAuthBootstrap(listener);

  return () => {
    unsubscribeOverride();
    unsubscribeBootstrap();
  };
}

export function useRole(): Role {
  return useSyncExternalStore(subscribeRole, getRole, getRole);
}

const CAPABILITIES_BY_ROLE: Readonly<Record<Role, ReadonlySet<Capability>>> =
  Object.freeze({
    user: new Set<Capability>(),
    admin: new Set<Capability>(['ops.view', 'ops.trigger', 'ops.viewLogs']),
  });

export function can(capability: Capability, role: Role = getRole()): boolean {
  return CAPABILITIES_BY_ROLE[role].has(capability);
}

export type Capabilities = Readonly<{
  role: Role;
  can: (capability: Capability) => boolean;
}>;

export function useCapabilities(): Capabilities {
  const role = useRole();

  return useMemo(
    () => ({
      role,
      can: (capability: Capability) => can(capability, role),
    }),
    [role]
  );
}
