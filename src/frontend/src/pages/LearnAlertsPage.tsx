import { useEffect, useState, useCallback } from 'react';
import { X, Trash2, Pause, Play, Flame, Globe, Lock, Pencil, ChevronDown } from 'lucide-react';
import {
  createLearnAlert, listLearnAlerts, updateLearnAlert, deleteLearnAlert, fetchLearnAlertsSummary,
  type LearnAlert, type LearnAlertSummary,
} from '../api/learnAlertsApi';
import { generateHotTopics } from '../api/aiScoring';

const DIFFICULTIES: LearnAlert['difficulty'][] = ['Standard', 'Pro', 'Expert'];
const DURATIONS = [1, 2, 3];

// Hours between questions, not days — someone prepping for an interview 3 days out wants
// several questions a day, not one every few days (Francis, 2026-09-13). Spans "3x/day" (8h)
// through to a once-a-week trickle.
const INTERVAL_PRESETS: { label: string; hours: number }[] = [
  { label: 'Every 4 hrs', hours: 4 },
  { label: 'Every 6 hrs', hours: 6 },
  { label: 'Every 8 hrs', hours: 8 },
  { label: 'Every 12 hrs', hours: 12 },
  { label: 'Daily', hours: 24 },
  { label: 'Every 2 days', hours: 48 },
  { label: 'Every 3 days', hours: 72 },
  { label: 'Every 5 days', hours: 120 },
  { label: 'Weekly', hours: 168 },
];

function formatInterval(hours: number): string {
  const preset = INTERVAL_PRESETS.find(p => p.hours === hours);
  if (preset) return preset.label;
  return hours < 24 ? `Every ${hours} hrs` : `Every ${Math.round(hours / 24)} days`;
}

function statusColor(status: LearnAlert['status']) {
  if (status === 'active') return '#34D399';
  if (status === 'paused') return '#F59E0B';
  return 'var(--text-3)';
}

const thStyle: React.CSSProperties = {
  padding: '12px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: 'var(--text-3)', textAlign: 'left',
  whiteSpace: 'nowrap', userSelect: 'none',
};

