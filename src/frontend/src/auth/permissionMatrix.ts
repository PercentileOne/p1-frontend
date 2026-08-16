// ─────────────────────────────────────────────────────────────────────────────
// Explain.global — Multi-Portal Permission Matrix
//
// This file is the SINGLE SOURCE OF TRUTH for all access control decisions.
// It is enforced at three levels:
//   1. Route guards    — useRequirePermission() / <PortalGate> wrapper
//   2. API middleware  — server reads the same Permission enum strings
//   3. UI rendering    — usePermission() hides/shows features
//
// To add a new permission: add to Permission enum + update ROLE_PERMISSIONS.
// To add a new role: add to Role enum + add a ROLE_PERMISSIONS entry.
// Never hard-code role checks in components — use permission checks only.
// ─────────────────────────────────────────────────────────────────────────────

// ── Portals ──────────────────────────────────────────────────────────────────

export type Portal =
  | 'candidate'
  | 'recruiter'
  | 'client'
  | 'admin'
  | 'careers';

/** The subdomain each portal lives at. Used for cross-portal redirects. */
export const PORTAL_ORIGINS: Record<Portal, string> = {
  candidate: 'https://candidate.interviewme.global',
  recruiter: 'https://recruiter.interviewme.global',
  client:    'https://employer.interviewme.global',
  admin:     'https://admin.interviewme.global',
  careers:   'https://careers.interviewme.global',
};

// ── Roles ─────────────────────────────────────────────────────────────────────

export type Role = 'Candidate' | 'Recruiter' | 'Client' | 'Admin' | 'SuperAdmin' | 'Student';

// ── Permissions ───────────────────────────────────────────────────────────────

export type Permission =
  // Public / Careers
  | 'CAN_VIEW_CAREERS'
  // Candidate
  | 'CAN_START_INTERVIEW'
  | 'CAN_PRACTICE_INTERVIEW'
  | 'CAN_VIEW_INTERVIEW_RESULTS'
  // Recruiter / management
  | 'CAN_MANAGE_INTERVIEWS'
  | 'CAN_VIEW_CANDIDATE_PROFILE'
  | 'CAN_VIEW_RECRUITER_PORTAL'
  // Client
  | 'CAN_VIEW_CLIENT_PORTAL'
  // Admin
  | 'CAN_VIEW_ADMIN_PORTAL'
  | 'CAN_EDIT_ROLES'
  | 'CAN_VIEW_ANALYTICS'
  // Super Admin only
  | 'CAN_EDIT_PERMISSIONS'
  | 'CAN_VIEW_SYSTEM_SETTINGS';

// ── Matrix ────────────────────────────────────────────────────────────────────
//
//  Row  = Role
//  Cell = set of permissions granted to that role
//
// Read-only at runtime — never mutate this object.

export const ROLE_PERMISSIONS: Readonly<Record<Role, ReadonlyArray<Permission>>> = {
  Candidate: [
    'CAN_VIEW_CAREERS',
    'CAN_START_INTERVIEW',
    'CAN_PRACTICE_INTERVIEW',
    'CAN_VIEW_INTERVIEW_RESULTS',
  ],

  Recruiter: [
    'CAN_VIEW_CAREERS',
    'CAN_VIEW_INTERVIEW_RESULTS',
    'CAN_MANAGE_INTERVIEWS',
    'CAN_VIEW_CANDIDATE_PROFILE',
    'CAN_VIEW_RECRUITER_PORTAL',
    'CAN_VIEW_ANALYTICS',
  ],

  Client: [
    'CAN_VIEW_CAREERS',
    'CAN_VIEW_INTERVIEW_RESULTS',
    'CAN_VIEW_CANDIDATE_PROFILE',
    'CAN_VIEW_CLIENT_PORTAL',
  ],

  Admin: [
    'CAN_VIEW_CAREERS',
    'CAN_VIEW_INTERVIEW_RESULTS',
    'CAN_MANAGE_INTERVIEWS',
    'CAN_VIEW_CANDIDATE_PROFILE',
    'CAN_VIEW_RECRUITER_PORTAL',
    'CAN_VIEW_CLIENT_PORTAL',
    'CAN_VIEW_ADMIN_PORTAL',
    'CAN_EDIT_ROLES',
    'CAN_VIEW_ANALYTICS',
  ],

  SuperAdmin: [
    'CAN_VIEW_CAREERS',
    'CAN_START_INTERVIEW',
    'CAN_PRACTICE_INTERVIEW',
    'CAN_VIEW_INTERVIEW_RESULTS',
    'CAN_MANAGE_INTERVIEWS',
    'CAN_VIEW_CANDIDATE_PROFILE',
    'CAN_VIEW_RECRUITER_PORTAL',
    'CAN_VIEW_CLIENT_PORTAL',
    'CAN_VIEW_ADMIN_PORTAL',
    'CAN_EDIT_ROLES',
    'CAN_VIEW_ANALYTICS',
    'CAN_EDIT_PERMISSIONS',
    'CAN_VIEW_SYSTEM_SETTINGS',
  ],

  Student: [
    'CAN_VIEW_CAREERS',
  ],
};

// ── Portal access map ─────────────────────────────────────────────────────────
//
// Which permission is required to access each portal's root.
// This is the primary routing-level check.

export const PORTAL_ENTRY_PERMISSION: Record<Portal, Permission> = {
  candidate: 'CAN_START_INTERVIEW',     // any practising candidate
  recruiter: 'CAN_VIEW_RECRUITER_PORTAL',
  client:    'CAN_VIEW_CLIENT_PORTAL',
  admin:     'CAN_VIEW_ADMIN_PORTAL',
  careers:   'CAN_VIEW_CAREERS',        // public — but still permission-checked so anonymous is explicit
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the full permission set for a user based on their roles. */
export function resolvePermissions(roles: Role[]): Set<Permission> {
  const perms = new Set<Permission>();
  for (const role of roles) {
    for (const perm of ROLE_PERMISSIONS[role] ?? []) {
      perms.add(perm);
    }
  }
  return perms;
}

/** Returns true if the permission set grants access to the given portal. */
export function canAccessPortal(permissions: Set<Permission>, portal: Portal): boolean {
  return permissions.has(PORTAL_ENTRY_PERMISSION[portal]);
}

/** Returns true if the user has the given permission. */
export function hasPermission(permissions: Set<Permission>, permission: Permission): boolean {
  return permissions.has(permission);
}

/**
 * Returns the redirect URL for a user who is denied access to a portal.
 * Picks the highest-access portal the user CAN reach, falling back to careers.
 */
export function defaultPortalForPermissions(permissions: Set<Permission>): string {
  if (canAccessPortal(permissions, 'admin'))     return PORTAL_ORIGINS.admin;
  if (canAccessPortal(permissions, 'recruiter')) return PORTAL_ORIGINS.recruiter;
  if (canAccessPortal(permissions, 'client'))    return PORTAL_ORIGINS.client;
  if (canAccessPortal(permissions, 'candidate')) return PORTAL_ORIGINS.candidate;
  return PORTAL_ORIGINS.careers;
}
