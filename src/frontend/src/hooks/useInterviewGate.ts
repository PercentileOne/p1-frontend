import { useCallback, useState } from 'react';
import { useAuthStore } from '../auth/authStore';
import { startInterview, type StartInterviewResult } from '../api/entitlementsApi';

// The single check every "start an interview" button goes through (Francis, 2026-09-21). `begin()` asks the server whether this
// person may start now — and, if so, records the start (using the taster / a pass session / a daily slot). It resolves to the
// usage id when allowed, or null when the paywall should show (`blocked` then holds the reason).
//
//   const { begin, checking, blocked, dismiss } = useInterviewGate();
//   const go = async () => { const ok = await begin(); if (!ok) return; navigate(...) };
//
// While the server's enforcement switch is off this always allows, so wiring it in changes nothing for anyone.
export function useInterviewGate() {
  const token = useAuthStore(s => s.token);
  const [checking, setChecking] = useState(false);
  const [blocked, setBlocked] = useState<StartInterviewResult | null>(null);

  const begin = useCallback(async (): Promise<{ allowed: boolean; usageId: string | null }> => {
    if (!token) return { allowed: true, usageId: null };
    setChecking(true);
    try {
      const r = await startInterview(token);
      if (!r.allowed) { setBlocked(r); return { allowed: false, usageId: null }; }
      return { allowed: true, usageId: r.usageId };
    } finally {
      setChecking(false);
    }
  }, [token]);

  return { begin, checking, blocked, dismiss: () => setBlocked(null) };
}
