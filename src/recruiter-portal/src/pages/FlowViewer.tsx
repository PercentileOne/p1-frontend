import { useState, useEffect, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FlowEvent {
  id: string;
  sessionId: string;
  timestamp: string;
  flowStage: string;
  payload: Record<string, unknown>;
}

interface Session {
  sessionId: string;
  events: FlowEvent[];
  firstSeen: string;
  lastSeen: string;
}

// ── Stage colours ─────────────────────────────────────────────────────────────

const STAGE_COLOUR: Record<string, string> = {
  ENTRY_CLICK:            '#60a5fa',
  UPLOAD_SCREEN_VIEW:     '#818cf8',
  JOB_SPEC_UPLOADED:      '#34d399',
  CV_UPLOADED:            '#34d399',
  LANGUAGE_SELECTED:      '#a78bfa',
  START_INTERVIEW_CLICKED:'#facc15',
  MIKE_INTRO_STARTED:     '#fb923c',
  MIKE_INTRO_COMPLETED:   '#f97316',
  INTERVIEW_PHASE_STARTED:'#4ade80',
  QUESTION_GENERATED:     '#2dd4bf',
  QUESTION_DISPLAYED:     '#38bdf8',
  ANSWER_RECEIVED:        '#f472b6',
  QUESTION_COMPLETED:     '#a3e635',
};

function stageColour(stage: string) {
  return STAGE_COLOUR[stage] ?? 'rgba(255,255,255,0.35)';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function shortId(id: string) {
  return id.slice(0, 8) + '…';
}

function durationLabel(first: string, last: string) {
  const ms = new Date(last).getTime() - new Date(first).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

// ── Session row ───────────────────────────────────────────────────────────────

function SessionRow({ session }: { session: Session }) {
  const [open, setOpen] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const stages = session.events.map(e => e.flowStage);
  const hasJobSpec = session.events.some(e => e.payload.hasJobSpec || e.flowStage === 'JOB_SPEC_UPLOADED');
  const hasCv = session.events.some(e => e.payload.hasCv || e.flowStage === 'CV_UPLOADED');
  const lang = session.events.find(e => e.flowStage === 'LANGUAGE_SELECTED')?.payload.language as string | undefined
    ?? session.events.find(e => e.payload.selectedLanguage)?.payload.selectedLanguage as string | undefined;

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', marginBottom: '10px' }}>
      {/* Session header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', textAlign: 'left' }}
      >
        {/* Expand chevron */}
        <span style={{ color: 'var(--text-3)', fontSize: '11px', flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>▶</span>

        {/* Session ID */}
        <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--blue)', flexShrink: 0, minWidth: '90px' }}>{shortId(session.sessionId)}</span>

        {/* Stage pills — first 8 */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
          {stages.slice(0, 8).map((s, i) => (
            <span key={i} style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.04em', padding: '2px 6px', borderRadius: '4px', background: `${stageColour(s)}22`, color: stageColour(s), border: `1px solid ${stageColour(s)}44`, whiteSpace: 'nowrap' }}>
              {s.replace(/_/g, ' ')}
            </span>
          ))}
          {stages.length > 8 && (
            <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>+{stages.length - 8} more</span>
          )}
        </div>

        {/* Meta */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0, marginLeft: 'auto' }}>
          {lang && <span style={{ fontSize: '10px', color: '#a78bfa', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '4px', padding: '2px 6px' }}>{lang.toUpperCase()}</span>}
          {hasJobSpec && <span style={{ fontSize: '10px', color: '#34d399' }}>JS</span>}
          {hasCv && <span style={{ fontSize: '10px', color: '#34d399' }}>CV</span>}
          <span style={{ fontSize: '11px', color: 'var(--text-3)', minWidth: '36px', textAlign: 'right' }}>{session.events.length} events</span>
          <span style={{ fontSize: '11px', color: 'var(--text-3)', minWidth: '52px', textAlign: 'right' }}>{durationLabel(session.firstSeen, session.lastSeen)}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-3)', minWidth: '80px', textAlign: 'right' }}>{fmtDate(session.firstSeen)}</span>
        </div>
      </button>

      {/* Event list */}
      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '0 20px 16px' }}>
          {/* Full session ID */}
          <div style={{ padding: '10px 0 12px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-3)' }}>
            Session: {session.sessionId}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {session.events.map((ev, i) => {
              const isExpanded = expandedEvent === ev.id;
              const hasPayload = Object.keys(ev.payload ?? {}).length > 0;
              return (
                <div key={ev.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  {/* Timeline line */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: '3px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: stageColour(ev.flowStage), flexShrink: 0 }} />
                    {i < session.events.length - 1 && <div style={{ width: '1px', flex: 1, minHeight: '14px', background: 'var(--border)', marginTop: '3px' }} />}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      onClick={() => hasPayload && setExpandedEvent(isExpanded ? null : ev.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: hasPayload ? 'pointer' : 'default', padding: '2px 0' }}
                    >
                      <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-3)', flexShrink: 0, minWidth: '76px' }}>{fmt(ev.timestamp)}</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: stageColour(ev.flowStage), letterSpacing: '0.03em' }}>{ev.flowStage}</span>
                      {hasPayload && (
                        <span style={{ fontSize: '10px', color: 'var(--text-3)', marginLeft: 'auto', flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</span>
                      )}
                    </div>

                    {isExpanded && hasPayload && (
                      <pre style={{
                        marginTop: '6px', marginBottom: '4px',
                        background: 'var(--bg3)', border: '1px solid var(--border)',
                        borderRadius: '8px', padding: '12px',
                        fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-2)',
                        lineHeight: 1.6, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                      }}>
                        {JSON.stringify(ev.payload, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FlowViewer() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/flow-logs');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { ok: boolean; events: FlowEvent[]; error?: string };
      if (!data.ok) throw new Error(data.error ?? 'Unknown error');

      // Group by sessionId, sort events within each session by timestamp asc
      const map = new Map<string, FlowEvent[]>();
      for (const ev of data.events) {
        if (!map.has(ev.sessionId)) map.set(ev.sessionId, []);
        map.get(ev.sessionId)!.push(ev);
      }

      const grouped: Session[] = [];
      for (const [sessionId, evs] of map) {
        evs.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        grouped.push({
          sessionId,
          events: evs,
          firstSeen: evs[0].timestamp,
          lastSeen: evs[evs.length - 1].timestamp,
        });
      }
      // Sessions newest first
      grouped.sort((a, b) => b.firstSeen.localeCompare(a.firstSeen));

      setSessions(grouped);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filter
  const searchLower = search.toLowerCase();
  const visible = sessions.filter(s => {
    if (searchLower && !s.sessionId.toLowerCase().includes(searchLower) && !s.events.some(e => e.flowStage.toLowerCase().includes(searchLower))) return false;
    if (stageFilter && !s.events.some(e => e.flowStage === stageFilter)) return false;
    return true;
  });

  const allStages = [...new Set(sessions.flatMap(s => s.events.map(e => e.flowStage)))].sort();

  const totalEvents = sessions.reduce((n, s) => n + s.events.length, 0);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: '-apple-system,"Segoe UI",sans-serif', color: 'var(--text)' }}>

      {/* Header */}
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: '4px' }}>InterviewMe · Admin</div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>Flow Viewer</h1>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          {[
            { label: 'Sessions', value: sessions.length },
            { label: 'Events', value: totalEvents },
            { label: 'Last refresh', value: lastRefresh ? lastRefresh.toLocaleTimeString('en-GB') : '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{label}</div>
            </div>
          ))}
          <button
            onClick={load}
            disabled={loading}
            style={{ background: loading ? 'rgba(79,142,247,0.3)' : 'var(--blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 700, cursor: loading ? 'default' : 'pointer' }}
          >
            {loading ? 'Loading…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 24px 48px' }}>

        {/* Error banner */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', fontSize: '13px', color: '#ef4444' }}>
            <strong>Error loading logs:</strong> {error}
            {error.includes('COSMOS') || error.includes('configured') ? (
              <div style={{ marginTop: '6px', color: 'rgba(239,68,68,0.7)', fontSize: '12px' }}>
                Set <code>COSMOS_ENDPOINT</code> and <code>COSMOS_KEY</code> in Azure Application Settings (or <code>local.settings.json</code> for local dev).
              </div>
            ) : null}
          </div>
        )}

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search session ID or stage…"
            style={{ flex: 1, minWidth: '200px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '9px', padding: '10px 14px', color: 'var(--text)', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
          />
          <select
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value)}
            style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '9px', padding: '10px 14px', color: 'var(--text)', fontSize: '13px', fontFamily: 'inherit', outline: 'none', cursor: 'pointer', minWidth: '200px' }}
          >
            <option value=''>All stages</option>
            {allStages.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {(search || stageFilter) && (
            <button onClick={() => { setSearch(''); setStageFilter(''); }} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '9px', padding: '10px 14px', color: 'var(--text-3)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Clear
            </button>
          )}
        </div>

        {/* Stage legend */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {Object.entries(STAGE_COLOUR).map(([stage, colour]) => (
            <button
              key={stage}
              onClick={() => setStageFilter(stageFilter === stage ? '' : stage)}
              style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.04em', padding: '3px 7px', borderRadius: '4px', border: `1px solid ${stageFilter === stage ? colour : colour + '44'}`, background: stageFilter === stage ? `${colour}33` : `${colour}11`, color: colour, cursor: 'pointer' }}
            >
              {stage.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Results label */}
        {!loading && sessions.length > 0 && (
          <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '14px' }}>
            Showing {visible.length} of {sessions.length} sessions
          </div>
        )}

        {/* Session list */}
        {loading && sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-3)', fontSize: '14px' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>⟳</div>
            Loading flow logs…
          </div>
        ) : visible.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-3)', fontSize: '14px' }}>
            {sessions.length === 0
              ? 'No flow events yet. Run an interview to see logs here.'
              : 'No sessions match your filter.'}
          </div>
        ) : (
          visible.map(s => <SessionRow key={s.sessionId} session={s} />)
        )}
      </div>
    </div>
  );
}
