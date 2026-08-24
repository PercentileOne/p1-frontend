import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Send, Mail, Calendar, Briefcase, User, Loader2, Play } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { interviewPrepsApi, type InterviewPrep } from '../api/interviewPrepsApi'
import { explainApi } from '../api/explainApi'

const LEVELS = ['Junior', 'Mid', 'Senior', 'Lead', 'Director', 'Executive']

type View = 'list' | 'form'

// ── Field shell — matches InterviewIntake.tsx's field styling ───────────────

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

// ── Send form ─────────────────────────────────────────────────────────────

function SendPrepForm({ onSent, onCancel }: { onSent: (prep: InterviewPrep) => void; onCancel: () => void }) {
  const { token } = useAuth()
  const [candidateName, setCandidateName] = useState('')
  const [knownAs, setKnownAs] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [level, setLevel] = useState('')
  const [interviewDate, setInterviewDate] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  const [apiErr, setApiErr] = useState('')

  function validate() {
    const e: Record<string, string> = {}
    if (!candidateName.trim()) e.candidateName = 'Candidate name is required.'
    if (!email.trim()) e.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Please enter a valid email.'
    if (!role.trim()) e.role = 'Role is required.'
    if (!level) e.level = 'Level is required.'
    if (!interviewDate) e.interviewDate = 'Interview date is required.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate() || !token) return
    setApiErr('')
    setSending(true)
    try {
      const prep = await interviewPrepsApi.send(token, {
        candidateName: candidateName.trim(),
        knownAs: knownAs.trim() || undefined,
        email: email.trim().toLowerCase(),
        role: role.trim(),
        level,
        interviewDate: new Date(interviewDate).toISOString(),
      })
      onSent(prep)
    } catch (err) {
      setApiErr(err instanceof Error ? err.message : 'Failed to send interview prep.')
    } finally {
      setSending(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
      <button onClick={onCancel} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20, padding: 0 }}>
        <ArrowLeft size={14} /> Back to Interview Preps
      </button>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>Send Candidate Interview Prep</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.6, maxWidth: 480 }}>
          The candidate gets an email invite to create a free account and start practicing — James and Sarah will reference the role and interview date directly in their session.
        </p>
      </div>

      <div style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <FieldLabel>Candidate name</FieldLabel>
            <input value={candidateName} onChange={e => setCandidateName(e.target.value)} placeholder="e.g. Francis Cobbinah" style={inputStyle} autoFocus />
            {errors.candidateName && <div style={{ fontSize: 11, color: '#F87171', marginTop: 6 }}>{errors.candidateName}</div>}
          </div>
          <div>
            <FieldLabel optional>Known as</FieldLabel>
            <input value={knownAs} onChange={e => setKnownAs(e.target.value)} placeholder="e.g. Frank" style={inputStyle} />
          </div>
        </div>

        <div>
          <FieldLabel>Candidate email</FieldLabel>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="candidate@example.com" style={inputStyle} />
          {errors.email && <div style={{ fontSize: 11, color: '#F87171', marginTop: 6 }}>{errors.email}</div>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <FieldLabel>Role</FieldLabel>
            <input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Senior .NET Developer" style={inputStyle} />
            {errors.role && <div style={{ fontSize: 11, color: '#F87171', marginTop: 6 }}>{errors.role}</div>}
          </div>
          <div>
            <FieldLabel>Level / seniority</FieldLabel>
            <select value={level} onChange={e => setLevel(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">Select…</option>
              {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            {errors.level && <div style={{ fontSize: 11, color: '#F87171', marginTop: 6 }}>{errors.level}</div>}
          </div>
        </div>

        <div>
          <FieldLabel>Interview date &amp; time</FieldLabel>
          <input type="datetime-local" value={interviewDate} onChange={e => setInterviewDate(e.target.value)} style={inputStyle} />
          {errors.interviewDate && <div style={{ fontSize: 11, color: '#F87171', marginTop: 6 }}>{errors.interviewDate}</div>}
        </div>

        {apiErr && (
          <div style={{ fontSize: 13, color: '#F87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px' }}>
            {apiErr}
          </div>
        )}

        <motion.button
          onClick={handleSubmit}
          disabled={sending}
          whileHover={{ boxShadow: '0 4px 32px rgba(79,142,247,0.45)' }}
          whileTap={{ scale: 0.98 }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'linear-gradient(135deg,#4F8EF7,#2563eb)', color: '#fff', border: 'none',
            borderRadius: 10, padding: '14px 24px', fontSize: 14, fontWeight: 700,
            cursor: sending ? 'default' : 'pointer', opacity: sending ? 0.7 : 1, fontFamily: 'inherit',
          }}
        >
          {sending ? 'Sending…' : <>Send Interview Prep <Send size={15} /></>}
        </motion.button>
      </div>
    </motion.div>
  )
}

// ── Sent list ─────────────────────────────────────────────────────────────

function statusColor(status: string) {
  return status === 'sent' ? '#F59E0B' : status === 'opened' ? '#4F8EF7' : status === 'completed' ? '#34D399' : 'var(--text-3)'
}

function PrepCard({ prep, onPreview, previewing }: { prep: InterviewPrep; onPreview: () => void; previewing: boolean }) {
  const initials = prep.candidateName.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
  const interviewDate = new Date(prep.interviewDate)
  const sentDate = new Date(prep.createdAt)
  const color = statusColor(prep.status)

  return (
    <motion.div
      onClick={previewing ? undefined : onPreview}
      style={{ background: '#0c1220', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', cursor: previewing ? 'default' : 'pointer' }}
      whileHover={previewing ? {} : { y: -2, borderColor: 'rgba(79,142,247,0.4)' }}
      transition={{ duration: 0.15 }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#4F8EF7,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
          {initials || '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
            {prep.candidateName}{prep.knownAs ? <span style={{ color: 'var(--text-3)', fontWeight: 400 }}> · "{prep.knownAs}"</span> : ''}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{prep.role} · {prep.level}</div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color, background: `${color}18`, padding: '4px 10px', borderRadius: 20, flexShrink: 0 }}>
          {prep.status}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 20px', marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-3)' }}>
          <Mail size={12} /> {prep.email}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-3)' }}>
          <Calendar size={12} /> Interview: {interviewDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · {interviewDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
          Sent {sentDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#4F8EF7', marginLeft: 'auto' }}>
          {previewing ? <><Loader2 size={12} className="animate-spin" /> Preparing…</> : <><Play size={12} /> Preview with Sarah &amp; James</>}
        </div>
      </div>
    </motion.div>
  )
}

export default function InterviewPreps() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const [view, setView] = useState<View>('list')
  const [preps, setPreps] = useState<InterviewPrep[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [previewingId, setPreviewingId] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState('')

  const load = useCallback(() => {
    if (!token) return
    setLoading(true)
    setLoadError('')
    interviewPrepsApi.list(token)
      .then(setPreps)
      .catch(err => setLoadError(err instanceof Error ? err.message : 'Failed to load interview preps.'))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(load, [load])

  // Recruiter preview — the exact interview Sarah and James would run for this candidate,
  // generated fresh from the prep's role/level (no CV on file yet, this is a preview not the
  // real candidate session). Reuses the same InterviewRoom already built for InterviewIntake.
  async function startPreview(prep: InterviewPrep) {
    setPreviewError('')
    setPreviewingId(prep.id)
    try {
      const session = await explainApi.sessionPrepare({
        jobSpecText: `${prep.role} — ${prep.level} level position.`,
      })
      navigate(`/interview-room/${prep.id}`, {
        state: {
          questions: session.questions,
          sarahIntro: session.sarahIntro,
          jamesIntro: session.jamesIntro,
          specialistTitle: session.specialistTitle,
          mikeScript: session.mikeScript,
          companyFacts: session.companyFacts,
          jobTitle: prep.role,
          preferredName: prep.knownAs || prep.candidateName.split(' ')[0],
          autoStart: true,
        },
      })
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Could not prepare the interview preview.')
      setPreviewingId(null)
    }
  }

  return (
    <div>
      <AnimatePresence mode="wait">
        {view === 'form' ? (
          <SendPrepForm
            key="form"
            onCancel={() => setView('list')}
            onSent={prep => { setPreps(p => [prep, ...p]); setView('list') }}
          />
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>Interview Preps</h1>
                <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>{preps.length} sent{preps.length !== 1 ? '' : ''}</p>
              </div>
              <button onClick={() => setView('form')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Send size={14} /> Send Interview Prep
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

            {!loading && !loadError && preps.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280, textAlign: 'center', gap: 12 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={22} color="#4F8EF7" />
                </div>
                <div style={{ fontWeight: 700, color: 'var(--text-2)' }}>No interview preps sent yet</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 320, lineHeight: 1.6 }}>
                  Send a candidate an interview prep and it'll show up here — with status as they open it and start practicing.
                </div>
                <button onClick={() => setView('form')} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '10px 20px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Briefcase size={14} /> Send your first prep
                </button>
              </div>
            )}

            {previewError && (
              <div style={{ fontSize: 13, color: '#F87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                {previewError}
              </div>
            )}

            {!loading && !loadError && preps.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {preps.map(p => (
                  <PrepCard key={p.id} prep={p} onPreview={() => startPreview(p)} previewing={previewingId === p.id} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
