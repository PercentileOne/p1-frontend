/* ══════════════════════════════════════════════════════════════
   PERMISSIONS STORE — Phase 11
   Student controls what universities can see.
   ══════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";

// ── Types ──────────────────────────────────────────────────────────

export type PermissionLevel =
  | "full"       // full cognitive profile
  | "partial"    // mastery + mock scores, no timeline
  | "readiness"  // only readiness score
  | "none";      // completely private

export interface StudentPermission {
  studentId:       string;
  universityId:    string;
  permissionLevel: PermissionLevel;
  grantedAt:       Date;
}

// ── Singleton ──────────────────────────────────────────────────────

// Default: all students share full with demo university
let _permissions: Record<string, StudentPermission> = {
  "u-001:uni-001": { studentId: "u-001", universityId: "uni-001", permissionLevel: "full",     grantedAt: new Date() },
  "u-002:uni-001": { studentId: "u-002", universityId: "uni-001", permissionLevel: "full",     grantedAt: new Date() },
  "u-003:uni-001": { studentId: "u-003", universityId: "uni-001", permissionLevel: "none",     grantedAt: new Date() },
  "u-004:uni-001": { studentId: "u-004", universityId: "uni-001", permissionLevel: "full",     grantedAt: new Date() },
  "u-005:uni-001": { studentId: "u-005", universityId: "uni-001", permissionLevel: "partial",  grantedAt: new Date() },
  "u-006:uni-001": { studentId: "u-006", universityId: "uni-001", permissionLevel: "none",     grantedAt: new Date() },
  "u-007:uni-001": { studentId: "u-007", universityId: "uni-001", permissionLevel: "full",     grantedAt: new Date() },
  "u-008:uni-001": { studentId: "u-008", universityId: "uni-001", permissionLevel: "readiness",grantedAt: new Date() },
};

const _listeners = new Set<() => void>();
function _notify() { _listeners.forEach(l => l()); }

export function getPermission(studentId: string, universityId: string): PermissionLevel {
  return _permissions[`${studentId}:${universityId}`]?.permissionLevel ?? "none";
}

export function setPermission(studentId: string, universityId: string, level: PermissionLevel): void {
  _permissions = {
    ..._permissions,
    [`${studentId}:${universityId}`]: {
      studentId,
      universityId,
      permissionLevel: level,
      grantedAt: new Date(),
    },
  };
  _notify();
}

export function usePermissionsStore() {
  const [, rerender] = useState(0);
  useEffect(() => {
    const sync = () => rerender(n => n + 1);
    _listeners.add(sync);
    return () => { _listeners.delete(sync); };
  }, []);
  return { getPermission, setPermission };
}

export type PermissionsStore = ReturnType<typeof usePermissionsStore>;
