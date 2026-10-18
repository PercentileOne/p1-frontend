import { useState } from 'react';
import { CalendarClock, Plus, Trash2, X } from 'lucide-react';
import { upcoming, whenText } from '../api/nextInterviewApi';
import type { NextInterview, NextInterviewInput } from '../api/nextInterviewApi';
import { localDate } from '../api/routinesApi';

// The Dashboard's "Next interview" card (Francis, 2026-10-18). With nothing listed it asks once, gently: "Do you have an interview coming up?"
// With interviews listed it shows the soonest big and the next two small, with a countdown. A date is all that is needed; role and company are optional.

const GREEN = '#34D399';
const DISMISS_KEY = 'tic_next_interview_dismissed';
const field: React.CSSProperties = {
  width: '100%', background: 'var(--bg3, rgba(255,255,255,0.04))', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 11px',
  color: 'var(--text)', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};
const lab: React.CSSProperties = { fontSize: 12, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.03em' };

function pretty(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}
function dismissedToday(): boolean {
  try { return localStorage.getItem(DISMISS_KEY) === localDate(); } catch { return false; }
}

export function NextInterviewCard({ items, loaded, onAdd, onRemove }: {
  items: NextInterview[]; loaded: boolean;
  onAdd: (input: NextInterviewInput) => Promise<void>; onRemove: (id: string) => Promise<void>;
}) {
  const today = localDate();
  const list = upcoming(items, today);
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(dismissedToday);
  const [date, setDate] = useState('');
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState('');

  if (!loaded) return null;
  if (list.length === 0 && hidden && !open) return null;

  async function save() {
    if (!date) { setProblem('Choose the date of the interview.'); return; }
    if (date < today) { setProblem('That date has already passed.'); return; }
    setProblem(''); setSaving(true);
    try { await onAdd({ date, role: role.trim(), company: company.trim() }); setOpen(false); setDate(''); setRole(''); setCompany(''); }
    catch (e) { setProblem((e as Error).message || 'That did not save. Try again.'); }
    finally { setSaving(false); }
  }
  function notNow() { try { localStorage.setItem(DISMISS_KEY, today); } catch { /* it will just ask again */ } setHidden(true); }

  const next = list[0];
  const rest = list.slice(1, 3);

  return (
    <div style={{ marginBottom: 20, padding: '16px 20px', borderRadius: 16, border: `1px solid ${next ? 'var(--border)' : 'rgba(52,211,153,0.5)'}`, background: next ? 'var(--bg2)' : 'rgba(52,211,153,0.06)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(52,211,153,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: GREEN, flexShrink: 0 }}><CalendarClock size={20} /></div>
        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
          {next ? (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-3)' }}>NEXT INTERVIEW</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', overflowWrap: 'anywhere' }}>
                {next.role || 'Your interview'}{next.company ? ` at ${next.company}` : ''}
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--text-3)' }}>
                <span style={{ color: GREEN, fontWeight: 700 }}>{whenText(next.date, today)}</span> · {pretty(next.date)}{next.source === 'recruiter' && next.from ? ` · sent by ${next.from}` : ''}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Do you have an interview coming up?</div>
              <div style={{ fontSize: 13.5, color: 'var(--text-3)' }}>Tell us the date and we will count down with you. You can change or remove it any time.</div>
            </>
          )}
        </div>
        {!open && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: next ? 'none' : GREEN, color: next ? GREEN : '#04130d', border: next ? '1px solid rgba(52,211,153,0.4)' : 'none', borderRadius: 10, padding: '8px 14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Plus size={15} /> {next ? 'Add another' : 'Yes, add it'}
            </button>
            {!next && <button type="button" onClick={notNow} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', color: 'var(--text-2, var(--text))', fontFamily: 'inherit' }}>Not now</button>}
          </div>
        )}
      </div>

      {rest.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          {rest.map(i => (
            <li key={i.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13.5, color: 'var(--text)' }}>
              <span style={{ overflowWrap: 'anywhere' }}>{i.role || 'Interview'}{i.company ? ` at ${i.company}` : ''}</span>
              <span style={{ color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{whenText(i.date, today)} · {pretty(i.date)}</span>
            </li>
          ))}
        </ul>
      )}

      {next && next.source === 'self' && !open && (
        <button type="button" onClick={() => void onRemove(next.id)} aria-label={`Remove ${next.role || 'this interview'}`} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontSize: 12.5 }}>
          <Trash2 size={13} /> Remove this one
        </button>
      )}

      {open && (
        <div role="group" aria-label="Add an interview" style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            <div><label htmlFor="niDate" style={lab}>DATE</label><input id="niDate" type="date" min={today} value={date} onChange={e => setDate(e.target.value)} style={field} /></div>
            <div><label htmlFor="niRole" style={lab}>ROLE (OPTIONAL)</label><input id="niRole" value={role} maxLength={120} onChange={e => setRole(e.target.value)} placeholder="Software Engineer" style={field} /></div>
            <div><label htmlFor="niCompany" style={lab}>COMPANY (OPTIONAL)</label><input id="niCompany" value={company} maxLength={120} onChange={e => setCompany(e.target.value)} style={field} /></div>
          </div>
          {problem && <div role="alert" style={{ color: '#F87171', fontSize: 13 }}>{problem}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" disabled={saving} onClick={() => void save()} style={{ background: GREEN, color: '#04130d', border: 'none', borderRadius: 10, padding: '9px 16px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{saving ? 'Saving…' : 'Save interview'}</button>
            <button type="button" onClick={() => { setOpen(false); setProblem(''); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 16px', cursor: 'pointer', color: 'var(--text-2, var(--text))', fontFamily: 'inherit' }}><X size={14} /> Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
