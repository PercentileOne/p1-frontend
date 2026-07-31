// ─────────────────────────────────────────────────────────────────────────────
// usePermissions — React hooks for permission-based rendering and routing.
//
// Usage:
//   const can = usePermissions();
//   if (!can('CAN_VIEW_ADMIN_PORTAL')) return <Redirect />;
//
//   <PortalGate permission="CAN_START_INTERVIEW">
//     <InterviewButton />
//   </PortalGate>
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import {
  resolvePermissions,
  defaultPortalForPermissions,
  type Permission,
  type Role,
} from './permissionMatrix';

// ── Context ───────────────────────────────────────────────────────────────────

interface PermissionContextValue {
  permissions: Set<Permission>;
  roles: Role[];
  isAuthenticated: boolean;
}

const PermissionContext = createContext<PermissionContextValue>({
  permissions: new Set(),
  roles: [],
  isAuthenticated: false,
});

// ── Provider ──────────────────────────────────────────────────────────────────

interface PermissionProviderProps {
  roles: Role[];
  isAuthenticated: boolean;
  children: ReactNode;
}

export function PermissionProvider({ roles, isAuthenticated, children }: PermissionProviderProps) {
  const permissions = useMemo(() => resolvePermissions(roles), [roles]);
  return (
    <PermissionContext.Provider value={{ permissions, roles, isAuthenticated }}>
      {children}
    </PermissionContext.Provider>
  );
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Returns a function that checks a single permission. */
export function usePermissions() {
  const { permissions } = useContext(PermissionContext);
  return (permission: Permission) => permissions.has(permission);
}

/** Returns true if the user has ALL of the given permissions. */
export function useHasAllPermissions(required: Permission[]): boolean {
  const { permissions } = useContext(PermissionContext);
  return required.every(p => permissions.has(p));
}

/** Returns the full permission set (for advanced checks). */
export function usePermissionSet(): Set<Permission> {
  return useContext(PermissionContext).permissions;
}

export function useIsAuthenticated(): boolean {
  return useContext(PermissionContext).isAuthenticated;
}

/** Returns where to send a user when they hit a portal they can't access. */
export function useDefaultPortal(): string {
  const { permissions } = useContext(PermissionContext);
  return defaultPortalForPermissions(permissions);
}

// ── Gate component ────────────────────────────────────────────────────────────

interface PortalGateProps {
  /** Permission required to render children. */
  permission: Permission;
  /** Rendered when permission is missing. Defaults to null (renders nothing). */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Renders children only if the current user has the required permission.
 * Use this for feature-level UI gating within a portal.
 *
 *   <PortalGate permission="CAN_VIEW_ANALYTICS">
 *     <AnalyticsDashboard />
 *   </PortalGate>
 */
export function PortalGate({ permission, fallback = null, children }: PortalGateProps) {
  const can = usePermissions();
  return can(permission) ? <>{children}</> : <>{fallback}</>;
}
