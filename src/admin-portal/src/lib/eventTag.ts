// The campaign tag an event arrived with (Francis, 2026-10-19: "tag columns"). A tagged link such as ?utm_source=linkedin&utm_medium=organic&utm_campaign=cvcard is stored in the event's metadata:
// the candidate portal writes utm_src / utm_med / utm_camp on every event, and the marketing site writes src on every event and med / camp (now on every event too, before that only on the page view).
// This reads either spelling, so the Activity Log can show where a visit came from in its own column.

export interface EventTag { source: string; medium: string; campaign: string }

function pick(meta: Record<string, unknown> | null | undefined, ...keys: string[]): string {
  for (const k of keys) {
    const v = meta?.[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

/** The tag on an event, or null when it has none at all. */
export function eventTag(meta: Record<string, unknown> | null | undefined): EventTag | null {
  const tag = { source: pick(meta, 'utm_src', 'src'), medium: pick(meta, 'utm_med', 'med'), campaign: pick(meta, 'utm_camp', 'camp') };
  return tag.source || tag.medium || tag.campaign ? tag : null;
}

/** Short text for a table cell: "linkedin · cvcard" (source and campaign), falling back to the medium, or a dash. */
export function tagLabel(tag: EventTag | null): string {
  if (!tag) return '—';
  return [tag.source, tag.campaign].filter(Boolean).join(' · ') || tag.medium;
}

/** The full tag in words, for a tooltip and the detail view. */
export function tagTitle(tag: EventTag | null): string {
  if (!tag) return 'No campaign tag on this event';
  return [tag.source && `source: ${tag.source}`, tag.medium && `medium: ${tag.medium}`, tag.campaign && `campaign: ${tag.campaign}`].filter(Boolean).join(' | ');
}
