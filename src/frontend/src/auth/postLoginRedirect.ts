// "Take me back to what I was doing" after sign-in (Francis, 2026-09-21) — e.g. someone clicks Subscribe on the marketing site, lands
// on /subscription signed out, signs in, and should end up on /subscription, not the dashboard. Only same-site paths are ever used (no
// open redirect), and the memory expires after 6 hours (creating an account can involve checking an email first). localStorage, not sessionStorage: the email-verification link can open a new tab.
const KEY = 'postLoginPath';
const TTL_MS = 6 * 60 * 60 * 1000;

export function rememberPostLoginPath(path: string): void {
  try {
    if (!path.startsWith('/') || path.startsWith('//') || path === '/' || path.startsWith('/login') || path.startsWith('/auth/')) return;
    localStorage.setItem(KEY, JSON.stringify({ path, at: Date.now() }));
  } catch { /* private mode — falls back to the dashboard */ }
}

// Reads ?next= from the URL (set by the sign-in gate and the email-verification redirect) and remembers it — only /subscription is honoured.
export function rememberNextFromSearch(search: string): void {
  try {
    const n = new URLSearchParams(search).get('next');
    if (n === '/subscription') rememberPostLoginPath(n);
  } catch { /* ignore */ }
}

export function consumePostLoginPath(fallback: string): string {
  try {
    const raw = localStorage.getItem(KEY);
    localStorage.removeItem(KEY);
    if (!raw) return fallback;
    const { path, at } = JSON.parse(raw) as { path: string; at: number };
    if (Date.now() - at > TTL_MS || !path.startsWith('/') || path.startsWith('//')) return fallback;
    return path;
  } catch { return fallback; }
}

// The role someone practised on the public "Try it live" page, carried through account creation (Francis, 2026-10-03) so the full interview's setup opens
// with it already filled in. It arrives in the callback URL's #fragment (never sent to a server), is kept briefly, and is used once.
const TRY_ROLE_KEY = 'tryRole';

export function rememberTryRoleFromHash(hash: string): void {
  try {
    const role = (new URLSearchParams(hash.replace(/^#/, '')).get('role') ?? '').replace(/[\p{Cc}<>]/gu, '').trim().slice(0, 90);
    if (role) localStorage.setItem(TRY_ROLE_KEY, JSON.stringify({ role, at: Date.now() }));
  } catch { /* private mode — they simply type the role in */ }
}

export function consumeTryRole(): string {
  try {
    const raw = localStorage.getItem(TRY_ROLE_KEY);
    localStorage.removeItem(TRY_ROLE_KEY);
    if (!raw) return '';
    const { role, at } = JSON.parse(raw) as { role: string; at: number };
    return Date.now() - at > TTL_MS || typeof role !== 'string' ? '' : role;
  } catch { return ''; }
}
