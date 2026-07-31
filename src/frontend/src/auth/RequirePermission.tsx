// ─────────────────────────────────────────────────────────────────────────────
// RequirePermission — route-level permission guard.
//
// Wrap any <Route> element that needs a permission check:
//
//   <Route
//     path="/recruiter"
//     element={
//       <RequirePermission permission="CAN_VIEW_RECRUITER_PORTAL">
//         <RecruiterDashboard />
//       </RequirePermission>
//     }
//   />
//
// Behaviour:
//   - While the session is bootstrapping    → shows nothing (avoids flash)
//   - Unauthenticated                       → redirects to /login
//   - Authenticated but permission missing  → redirects to /unauthorized
//   - Authenticated and permitted           → renders children
// ─────────────────────────────────────────────────────────────────────────────

import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuthStore } from './authStore';
import type { Permission } from './permissionMatrix';

interface RequirePermissionProps {
  permission: Permission;
  children:   ReactNode;
}

export function RequirePermission({ permission, children }: RequirePermissionProps) {
  const isLoading       = useAuthStore(s => s.isLoading);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const permissions     = useAuthStore(s => s.permissions);

  // Still validating the stored token — render nothing to avoid a flash
  if (isLoading) return null;

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (!permissions.has(permission)) return <Navigate to="/unauthorized" replace />;

  return <>{children}</>;
}

// ── Simple unauthorized page ──────────────────────────────────────────────────

export function UnauthorizedPage() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#070C1A', color: '#F0F4FF', fontFamily: 'system-ui, sans-serif',
      gap: 16, textAlign: 'center', padding: 32,
    }}>
      <div style={{ fontSize: 48 }}>🔒</div>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Access denied</h1>
      <p style={{ color: 'rgba(240,244,255,.55)', margin: 0 }}>
        You don't have permission to view this page.
      </p>
      <a
        href="/"
        style={{
          marginTop: 8, padding: '10px 24px', borderRadius: 8,
          background: '#4F8EF7', color: '#fff', fontWeight: 700,
          textDecoration: 'none', fontSize: 14,
        }}
      >
        Go home
      </a>
    </div>
  );
}
