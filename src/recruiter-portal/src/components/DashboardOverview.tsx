import { useEffect, useState } from 'react'
import { interviewPrepsApi, type InterviewPrep } from '../api/interviewPrepsApi'

// The recruiter Dashboard's activity summary (Francis, 2026-10-20), built from the recruiter's own Interview Preps and nothing else.
// It replaces a mock-up that showed the same invented figures, candidates and news to every recruiter. A recruiter sees how far each candidate has got
// (opened, practised, finished) and never their answers or scores, the same rule as the Interview Preps page.

type Stage = 'finished' | 'practised' | 'opened' | 'waiting'

export function stageOf(p: InterviewPrep): Stage {
  if (p.finishedAt || (p.completedAttempts ?? 0) > 0) return 'finished'
  if (p.startedAt || (p.attempts ?? 0) > 0) return 'practised'
  if (p.openedAt) return 'opened'
  return 'waiting'
}

const STAGE_LABEL: Record<Stage, string> = { finished: 'Finished', practised: 'Practising', opened: 'Opened', waiting: 'Not opened yet' }
const STAGE_COLOUR: Record<Stage, { fg: string; bg: string }> = {
  finished: { fg: '#34D399', bg: 'rgba(52,211,153,0.12)' },
  practised: { fg: '#4F8EF7', bg: 'rgba(79,142,247,0.12)' },
  opened: { fg: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  waiting: { fg: 'var(--text-3)', bg: 'rgba(255,255,255,0.06)' },
}

export function summarise(preps: InterviewPrep[]) {
  const stages = preps.map(stageOf)
  const count = (s: Stage[]) => stages.filter(x => s.includes(x)).length
  return { sent: preps.length, opened: count(['opened', 'practised', 'finished']), practised: count(['practised', 'finished']), finished: count(['finished']), waiting: count(['waiting']) }
}

const tile: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }
const shortDate = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }

export function DashboardOverview({ token, onNavigate }: { token: string | null; onNavigate: (label: string) => void }) {
  const [preps, setPreps] = useState<InterviewPrep[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    interviewPrepsApi.list(token).then(p => { if (!cancelled) setPreps(Array.isArray(p) ? p : []) }).catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [token])

  if (failed) return <div style={{ ...tile, fontSize: 13, color: 'var(--text-3)' }}>Your Interview Prep activity could not be loaded just now. Open Interview Preps from the menu to see it.</div>
  if (!preps) return <div style={{ ...tile, fontSize: 13, color: 'var(--text-3)' }}>Loading your Interview Prep activity…</div>

  if (preps.length === 0) {
    return (
      <div style={{ ...tile, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Your Interview Prep activity</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.55, maxWidth: 560 }}>You have not sent an Interview Prep yet. Once you have, you will see here whether each candidate opened it, practised and finished.</div>
        <div><button type="button" onClick={() => onNavigate('Interview Preps')} style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Send an Interview Prep</button></div>
      </div>
    )
  }

  const s = summarise(preps)
  const recent = [...preps].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')).slice(0, 6)
  const tiles: { label: string; value: number; note: string; colour: string }[] = [
    { label: 'Sent', value: s.sent, note: s.waiting === 0 ? 'All opened' : `${s.waiting} not opened yet`, colour: '#4F8EF7' },
    { label: 'Opened', value: s.opened, note: 'Candidates who opened theirs', colour: '#F59E0B' },
    { label: 'Practised', value: s.practised, note: 'Started at least one interview', colour: '#A78BFA' },
    { label: 'Finished', value: s.finished, note: 'Completed an interview', colour: '#34D399' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {tiles.map(t => (
          <div key={t.label} style={tile}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.colour, marginBottom: 8 }}>{t.label}</div>
            <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text)', lineHeight: 1 }}>{t.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>{t.note}</div>
          </div>
        ))}
      </div>

      <div style={tile}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Recent Interview Preps</div>
          <button type="button" onClick={() => onNavigate('Interview Preps')} style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>See all →</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {recent.map((p, i) => {
            const st = stageOf(p)
            const c = STAGE_COLOUR[st]
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflowWrap: 'anywhere' }}>{`${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || p.email}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', overflowWrap: 'anywhere' }}>{p.role}</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Sent {shortDate(p.createdAt)}</div>
                <span style={{ fontSize: 11, fontWeight: 700, color: c.fg, background: c.bg, padding: '3px 10px', borderRadius: 20 }}>
                  {STAGE_LABEL[st]}{st === 'practised' && (p.attempts ?? 0) > 1 ? ` · ${p.attempts} tries` : ''}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
