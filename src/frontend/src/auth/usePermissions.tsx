// ─────────────────────────────────────────────────────────────────────────────
// usePermissions — React hooks for permission-based rendering and routing.
//
// The PermissionProvider bootstraps on mount by validating the stored token
// against the .NET /auth/session endpoint. All downstream hooks and guards
// read from the Zustand auth store — no prop drilling required.
//
// Usage:
//   const can = usePermissions();
//   if (!can('CAN_VIEW_ADMIN_PORTAL')) return <Navigate to="/" />;
//
//   <PortalGate permission="CAN_START_INTERVIEW">
//     <InterviewButton />
//   </PortalGate>
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuthStore } from './authStore';
import { defaultPortalForPermissions, type Permission } from './permissionMatrix';

// ── Provider ──────────────────────────────────────────────────────────────────

interface PermissionProviderProps {
  children: ReactNode;
}

/**
 * Mount at the root of the app (wrapping <Routes>).
 * Validates the stored JWT against /auth/session on first render and
 * hydrates the store with live permissions from the .NET backend.
 */
export function PermissionProvider({ children }: PermissionProviderProps) {
  const bootstrap = useAuthStore(s => s.bootstrap);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return <>{children}</>;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Returns a function that checks whether the current user has a permission. */
export function usePermissions() {
  const permissions = useAuthStore(s => s.permissions);
  return (permission: Permission) => permissions.has(permission);
}

/** Returns true if the user has ALL of the given permissions. */
export function useHasAllPermissions(required: Permission[]): boolean {
  const permissions = useAuthStore(s => s.permissions);
  return required.every(p => permissions.has(p));
}

/** Returns the full permission set for advanced checks. */
export function usePermissionSet(): Set<string> {
  return useAuthStore(s => s.permissions);
}

export function useIsAuthenticated(): boolean {
  return useAuthStore(s => s.isAuthenticated);
}

export function useIsAuthLoading(): boolean {
  return useAuthStore(s => s.isLoading);
}

/** Returns the default portal URL for the current user's permissions. */
export function useDefaultPortal(): string {
  const permissions = useAuthStore(s => s.permissions);
  return defaultPortalForPermissions(permissions as Set<Permission>);
}

// ── Gate component ────────────────────────────────────────────────────────────

interface PortalGateProps {
  permission: Permission;
  fallback?:  ReactNode;
  children:   ReactNode;
}

/**
 * Renders children only if the current user has the required permission.
 * Removes the element from the DOM entirely when denied — not just hidden.
 *
 *   <PortalGate permission="CAN_VIEW_ANALYTICS">
 *     <AnalyticsDashboard />
 *   </PortalGate>
 */
export function PortalGate({ permission, fallback = null, children }: PortalGateProps) {
  const can = usePermissions();
  return can(permission) ? <>{children}</> : <>{fallback}</>;
}
