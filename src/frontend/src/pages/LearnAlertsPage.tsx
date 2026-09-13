import { useEffect, useState } from 'react';
import { X, Trash2, Pause, Play, Flame, Globe, Lock } from 'lucide-react';
import {
  createLearnAlert, listLearnAlerts, updateLearnAlert, deleteLearnAlert, fetchLearnAlertsSummary,
  type LearnAlert, type LearnAlertSummary,
} from '../api/learnAlertsApi';

const DIFFICULTIES: LearnAlert['difficulty'][] = ['Standard', 'Pro', 'Expert'];
const DURATIONS = [1, 2, 3];

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
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);

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
        <button
          onClick={() => setCreateOpen(true)}
          style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #34D399, #4F8EF7)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          🧠 New Alert
        </button>
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
                        <div style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          {alert.visibility === 'public' ? <Globe size={11} /> : <Lock size={11} />}
                          {alert.visibility === 'public' ? 'Public' : 'Hidden'}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-2)' }}>{alert.difficulty}</td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-2)' }}>{alert.frequencyDays} day{alert.frequencyDays === 1 ? '' : 's'}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: alert.currentStreak > 0 ? '#F59E0B' : 'var(--text-3)' }}>
                          <Flame size={13} fill={alert.currentStreak > 0 ? '#F59E0B' : 'none'} /> {alert.currentStreak} <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(best {alert.longestStreak})</span>
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-2)' }}>{alert.correctCount}/{alert.sentCount}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: statusColor(alert.status), background: `${statusColor(alert.status)}18`, padding: '4px 10px', borderRadius: 20, textTransform: 'capitalize' }}>
                          {alert.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
        <NewAlertModal
          onClose={() => setCreateOpen(false)}
          onCreated={alert => { setItems(prev => [alert, ...(prev ?? [])]); setCreateOpen(false); }}
        />
      )}
    </div>
  );
}

function NewAlertModal({ onClose, onCreated }: { onClose: () => void; onCreated: (a: LearnAlert) => void }) {
  const [jobTitle, setJobTitle] = useState('');
  const [difficulty, setDifficulty] = useState<LearnAlert['difficulty']>('Pro');
  const [frequencyDays, setFrequencyDays] = useState(3);
  const [durationMonths, setDurationMonths] = useState(1);
  const [visibility, setVisibility] = useState<LearnAlert['visibility']>('hidden');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = jobTitle.trim().length > 2;

  async function submit() {
    if (!canSubmit || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const alert = await createLearnAlert({ jobTitle: jobTitle.trim(), difficulty, frequencyDays, durationMonths, visibility });
      onCreated(alert);
    } catch {
      setErr("Couldn't create that alert — try again.");
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
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>🧠 New Learn Alert</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 4 }}><X size={18} /></button>
        </div>

        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: 6 }}>Job Title</label>
        <input
          value={jobTitle}
          onChange={e => setJobTitle(e.target.value)}
          placeholder="e.g. Head of Prime Brokerage Technology"
          style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit', marginBottom: 18 }} />

        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: 6 }}>Difficulty</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {DIFFICULTIES.map(d => <button key={d} onClick={() => setDifficulty(d)} style={pill(difficulty === d)}>{d}</button>)}
        </div>

        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: 6 }}>
          Frequency — every {frequencyDays} day{frequencyDays === 1 ? '' : 's'}
        </label>
        <input type="range" min={1} max={7} value={frequencyDays} onChange={e => setFrequencyDays(Number(e.target.value))}
          style={{ width: '100%', marginBottom: 18 }} />

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
          {busy ? 'Creating…' : 'Create Alert'}
        </button>
      </div>
    </div>
  );
}
