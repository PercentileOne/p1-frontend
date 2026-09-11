// Dashboard "What Candidates Are Doing" card — logs the real job title a candidate is
// interviewing for right now (InterviewPackStart.tsx, same moment logInDemandSubjects fires),
// and reads back the real top-active-roles ranking. Fire-and-forget on the log side — a
// logging failure should never block starting the interview.

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

export interface RoleActivity {
  jobTitle: string;
  count: number;
}

export async function logRoleActivity(token: string, jobTitle: string): Promise<void> {
  if (!jobTitle.trim()) return;
  try {
    await fetch(`${API_BASE}/api/role-activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ jobTitle }),
    });
  } catch { /* best-effort only — never blocks starting the interview */ }
}

export async function getRoleActivity(): Promise<RoleActivity[]> {
  const res = await fetch(`${API_BASE}/api/role-activity`);
  if (!res.ok) throw new Error(`Failed to load role activity: ${res.status}`);
  return res.json();
}
