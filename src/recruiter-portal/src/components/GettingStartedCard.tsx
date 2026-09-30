import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { interviewPrepsApi } from '../api/interviewPrepsApi'
import { clientGiftsApi } from '../api/clientGiftsApi'
import { alertsApi } from '../api/alertsApi'
import { teamApi } from '../api/teamApi'

// "Getting started" checklist on the recruiter Dashboard (Francis, 2026-09-30). A tour nobody finishes is the wrong help — this gets a new
// recruiter to the moments where the product proves itself. Steps tick themselves from what the recruiter has really done (their own sent
// preps / gifts / alerts / team posts), so it is never a chore to maintain. Failures are silent: a step that can't be checked simply stays open.

const DISMISS_KEY = 'tic.gettingstarted.dismissed'
const HELP_VISITED_KEY = 'tic.help.visited'

interface Step { key: string; label: string; hint: string; nav: string; done: boolean }

function readFlag(key: string): boolean { try { return localStorage.getItem(key) === '1' } catch { return false } }

export function GettingStartedCard({ token, onNavigate }: { token: string | null; onNavigate: (label: string) => void }) {
  const [dismissed, setDismissed] = useState(() => readFlag(DISMISS_KEY))
  const [done, setDone] = useState<Record<string, boolean> | null>(null)

  useEffect(() => {
    if (!token || dismissed) return
    let cancelled = false
    Promise.allSettled([
      interviewPrepsApi.list(token),
      clientGiftsApi.list(token),
      alertsApi.list(token),
      teamApi.posts(token, 5),
    ]).then(([preps, gifts, alerts, posts]) => {
      if (cancelled) return
      const has = (r: PromiseSettledResult<unknown[]>) => r.status === 'fulfilled' && r.value.length > 0
      setDone({
        prep: has(preps as PromiseSettledResult<unknown[]>),
        gift: has(gifts as PromiseSettledResult<unknown[]>),
        alert: has(alerts as PromiseSettledResult<unknown[]>),
        team: has(posts as PromiseSettledResult<unknown[]>),
        help: readFlag(HELP_VISITED_KEY),
      })
    })
    return () => { cancelled = true }
  }, [token, dismissed])

  if (dismissed || !done) return null

  const steps: Step[] = [
    { key: 'prep', label: 'Send an Interview Prep to a candidate', hint: 'Give them a tailored practice interview for the real role.', nav: 'Interview Preps', done: done.prep },
    { key: 'gift', label: 'Gift your client some interview questions', hint: 'Free with your seat — a set of up to 50.', nav: 'Client Gifts', done: done.gift },
    { key: 'alert', label: 'Set a talent alert', hint: 'Be told when a candidate scores above your bar.', nav: 'Alerts', done: done.alert },
    { key: 'team', label: 'Say hello to your team', hint: 'Post a first update on the Team page.', nav: 'Team', done: done.team },
    { key: 'help', label: 'Look around the Help Centre', hint: 'Short answers, one task at a time.', nav: 'Help', done: done.help },
  ]
  const count = steps.filter(s => s.done).length
  const allDone = count === steps.length

  function dismiss() { try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* ignore */ } setDismissed(true) }

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid rgba(52,211,153,0.28)', borderRadius: 14, padding: '18px 22px', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text)' }}>{allDone ? "You're all set 🎉" : 'Getting started'}</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>{allDone ? 'You have tried everything the portal is built around. Hide this whenever you like.' : `${count} of ${steps.length} done — a few quick wins that show what this portal is for.`}</div>
        </div>
        <button onClick={dismiss} aria-label="Hide getting started" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2, display: 'flex' }}><X size={16} /></button>
      </div>

      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)', marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(count / steps.length) * 100}%`, background: 'linear-gradient(90deg,#34D399,#047857)', borderRadius: 3, transition: 'width 0.3s' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map(s => (
          <button
            key={s.key}
            onClick={() => onNavigate(s.nav)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', width: '100%', padding: '10px 12px', borderRadius: 10, fontFamily: 'inherit', cursor: 'pointer',
              border: '1px solid var(--border)', background: s.done ? 'rgba(52,211,153,0.06)' : 'transparent' }}
          >
            <span style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `2px solid ${s.done ? '#34D399' : 'var(--border)'}`, background: s.done ? '#34D399' : 'transparent' }}>
              {s.done && <Check size={13} color="#04120c" strokeWidth={3} />}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: s.done ? 'var(--text-3)' : 'var(--text)', textDecoration: s.done ? 'line-through' : 'none' }}>{s.label}</span>
              {!s.done && <span style={{ display: 'block', fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{s.hint}</span>}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
