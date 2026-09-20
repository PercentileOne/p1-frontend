// Human-readable helpers for the Activity Log (Francis, 2026-09-20): a raw user-agent string and a bare "city"
// made a phone's reloading tabs look like mystery logins. These make device and location honest at a glance.

// "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_1 like Mac OS X) … CriOS/153 …" -> "iPhone · Chrome"
export function describeDevice(ua: string | null | undefined): string {
  if (!ua) return '—';
  const os =
    /iPhone/.test(ua) ? 'iPhone'
    : /iPad/.test(ua) ? 'iPad'
    : /Android/.test(ua) ? 'Android'
    : /Windows/.test(ua) ? 'Windows'
    : /Macintosh|Mac OS X/.test(ua) ? 'Mac'
    : /CrOS/.test(ua) ? 'ChromeOS'
    : /Linux/.test(ua) ? 'Linux'
    : /bot|crawler|spider|preview/i.test(ua) ? 'Bot'
    : 'Unknown';
  const browser =
    /Edg(e|A|iOS)?\//.test(ua) ? 'Edge'
    : /OPR\/|Opera/.test(ua) ? 'Opera'
    : /CriOS\//.test(ua) ? 'Chrome'
    : /FxiOS\/|Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) ? 'Safari'
    : 'Browser';
  return `${os} · ${browser}`;
}

interface LocationParts {
  city?: string | null;
  region?: string | null;
  country?: string | null;
  accuracyKm?: number | null;
}

// IP geolocation is approximate by nature (it finds the network's location, not the person's), so it is shown as
// "≈" with the database's own accuracy radius when known, in miles.
export function describeLocation(e: LocationParts, opts: { withRegion?: boolean } = {}): string {
  const parts = [
    e.city,
    opts.withRegion && e.region && e.region !== e.city ? e.region : null,
    e.country,
  ].filter((p): p is string => !!p);
  if (parts.length === 0) return '—';
  const miles = e.accuracyKm ? Math.max(1, Math.round(e.accuracyKm * 0.621371)) : null;
  return `≈ ${parts.join(', ')}${miles ? ` (±${miles} mi)` : ''}`;
}

// "3 days ago" / "5 hours ago" / "just now" — for how old a sign-in token is.
export function ageOf(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return '—';
  const ms = now - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const mins = Math.round(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} days ago`;
}
