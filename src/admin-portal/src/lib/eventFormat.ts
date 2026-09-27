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

// An IP address says which NETWORK a device is on, not where the person is. Fixed broadband usually lands in the right
// town, but mobile data (EE, Vodafone, O2, Three) is routed through a few big gateways, so a phone in Colchester can be
// placed in Leyton or Walsall (Francis, 2026-09-20). The country is dependable; the city is a guess. The list shows
// "City, Country" again (Francis, 2026-09-21, so he can see where visitors come from); the detail view keeps them apart and
// labels the city as a guess.
export function describeLocation(e: LocationParts): string {
  return e.country || '—';
}

export function describeCityAndCountry(e: LocationParts): string {
  // In the USA a city alone is ambiguous (Portland, Springfield…), so the state is shown too: "Austin, Texas, United States".
  if (e.city && e.region && e.country === 'United States') return `${e.city}, ${e.region}, ${e.country}`;
  if (e.city && e.country) return `${e.city}, ${e.country}`;
  return e.city || e.country || '—';
}

export function describeCityGuess(e: LocationParts): string {
  if (!e.city) return 'No city guess';
  const region = e.region && e.region !== e.city ? `, ${e.region}` : '';
  const miles = e.accuracyKm ? ` (±${Math.max(1, Math.round(e.accuracyKm * 0.621371))} mi claimed)` : '';
  return `${e.city}${region}${miles} — an IP-based guess; often wrong, especially on mobile data`;
}

// What actually happened, in plain words, from an event's metadata (Francis, 2026-09-28: "it just says
// 'interaction' and things like modal_open but not what modal — it would be nice to see exactly what
// they're doing"). track.js (marketing) and flowLogger.ts (candidate app) both attach these fields — see
// their own comments for exactly what each event type carries. Returns '' when there is nothing worth
// showing, so callers can skip the line entirely rather than print an empty one.
export function describeEvent(eventType: string, metadata: Record<string, unknown> | null | undefined): string {
  const m = metadata ?? {};
  const s = (v: unknown): string | undefined => (v === undefined || v === null || v === '' ? undefined : String(v));
  switch (eventType) {
    case 'menu_click': case 'cta_click': case 'link_click': {
      const label = s(m.label); const area = s(m.area);
      if (label && area) return `“${label}” (${area})`;
      return label ? `“${label}”` : (area ? `in ${area}` : '');
    }
    case 'modal_open': { const name = s(m.name); return name ? `“${name}” modal` : ''; }
    case 'section_view': { const sec = s(m.section); return sec ? `section: ${sec}` : ''; }
    case 'scroll_depth': { const pct = s(m.pct); return pct ? `scrolled ${pct}%` : ''; }
    case 'faq_open': { const q = s(m.q); return q ? `“${q}”` : ''; }
    case 'try_submit': case 'try_started': { const topic = s(m.topic); return topic ? `role: “${topic}”` : ''; }
    case 'try_first_question': return m.avatar ? 'live avatar' : 'voice + photo';
    case 'try_completed': { const score = s(m.score); return score ? `score: ${score}` : ''; }
    case 'try_blocked': { const reason = s(m.reason); return reason ? `reason: ${reason}` : ''; }
    case 'page_leave': {
      const sec = s(m.sec); const max = s(m.max);
      if (!sec) return '';
      return max ? `${sec}s on page, ${max}% scrolled` : `${sec}s on page`;
    }
    case 'interaction': { const kind = s(m.kind); return kind ? `first action: ${kind}` : ''; }
    default: {
      // Unrecognised event type — show whatever's in the metadata rather than nothing, skipping the
      // always-present src/dev tracking fields that add no information here.
      const entries = Object.entries(m).filter(([k, v]) => k !== 'src' && k !== 'dev' && k !== 'mobile' && s(v) !== undefined);
      if (entries.length === 0) return '';
      return entries.slice(0, 2).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(', ');
    }
  }
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
