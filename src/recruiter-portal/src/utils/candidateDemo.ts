// The recruiter portal no longer runs interviews of its own (Francis, 2026-10-18). Anywhere it used to open its own interview room, it now opens the candidate
// portal's "Try it live" demo instead: the same interviewers, live faces and screens a candidate sees, no sign-in, and nothing recorded against any candidate.
const CANDIDATE_APP = 'https://candidate.theinterviewchair.com';

/**
 * Link to the demo. With both a role and a first name the demo starts by itself (that is how the page works); with less, it opens its form.
 * `from` says where the click came from (it shows in the Activity Log), at most 20 characters.
 */
export function candidateDemoUrl(opts: { role?: string; level?: string; name?: string; from?: string } = {}): string {
  const q = new URLSearchParams();
  const role = (opts.role ?? '').trim().slice(0, 90);
  const name = (opts.name ?? '').trim().slice(0, 40);
  if (role) q.set('topic', role);
  if (name) q.set('name', name);
  if (opts.level) q.set('level', opts.level);
  if (role && name) q.set('go', '1');
  q.set('from', (opts.from ?? 'recruiter').slice(0, 20));
  return `${CANDIDATE_APP}/try?${q.toString()}`;
}

/** Open the demo in a new tab. */
export function openCandidateDemo(opts: Parameters<typeof candidateDemoUrl>[0] = {}): void {
  window.open(candidateDemoUrl(opts), '_blank', 'noopener');
}
