import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, ArrowLeft, Send, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { clientGiftsApi, type ClientGiftSummary, type ApiError } from '../api/clientGiftsApi'
import { type Career, searchCareers, reportMissingCareerTitle } from '../api/careersApi'

// "Gift interview questions to your client" (Francis, 2026-09-23, from a real conversation with
// Mike Petrie at Vallum Associates): a recruiter preps the CANDIDATE via Interview Preps, but can
// also gift the CLIENT — the hiring-side interviewer — their own free batch of questions, branded
// as a gift from the recruiter/agency. Free with the seat, no Stripe. Deliberately a much larger
// count than a candidate's own pack (default 50) so the client never fears they got the
// candidate's own list. Same job role + same client email reuses the last generated set instead
// of paying for a fresh Model Router call every time — tick "Send different questions" to force
// a regenerate. "Client" is deliberately the word used here — see backend Features/ClientGifts
// for why the underlying fields are still employerEmail/employerCompany.
const DIFFICULTIES: { value: string; color: string; desc: string }[] = [
  { value: 'Standard', color: '#34D399', desc: 'Well-rounded questions to build genuine confidence.' },
  { value: 'Pro', color: '#F59E0B', desc: 'Challenging questions that probe deeper.' },
  { value: 'Expert', color: '#EF4444', desc: 'Intense, technical — treated like the leading authority in the field.' },
]
const SELECT_CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`

function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>
      {children} {optional && <span style={{ opacity: 0.6, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10,
  padding: '13px 16px', color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'inherit',
}

type View = 'list' | 'form'

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
    + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function levelColor(level: string) {
  return level === 'Standard' ? '#34D399' : level === 'Expert' ? '#EF4444' : '#F59E0B'
}

// ── Send form ─────────────────────────────────────────────────────────────

function SendGiftForm({ prefill, onSent, onCancel }: { prefill?: ClientGiftSummary; onSent: () => void; onCancel: () => void }) {
  const { token } = useAuth()
  const [employerEmail, setEmployerEmail] = useState(prefill?.employerEmail ?? '')
  const [employerCompany, setEmployerCompany] = useState(prefill?.employerCompany ?? '')
  const [jobTitle, setJobTitle] = useState(prefill?.jobRole ?? '')
  const [difficulty, setDifficulty] = useState(prefill?.difficulty ?? 'Pro')
  const [count, setCount] = useState(prefill?.count ?? 50)
  const [message, setMessage] = useState(prefill ? '' : "Thought this would help you prep too — happy hiring!")
  const [regenerate, setRegenerate] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  const [apiErr, setApiErr] = useState('')

  const [jobTitleSuggestions, setJobTitleSuggestions] = useState<Career[]>([])
  const [showJobTitleSuggestions, setShowJobTitleSuggestions] = useState(false)
  const [searchingJobTitle, setSearchingJobTitle] = useState(false)
  const jobTitleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const jobTitleRequestIdRef = useRef(0)
  const lastMatchedTitleRef = useRef<string | null>(null)

  const handleJobTitleChange = useCallback((value: string) => {
    setJobTitle(value)
    if (jobTitleDebounceRef.current) clearTimeout(jobTitleDebounceRef.current)
    if (value.trim().length < 2) {
      jobTitleRequestIdRef.current++
      setJobTitleSuggestions([])
      setShowJobTitleSuggestions(false)
      setSearchingJobTitle(false)
      return
    }
    jobTitleDebounceRef.current = setTimeout(async () => {
      const requestId = ++jobTitleRequestIdRef.current
      setSearchingJobTitle(true)
      setShowJobTitleSuggestions(true)
      const results = await searchCareers(value, 8)
      if (requestId !== jobTitleRequestIdRef.current) return
      setSearchingJobTitle(false)
      setJobTitleSuggestions(results)
      setShowJobTitleSuggestions(results.length > 0)
    }, 180)
  }, [])

  const selectJobTitleSuggestion = useCallback((c: Career) => {
    setJobTitle(c.title)
    lastMatchedTitleRef.current = c.title
    setShowJobTitleSuggestions(false)
  }, [])

  const handleJobTitleBlur = useCallback(() => {
    setTimeout(() => setShowJobTitleSuggestions(false), 150)
    const typed = jobTitle.trim()
    if (typed.length < 3 || typed === lastMatchedTitleRef.current) return
    const matchesKnownCareer = jobTitleSuggestions.some(c => c.title.toLowerCase() === typed.toLowerCase())
    if (!matchesKnownCareer) {
      lastMatchedTitleRef.current = typed
      void reportMissingCareerTitle(typed)
    }
  }, [jobTitle, jobTitleSuggestions])

  function validate() {
    const e: Record<string, string> = {}
    if (!employerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employerEmail.trim())) e.employerEmail = 'A valid client email is required.'
    if (jobTitle.trim().length < 2) e.jobTitle = 'Tell us the job role.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const [result, setResult] = useState<{ reused: boolean; count: number } | null>(null)

  async function handleSubmit() {
    if (!validate() || !token) return
    setApiErr('')
    setSending(true)
    try {
      const res = await clientGiftsApi.send(token, {
        employerEmail: employerEmail.trim().toLowerCase(),
        employerCompany: employerCompany.trim() || undefined,
        jobRole: jobTitle.trim(),
        difficulty,
        count,
        message: message.trim() || undefined,
        regenerate,
      })
      setResult({ reused: res.reused, count: res.count })
    } catch (err) {
      setApiErr((err as ApiError).error ?? 'Failed to send gift.')
    } finally {
      setSending(false)
    }
  }

  if (result) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', padding: '60px 0' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🎁</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>Gift sent to {employerEmail}</div>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20, maxWidth: 380, margin: '0 auto 20px' }}>
          {result.reused
            ? `They've been sent the same ${result.count}-question set from last time — no repeat generation needed.`
            : `A brand new set of ${result.count} interview questions for ${jobTitle}, ready for them to view and download — no account needed on their end.`}
        </p>
        <button onClick={onSent} style={{ padding: '10px 24px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Done</button>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
      <button onClick={onCancel} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20, padding: 0 }}>
        <ArrowLeft size={14} /> Back to Client Gifts
      </button>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>Gift Interview Questions to a Client</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.6, maxWidth: 560 }}>
          Your client gets a branded, no-login email with a printable set of interview questions — a much bigger set than any candidate's own pack, so there's never a worry they've seen the same list.
        </p>
      </div>

      <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <FieldLabel>Client email</FieldLabel>
          <input type="email" value={employerEmail} onChange={e => setEmployerEmail(e.target.value)} placeholder="hiring.manager@company.com" style={inputStyle} autoFocus />
          {errors.employerEmail && <div style={{ fontSize: 11, color: '#F87171', marginTop: 6 }}>{errors.employerEmail}</div>}
        </div>
        <div>
          <FieldLabel optional>Client company</FieldLabel>
          <input value={employerCompany} onChange={e => setEmployerCompany(e.target.value)} placeholder="e.g. Acme Ltd" style={inputStyle} />
        </div>

        <div style={{ position: 'relative' }}>
          <FieldLabel>Job role they're interviewing for</FieldLabel>
          <input
            type="text"
            value={jobTitle}
            onChange={e => handleJobTitleChange(e.target.value)}
            onFocus={() => { if (jobTitleSuggestions.length > 0) setShowJobTitleSuggestions(true) }}
            onBlur={handleJobTitleBlur}
            autoComplete="off"
            placeholder="e.g. Head of Engineering, Senior Product Manager…"
            style={inputStyle}
          />
          {errors.jobTitle && <div style={{ fontSize: 11, color: '#F87171', marginTop: 6 }}>{errors.jobTitle}</div>}
          {showJobTitleSuggestions && (searchingJobTitle || jobTitleSuggestions.length > 0) && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#0d0c1e', border: '1px solid rgba(79,142,247,0.3)', borderRadius: 10, overflow: 'hidden', zIndex: 20, boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}>
              {searchingJobTitle ? (
                <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-3)' }}>Searching…</div>
              ) : jobTitleSuggestions.map(c => (
                <div
                  key={c.id}
                  onMouseDown={() => selectJobTitleSuggestion(c)}
                  style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(79,142,247,0.1)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.category}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <FieldLabel>Difficulty</FieldLabel>
            <div style={{ display: 'flex', gap: 8 }}>
              {DIFFICULTIES.map(d => {
                const active = difficulty === d.value
                return (
                  <button key={d.value} type="button" onClick={() => setDifficulty(d.value)} title={d.desc} style={{
                    flex: 1, background: active ? `${d.color}22` : 'var(--bg3)', border: `1px solid ${active ? d.color : 'var(--border)'}`,
                    color: active ? d.color : 'var(--text-2)', borderRadius: 10, padding: '10px 8px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}>{d.value}</button>
                )
              })}
            </div>
          </div>
          <div style={{ width: 110 }}>
            <FieldLabel>How many</FieldLabel>
            <select
              value={count}
              onChange={e => setCount(Number(e.target.value))}
              style={{ ...inputStyle, cursor: 'pointer', appearance: 'none', backgroundImage: SELECT_CHEVRON, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' }}
            >
              {Array.from({ length: 50 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <div>
          <FieldLabel optional>Personal message</FieldLabel>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit' }} />
        </div>

        {prefill && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-2)', cursor: 'pointer' }}>
            <input type="checkbox" checked={regenerate} onChange={e => setRegenerate(e.target.checked)} />
            Send a different set of questions this time, instead of reusing their last one
          </label>
        )}
        {!prefill && (
          <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
            If you've already gifted this client the same role before, they'll get the same set again automatically — no extra generation, no risk of them noticing a different list each time you send.
          </div>
        )}

        {apiErr && (
          <div style={{ fontSize: 13, color: '#F87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px' }}>
            {apiErr}
          </div>
        )}

        <motion.button
          onClick={handleSubmit}
          disabled={sending}
          whileHover={{ boxShadow: '0 4px 32px rgba(52,211,153,0.45)' }}
          whileTap={{ scale: 0.98 }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'linear-gradient(135deg,#34D399,#059669)', color: '#fff', border: 'none',
            borderRadius: 10, padding: '14px 24px', fontSize: 14, fontWeight: 700,
            cursor: sending ? 'default' : 'pointer', opacity: sending ? 0.7 : 1, fontFamily: 'inherit',
          }}
        >
          {sending ? 'Sending…' : <>Gift {count} Interview Questions <Gift size={15} /></>}
        </motion.button>
      </div>
    </motion.div>
  )
}

// ── List ──────────────────────────────────────────────────────────────────

export default function ClientGifts() {
  const { token } = useAuth()
  const [view, setView] = useState<View>('list')
  const [prefill, setPrefill] = useState<ClientGiftSummary | undefined>(undefined)
  const [gifts, setGifts] = useState<ClientGiftSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const load = useCallback(() => {
    if (!token) return
    setLoading(true)
    setLoadError('')
    clientGiftsApi.list(token)
      .then(setGifts)
      .catch(err => setLoadError((err as ApiError).error ?? 'Failed to load client gifts.'))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(load, [load])

  return (
    <div>
      <AnimatePresence mode="wait">
        {view === 'form' ? (
          <SendGiftForm
            key="form"
            prefill={prefill}
            onCancel={() => { setPrefill(undefined); setView('list') }}
            onSent={() => { setPrefill(undefined); setView('list'); load() }}
          />
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>Client Gifts</h1>
                <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>{gifts.length} client{gifts.length === 1 ? '' : 's'} gifted questions · free with your seat</p>
              </div>
              <button onClick={() => { setPrefill(undefined); setView('form') }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'linear-gradient(135deg,#34D399,#059669)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Gift size={14} /> Gift a Client
              </button>
            </div>

            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, color: 'var(--text-3)', fontSize: 13 }}>
                Loading…
              </div>
            )}

            {!loading && loadError && (
              <div style={{ fontSize: 13, color: '#F87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '14px 16px' }}>
                {loadError}
              </div>
            )}

            {!loading && !loadError && gifts.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280, textAlign: 'center', gap: 12 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Gift size={22} color="#34D399" />
                </div>
                <div style={{ fontWeight: 700, color: 'var(--text-2)' }}>No client gifts sent yet</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 340, lineHeight: 1.6 }}>
                  Prep the candidate AND the client — send your hiring manager their own free set of interview questions and it'll show up here.
                </div>
                <button onClick={() => { setPrefill(undefined); setView('form') }} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '10px 20px', background: 'linear-gradient(135deg,#34D399,#059669)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <User size={14} /> Gift your first client
                </button>
              </div>
            )}

            {!loading && !loadError && gifts.length > 0 && (
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={thStyle}>Last Sent</th>
                        <th style={thStyle}>Client</th>
                        <th style={thStyle}>Role</th>
                        <th style={thStyle}>Questions</th>
                        <th style={thStyle} />
                      </tr>
                    </thead>
                    <tbody>
                      {gifts.map((g, i) => {
                        const clr = levelColor(g.difficulty)
                        return (
                          <tr key={g.id} style={{ background: i % 2 === 1 ? 'rgba(255,255,255,0.025)' : 'transparent' }}>
                            <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{fmtDate(g.lastSentAt)}</td>
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{g.employerCompany ?? g.employerEmail}</div>
                              {g.employerCompany && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{g.employerEmail}</div>}
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ fontSize: 13, color: 'var(--text)' }}>{g.jobRole}</div>
                              <span style={{ fontSize: 10, fontWeight: 700, color: clr, background: `${clr}18`, padding: '2px 8px', borderRadius: 20, display: 'inline-block', marginTop: 4 }}>{g.difficulty}</span>
                            </td>
                            <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-2)' }}>{g.count} · sent {g.sendCount}×</td>
                            <td style={{ padding: '14px 16px' }}>
                              <button
                                type="button"
                                onClick={() => { setPrefill(g); setView('form') }}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                                  background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 8,
                                  padding: '6px 12px', fontSize: 12, fontWeight: 700, color: '#34D399', fontFamily: 'inherit', cursor: 'pointer',
                                }}
                              >
                                <Send size={12} /> Send again
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '12px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: 'var(--text-3)', textAlign: 'left',
  whiteSpace: 'nowrap', userSelect: 'none',
}