// Copied-then-trimmed from MyTalksPage.tsx's list shell — same card list / status pill / modal
// language, adapted for a create-with-several-fields flow (Job Title, Difficulty, Frequency,
// Duration, Visibility) instead of a one-click "New Talk" that just navigates. Each alert's
// actual sending happens server-side (LearnAlertsSendService) — this page only sets criteria
// and shows the running stats it produces.
export default function LearnAlertsPage() {
  const [items, setItems] = useState<LearnAlert[] | null>(null);
  const [summary, setSummary] = useState<LearnAlertSummary | null>(null);
  const [error, setError] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<LearnAlert | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const [visibilityMenuOpen, setVisibilityMenuOpen] = useState(false);
  const [bulkConfirmTarget, setBulkConfirmTarget] = useState<boolean | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = () => {
    listLearnAlerts().then(setItems).catch(() => setError(true));
    fetchLearnAlertsSummary().then(setSummary);
  };

  useEffect(() => { load(); }, []);

  async function togglePause(alert: LearnAlert) {
    setBusyIds(prev => new Set(prev).add(alert.id));
    try {
      const nextStatus = alert.status === 'active' ? 'paused' : 'active';
      const updated = await updateLearnAlert(alert.id, { status: nextStatus });
      setItems(prev => prev?.map(a => (a.id === alert.id ? updated : a)) ?? null);
    } catch {
      setActionError(`Couldn't update "${alert.jobTitle}" — try again.`);
    } finally {
      setBusyIds(prev => { const n = new Set(prev); n.delete(alert.id); return n; });
    }
  }

  async function toggleVisibility(alert: LearnAlert) {
    setBusyIds(prev => new Set(prev).add(alert.id));
    try {
      const nextVisibility = alert.visibility === 'public' ? 'hidden' : 'public';
      const updated = await updateLearnAlert(alert.id, { visibility: nextVisibility });
      setItems(prev => prev?.map(a => (a.id === alert.id ? updated : a)) ?? null);
    } catch {
      setActionError(`Couldn't update "${alert.jobTitle}" — try again.`);
    } finally {
      setBusyIds(prev => { const n = new Set(prev); n.delete(alert.id); return n; });
    }
  }

  // No dedicated bulk endpoint on the backend (unlike Talks' POST /api/talks/visibility) — at
  // Learn Alerts' realistic per-candidate volume (a handful of alerts, not hundreds), a plain
  // Promise.all of the same per-item PATCH the row toggle already uses is simpler than adding
  // one just for this.
  async function applyBulkVisibility(isPublic: boolean) {
    if (!items || items.length === 0) return;
    setBulkBusy(true);
    try {
      const targetVisibility: LearnAlert['visibility'] = isPublic ? 'public' : 'hidden';
      const updated = await Promise.all(items.map(a => updateLearnAlert(a.id, { visibility: targetVisibility })));
      setItems(updated);
      setBulkConfirmTarget(null);
    } catch {
      setActionError("Couldn't update all your alerts — try again.");
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleDelete(alert: LearnAlert) {
    setItems(prev => prev?.filter(a => a.id !== alert.id) ?? null);
    try { await deleteLearnAlert(alert.id); } catch { /* best-effort */ }
  }

  return (
    <div style={{ padding: '0 0 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>Learn Alerts</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
            {summary
              ? `${summary.totalCorrect}/${summary.totalSent} correct · 🔥 ${summary.bestCurrentStreak}-question streak (best ${summary.bestLongestStreak})`
              : 'One quick multiple-choice question at a time, straight to your inbox.'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {items && items.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setVisibilityMenuOpen(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-2)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Alert Visibility <ChevronDown size={13} />
              </button>
              {visibilityMenuOpen && (
                <>
                  <div onClick={() => setVisibilityMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 20 }} />
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 21, minWidth: 240, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 12px 32px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
                    <button onClick={() => { setBulkConfirmTarget(true); setVisibilityMenuOpen(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                      <Globe size={15} color="#34D399" /> Make all alerts Public
                    </button>
                    <button onClick={() => { setBulkConfirmTarget(false); setVisibilityMenuOpen(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'none', border: 'none', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                      <Lock size={15} color="var(--text-3)" /> Make all alerts Hidden
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          <button
            onClick={() => setCreateOpen(true)}
            style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #34D399, #4F8EF7)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            🧠 New Alert
          </button>
        </div>
      </div>

      {actionError && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 12, color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
          {actionError}
          <button onClick={() => setActionError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', display: 'flex', padding: 0 }}><X size={13} /></button>
        </div>
      )}

      {items === null && !error && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', flexDirection: 'column', gap: 14, color: 'var(--text-3)' }}>
          <span style={{ fontSize: 26, animation: 'spin 1.2s linear infinite', display: 'inline-block' }}>⟳</span>
          <div style={{ fontSize: 13 }}>Loading your alerts…</div>
          <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {error && (
        <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-3)' }}>
          Couldn't load your alerts right now — try refreshing.
        </div>
      )}

      {items?.length === 0 && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '56px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <div style={{ fontSize: 32 }}>🧠</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>No Learn Alerts yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 380 }}>
            Set one up for a job title and we'll email you one multiple-choice question at a time, on whatever cadence you choose.
          </div>
        </div>
      )}

      {items && items.length > 0 && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={thStyle}>Job Title</th>
                  <th style={thStyle}>Difficulty</th>
                  <th style={thStyle}>Every</th>
                  <th style={thStyle}>Streak</th>
                  <th style={thStyle}>Correct</th>
                  <th style={thStyle}>Visibility</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle} />
                </tr>
              </thead>
              <tbody>
                {items.map((alert, i) => {
                  const busy = busyIds.has(alert.id);
                  return (
                    <tr key={alert.id} style={{ background: i % 2 === 1 ? 'rgba(255,255,255,0.025)' : 'transparent' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{alert.jobTitle}</div>
                        {alert.specialFocus.length > 0 && (
                          <div style={{ fontSize: 11, color: '#a78bfa', marginTop: 4 }}>
                            🎯 {alert.specialFocus.join(', ')}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-2)' }}>{alert.difficulty}</td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-2)' }}>{formatInterval(alert.intervalHours)}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: alert.currentStreak > 0 ? '#F59E0B' : 'var(--text-3)' }}>
                          <Flame size={13} fill={alert.currentStreak > 0 ? '#F59E0B' : 'none'} /> {alert.currentStreak} <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(best {alert.longestStreak})</span>
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-2)' }}>{alert.correctCount}/{alert.sentCount}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <button
                          onClick={() => toggleVisibility(alert)}
                          disabled={busy}
                          title={alert.visibility === 'public' ? 'Public — click to make hidden.' : 'Hidden — click to make public.'}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: busy ? 'default' : 'pointer', padding: 0, opacity: busy ? 0.5 : 1, fontFamily: 'inherit' }}
                        >
                          <span style={{ width: 34, height: 18, borderRadius: 20, background: alert.visibility === 'public' ? '#34D399' : 'rgba(255,255,255,0.14)', position: 'relative', flexShrink: 0 }}>
                            <span style={{ position: 'absolute', top: 2, left: alert.visibility === 'public' ? 18 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff' }} />
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: alert.visibility === 'public' ? '#34D399' : 'var(--text-3)' }}>
                            {alert.visibility === 'public' ? <Globe size={12} /> : <Lock size={12} />}
                            {alert.visibility === 'public' ? 'Public' : 'Hidden'}
                          </span>
                        </button>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: statusColor(alert.status), background: `${statusColor(alert.status)}18`, padding: '4px 10px', borderRadius: 20, textTransform: 'capitalize' }}>
                          {alert.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <button title="Edit" onClick={() => setEditingAlert(alert)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 2 }}>
                            <Pencil size={13} />
                          </button>
                          {alert.status !== 'completed' && (
                            <button onClick={() => togglePause(alert)} disabled={busy} title={alert.status === 'active' ? 'Pause' : 'Resume'}
                              style={{ background: 'none', border: 'none', cursor: busy ? 'default' : 'pointer', color: 'var(--text-3)', display: 'flex', padding: 2, opacity: busy ? 0.5 : 1 }}>
                              {alert.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                            </button>
                          )}
                          <button title="Delete" onClick={() => handleDelete(alert)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 2, opacity: 0.6 }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {createOpen && (
        <AlertModal
          onClose={() => setCreateOpen(false)}
          onSaved={alert => { setItems(prev => [alert, ...(prev ?? [])]); setCreateOpen(false); }}
        />
      )}

      {editingAlert && (
        <AlertModal
          initial={editingAlert}
          onClose={() => setEditingAlert(null)}
          onSaved={alert => { setItems(prev => prev?.map(a => (a.id === alert.id ? alert : a)) ?? null); setEditingAlert(null); }}
        />
      )}

      {bulkConfirmTarget !== null && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => !bulkBusy && setBulkConfirmTarget(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              {bulkConfirmTarget ? <Globe size={20} color="#34D399" /> : <Lock size={20} color="var(--text-3)" />}
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Make all alerts {bulkConfirmTarget ? 'Public' : 'Hidden'}?</div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 24 }}>
              {bulkConfirmTarget
                ? `This makes all ${(items ?? []).length} of your Learn Alerts visible to other candidates.`
                : `This immediately hides all ${(items ?? []).length} of your Learn Alerts from other candidates. Nothing is deleted or paused.`}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setBulkConfirmTarget(null)} disabled={bulkBusy} style={{ flex: 1, padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text-2)', fontSize: 13, fontWeight: 700, cursor: bulkBusy ? 'default' : 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={() => applyBulkVisibility(bulkConfirmTarget)} disabled={bulkBusy} style={{ flex: 1, padding: '12px 16px', borderRadius: 10, border: 'none', color: '#fff', fontSize: 13, fontWeight: 800, cursor: bulkBusy ? 'default' : 'pointer', fontFamily: 'inherit', background: bulkConfirmTarget ? 'linear-gradient(135deg, #34D399, #059669)' : 'linear-gradient(135deg, #64748b, #475569)', opacity: bulkBusy ? 0.7 : 1 }}>
                {bulkBusy ? 'Updating…' : `Yes, make all ${bulkConfirmTarget ? 'Public' : 'Hidden'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Doubles as both the "New Learn Alert" and "Edit Learn Alert" form — same fields either way,
// just seeded from an existing alert and calling updateLearnAlert instead of createLearnAlert
// when `initial` is given, rather than maintaining two near-identical forms.
function AlertModal({ initial, onClose, onSaved }: { initial?: LearnAlert; onClose: () => void; onSaved: (a: LearnAlert) => void }) {
  const [jobTitle, setJobTitle] = useState(initial?.jobTitle ?? '');
  const [difficulty, setDifficulty] = useState<LearnAlert['difficulty']>(initial?.difficulty ?? 'Pro');
  const [specialFocusInput, setSpecialFocusInput] = useState('');
  const [specialFocusChips, setSpecialFocusChips] = useState<string[]>(initial?.specialFocus ?? []);
  const [hotTopicsLoading, setHotTopicsLoading] = useState(false);
  const [intervalHours, setIntervalHours] = useState(initial?.intervalHours ?? 24);
  const [durationMonths, setDurationMonths] = useState(initial?.durationMonths ?? 1);
  const [visibility, setVisibility] = useState<LearnAlert['visibility']>(initial?.visibility ?? 'hidden');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = jobTitle.trim().length > 2;

  // Same "narrow question generation toward specific named topics" concept as
  // InterviewPackStart.tsx's own Special Focus — reuses the identical chip-input + "What's Hot"
  // AI-suggestion pattern (and the same generateHotTopics call) rather than reinventing it, now
  // that Learn Alerts sends recurring questions where narrowing to real topics genuinely matters.
  const addSpecialFocusChip = useCallback((raw: string) => {
    const value = raw.trim();
    if (!value) return;
    setSpecialFocusChips(prev => prev.some(c => c.toLowerCase() === value.toLowerCase()) ? prev : [...prev, value]);
  }, []);

  const removeSpecialFocusChip = useCallback((value: string) => {
    setSpecialFocusChips(prev => prev.filter(c => c !== value));
  }, []);

  const handleWhatsHot = useCallback(async () => {
    if (!jobTitle.trim() || hotTopicsLoading) return;
    setHotTopicsLoading(true);
    try {
      const topics = await generateHotTopics(jobTitle.trim());
      topics.forEach(addSpecialFocusChip);
    } finally {
      setHotTopicsLoading(false);
    }
  }, [jobTitle, hotTopicsLoading, addSpecialFocusChip]);

  async function submit() {
    if (!canSubmit || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const fields = { jobTitle: jobTitle.trim(), difficulty, specialFocus: specialFocusChips, intervalHours, durationMonths, visibility };
      const alert = initial ? await updateLearnAlert(initial.id, fields) : await createLearnAlert(fields);
      onSaved(alert);
    } catch {
      setErr(`Couldn't ${initial ? 'save' : 'create'} that alert — try again.`);
    } finally {
      setBusy(false);
    }
  }

  const pill = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px', borderRadius: 20, border: '1px solid',
    fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    background: active ? 'rgba(52,211,153,0.15)' : 'transparent',
    borderColor: active ? 'rgba(52,211,153,0.5)' : 'var(--border)',
    color: active ? '#34D399' : 'var(--text-3)',
  });

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>🧠 {initial ? 'Edit Learn Alert' : 'New Learn Alert'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 4 }}><X size={18} /></button>
        </div>

        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: 6 }}>Job Title</label>
        <input
          value={jobTitle}
          onChange={e => setJobTitle(e.target.value)}
          placeholder="e.g. Head of Prime Brokerage Technology"
          style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit', marginBottom: 18 }} />

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: 6 }}>
          Special Focus <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional — narrows questions to specific topics)</span>
        </label>
        <div style={{ display: 'flex', gap: 8, marginBottom: specialFocusChips.length > 0 ? 10 : 18 }}>
          <input
            value={specialFocusInput}
            onChange={e => setSpecialFocusInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addSpecialFocusChip(specialFocusInput);
                setSpecialFocusInput('');
              }
            }}
            placeholder="e.g. Agentic AI Patterns — press Enter to add"
            style={{ flex: 1, boxSizing: 'border-box', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }} />
          <button
            type="button"
            onClick={handleWhatsHot}
            disabled={!jobTitle.trim() || hotTopicsLoading}
            title={!jobTitle.trim() ? 'Enter a job title first' : undefined}
            style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(167,139,250,0.12)',
              border: '1px solid rgba(167,139,250,0.35)', borderRadius: 8, padding: '0 16px', color: '#a78bfa',
              fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: !jobTitle.trim() || hotTopicsLoading ? 'not-allowed' : 'pointer',
              opacity: !jobTitle.trim() ? 0.5 : 1,
            }}>
            {hotTopicsLoading ? (
              <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(167,139,250,0.25)', borderTopColor: '#a78bfa', animation: 'lhotspin 0.7s linear infinite' }} />
            ) : '🔥'}
            What's Hot
          </button>
        </div>
        <style>{`@keyframes lhotspin { to { transform: rotate(360deg) } }`}</style>
        {specialFocusChips.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
            {specialFocusChips.map(chip => (
              <span key={chip} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 20, padding: '5px 6px 5px 12px', fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>
                {chip}
                <button type="button" onClick={() => removeSpecialFocusChip(chip)} aria-label={`Remove ${chip}`}
                  style={{ width: 16, height: 16, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.08)', color: 'var(--text-3)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}

        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: 6 }}>Difficulty</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {DIFFICULTIES.map(d => <button key={d} onClick={() => setDifficulty(d)} style={pill(difficulty === d)}>{d}</button>)}
        </div>

        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: 6 }}>
          Frequency — {formatInterval(intervalHours).toLowerCase()}
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          {INTERVAL_PRESETS.map(p => (
            <button key={p.hours} onClick={() => setIntervalHours(p.hours)} style={pill(intervalHours === p.hours)}>{p.label}</button>
          ))}
        </div>

        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: 6 }}>Duration</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {DURATIONS.map(m => <button key={m} onClick={() => setDurationMonths(m)} style={pill(durationMonths === m)}>{m} month{m === 1 ? '' : 's'}</button>)}
        </div>

        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: 6 }}>Visibility</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button onClick={() => setVisibility('hidden')} style={pill(visibility === 'hidden')}><Lock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />Hidden</button>
          <button onClick={() => setVisibility('public')} style={pill(visibility === 'public')}><Globe size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />Public</button>
        </div>

        {err && <div style={{ fontSize: 12, color: '#EF4444', marginBottom: 14 }}>{err}</div>}

        <button onClick={submit} disabled={!canSubmit || busy}
          style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: 'none', color: '#fff', fontSize: 13, fontWeight: 800, cursor: canSubmit && !busy ? 'pointer' : 'default', fontFamily: 'inherit', background: 'linear-gradient(135deg, #34D399, #059669)', opacity: canSubmit && !busy ? 1 : 0.5 }}>
          {busy ? (initial ? 'Saving…' : 'Creating…') : (initial ? 'Save Changes' : 'Create Alert')}
        </button>
      </div>
    </div>
  );
}
