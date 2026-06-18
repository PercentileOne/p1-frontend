/* ══════════════════════════════════════════════════════════════
   PARENT CONTROLS STORE — Phase 10
   Safety settings per child. All local until Phase 11 backend.
   ══════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";

// ── Types ──────────────────────────────────────────────────────────

export interface ParentControls {
  childId:              string;
  dailyStudyLimitMins:  number;        // 0 = no limit
  bedtimeLock:          string | null; // "21:30" format or null
  schoolSafeMode:       boolean;
  multiplayerDisabled:  boolean;
  chatDisabled:         boolean;
  focusModeOnly:        boolean;
  notifyOnLowReadiness: boolean;       // alert parent if score drops below 40%
  weeklyReportEnabled:  boolean;
}

// ── Defaults ───────────────────────────────────────────────────────

function defaultControls(childId: string): ParentControls {
  return {
    childId,
    dailyStudyLimitMins:  120,
    bedtimeLock:          "21:30",
    schoolSafeMode:       true,
    multiplayerDisabled:  false,
    chatDisabled:         false,
    focusModeOnly:        false,
    notifyOnLowReadiness: true,
    weeklyReportEnabled:  true,
  };
}

// ── Store singleton ────────────────────────────────────────────────

let _controls: Record<string, ParentControls> = {
  "child-001": defaultControls("child-001"),
};
const _listeners = new Set<() => void>();
function _notify() { _listeners.forEach(l => l()); }

export function getControls(childId: string): ParentControls {
  return _controls[childId] ?? defaultControls(childId);
}

export function updateControls(childId: string, patch: Partial<ParentControls>): void {
  _controls = {
    ..._controls,
    [childId]: { ...(getControls(childId)), ...patch },
  };
  _notify();
}

export function useParentControlsStore() {
  const [controls, setControls] = useState(_controls);

  useEffect(() => {
    const sync = () => setControls({ ..._controls });
    _listeners.add(sync);
    return () => { _listeners.delete(sync); };
  }, []);

  return {
    getControls: (childId: string) => controls[childId] ?? defaultControls(childId),
    updateControls,
  };
}

export type ParentControlsStore = ReturnType<typeof useParentControlsStore>;
