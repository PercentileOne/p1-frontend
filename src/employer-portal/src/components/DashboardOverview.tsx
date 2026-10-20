import { useEffect, useState } from 'react'
import { introductionsApi, type Introduction } from '../api/introductionsApi'

// The employer Dashboard's activity summary (Francis, 2026-10-20), built from the introductions actually sent to this employer and nothing else.
// It replaces a mock-up that showed the same invented figures and candidates to every employer.

type Status = Introduction['status']

const LABEL: Record<Status, string> = { sent: 'New', viewed: 'Viewed', accepted: 'Accepted', declined: 'Declined' }
const COLOUR: Record<Status, { fg: string; bg: string }> = {
  sent: { fg: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  viewed: { fg: '#4F8EF7', bg: 'rgba(79,142,247,0.12)' },
  accepted: { fg: '#34D399', bg: 'rgba(52,211,153,0.12)' },
  declined: { fg: 'var(--text-3)', bg: 'rgba(255,255,255,0.06)' },
}

export function summarise(intros: Introduction[]) {
  const n = (s: Status[]) => intros.filter(i => s.includes(i.status)).length
  return { received: intros.length, waiting: n(['sent', 'viewed']), unseen: n(['sent']), accepted: n(['accepted']), declined: n(['declined']) }
}

const tile: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }
const shortDate = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }

export function DashboardOverview({ token, onNavigate }: { token: string | null; onNavigate: (label: string) => void }) {
  const [intros, setIntros] = useState<Introduction[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    introductionsApi.received(token).then(i => { if (!cancelled) setIntros(Array.isArray(i) ? i : []) }).catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [token])

  if (failed) return <div style={{ ...tile, fontSize: 13, color: 'var(--text-3)' }}>Your introductions could not be loaded just now. Open Introductions from the menu to see them.</div>
  if (!intros) return <div style={{ ...tile, fontSize: 13, color: 'var(--text-3)' }}>Loading your introductions…</div>

  if (intros.length === 0) {
    return (
      <div style={{ ...tile, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Your introductions</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.55, maxWidth: 560 }}>No candidate has been introduced to you yet. When a recruiter or a candidate sends you an introduction, you will see it here and can watch their interview.</div>
        <div><button type="button" onClick={() => onNavigate('Candidate Marketplace')} style={{ background: '#34D399', color: '#06210f', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Search the Candidate Marketplace</button></div>
      </div>
    )
  }

  const s = summarise(intros)
  const recent = [...intros].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')).slice(0, 6)
  const tiles: { label: string; value: number; note: string; colour: string }[] = [
    { label: 'Received', value: s.received, note: 'Introductions sent to you', colour: '#4F8EF7' },
    { label: 'Waiting for you', value: s.waiting, note: s.unseen === 0 ? 'You have viewed them all' : `${s.unseen} not viewed yet`, colour: '#F59E0B' },
    { label: 'Accepted', value: s.accepted, note: 'Candidates you said yes to', colour: '#34D399' },
    { label: 'Declined', value: s.declined, note: 'Candidates you passed on', colour: '#A78BFA' },
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
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Recent introductions</div>
          <button type="button" onClick={() => onNavigate('Introductions')} style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>See all →</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {recent.map((p, i) => {
            const c = COLOUR[p.status]
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflowWrap: 'anywhere' }}>{p.candidateName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', overflowWrap: 'anywhere' }}>{[p.candidateRole, p.senderName ? `from ${p.senderName}` : ''].filter(Boolean).join(' · ')}</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{shortDate(p.createdAt)}</div>
                {p.overallScore != null && <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>{Math.round(p.overallScore)}%</div>}
                <span style={{ fontSize: 11, fontWeight: 700, color: c.fg, background: c.bg, padding: '3px 10px', borderRadius: 20 }}>{LABEL[p.status]}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
