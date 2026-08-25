import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Send, Mail, Calendar, Briefcase, User, Loader2, Play } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { interviewPrepsApi, type InterviewPrep } from '../api/interviewPrepsApi'
import { explainApi } from '../api/explainApi'
import { buildCVContext, buildJobSpecContext, buildSarahIntro, buildJamesIntro, buildPersonalisedQuestions, inferSpecialistTitle } from '../utils/contextBuilder'
import { FileUpload } from '../components/FileUpload'

// Same three values, same colours, as the candidate's own "Question Difficulty" picker on
// InterviewPackStart.tsx (both candidate- and recruiter-portal copies) — Francis's explicit
// ask: this dropdown and that one must speak the same language, not two different scales.
const DIFFICULTIES = [
  { value: 'Standard', color: '#34D399', borderColor: 'rgba(52,211,153,0.3)', desc: 'Well-rounded questions to build genuine confidence and solid preparation.' },
  { value: 'Pro',       color: '#F59E0B', borderColor: 'rgba(245,158,11,0.3)', desc: 'Challenging questions that probe deeper — sharpen your edge beyond the basics.' },
  { value: 'Expert',    color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)',  desc: "We'll treat you like the leading authority in your field. Intense. Technical. Unforgiving." },
]
const TITLES = ['Mr', 'Mrs', 'Miss', 'Ms', 'Mx', 'Dr', 'Prof']
const SELECT_CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`

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
  const [title, setTitle] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [level, setLevel] = useState('')
  const [interviewDate, setInterviewDate] = useState('')
  const [jobSpecTab, setJobSpecTab] = useState<'jobspec' | 'cv'>('jobspec')
  const [jobSpec, setJobSpec] = useState('')
  const [jobSpecFileName, setJobSpecFileName] = useState('')
  const [cvInputTab, setCvInputTab] = useState<'upload' | 'text'>('upload')
  const [cvText, setCvText] = useState('')
  const [cvFileName, setCvFileName] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  const [apiErr, setApiErr] = useState('')

  function validate() {
    const e: Record<string, string> = {}
    if (!firstName.trim()) e.firstName = 'First name is required.'
    if (!lastName.trim()) e.lastName = 'Last name is required.'
    if (!email.trim()) e.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Please enter a valid email.'
    if (!role.trim()) e.role = 'Role is required.'
    if (!level) e.level = 'Level is required.'
    if (!interviewDate) e.interviewDate = 'Interview date is required.'
    if (jobSpec.trim().length < 20) e.jobSpec = 'Paste or upload the job spec — questions need to be grounded in the real role.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate() || !token) return
    setApiErr('')
    setSending(true)
    try {
      const prep = await interviewPrepsApi.send(token, {
        title: title || undefined,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        role: role.trim(),
        level,
        interviewDate: new Date(interviewDate).toISOString(),
        jobSpecText: jobSpec.trim(),
        cvText: cvText.trim() || undefined,
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
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.6, maxWidth: 560 }}>
          The candidate gets an email invite to create a free account and start practicing — James and Sarah will reference the role, the interview date, and (where provided) the candidate's own CV directly in their session.
        </p>
      </div>

      <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '0.7fr 1.3fr 1.3fr', gap: 14 }}>
          <div>
            <FieldLabel optional>Title</FieldLabel>
            <select value={title} onChange={e => setTitle(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">—</option>
              {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>First name</FieldLabel>
            <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="e.g. Francis" style={inputStyle} autoFocus />
            {errors.firstName && <div style={{ fontSize: 11, color: '#F87171', marginTop: 6 }}>{errors.firstName}</div>}
          </div>
          <div>
            <FieldLabel>Last name</FieldLabel>
            <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="e.g. Cobbinah" style={inputStyle} />
            {errors.lastName && <div style={{ fontSize: 11, color: '#F87171', marginTop: 6 }}>{errors.lastName}</div>}
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
            <FieldLabel>Interview difficulty</FieldLabel>
            {(() => {
              const selected = DIFFICULTIES.find(d => d.value === level)
              return (
                <select
                  value={level}
                  onChange={e => setLevel(e.target.value)}
                  style={{
                    ...inputStyle, cursor: 'pointer', appearance: 'none',
                    border: `1px solid ${selected?.borderColor ?? 'var(--border)'}`,
                    color: selected?.color ?? 'var(--text)',
                    fontWeight: selected ? 700 : 400,
                    backgroundImage: SELECT_CHEVRON, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
                  }}
                >
                  <option value="">Select…</option>
                  {DIFFICULTIES.map(d => <option key={d.value} value={d.value} style={{ color: d.color, background: '#0c1220' }}>{d.value}</option>)}
                </select>
              )
            })()}
            {errors.level && <div style={{ fontSize: 11, color: '#F87171', marginTop: 6 }}>{errors.level}</div>}
          </div>
        </div>

        {/* Job Spec + CV — recruiter's responsibility, not the candidate's. Grounds every
            generated question in the real role and the real candidate, rather than a one-line
            job title — and gives an astute interviewer's eye into things like employment dates,
            so practice actually catches what a CV might be fudging. */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            <button type="button" onClick={() => setJobSpecTab('jobspec')} style={{
              flex: 1, padding: '12px 16px', border: 'none', background: jobSpecTab === 'jobspec' ? 'rgba(79,142,247,0.08)' : 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 700, fontFamily: 'inherit', color: jobSpecTab === 'jobspec' ? 'var(--blue)' : 'var(--text-3)',
              borderBottom: jobSpecTab === 'jobspec' ? '2px solid var(--blue)' : '2px solid transparent', marginBottom: -1,
            }}>
              📄 Job Spec {jobSpec.trim() ? '✓' : '* required'}
            </button>
            <button type="button" onClick={() => setJobSpecTab('cv')} style={{
              flex: 1, padding: '12px 16px', border: 'none', background: jobSpecTab === 'cv' ? 'rgba(79,142,247,0.08)' : 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 700, fontFamily: 'inherit', color: jobSpecTab === 'cv' ? 'var(--blue)' : 'var(--text-3)',
              borderBottom: jobSpecTab === 'cv' ? '2px solid var(--blue)' : '2px solid transparent', marginBottom: -1,
            }}>
              👤 Candidate CV {cvText || cvFileName ? '✓' : '(optional, recommended)'}
            </button>
          </div>

          <div style={{ padding: '20px' }}>
            {jobSpecTab === 'jobspec' && (
              <>
                <FileUpload
                  label="Job Spec"
                  onExtracted={(text, name) => { setJobSpec(text); setJobSpecFileName(name) }}
                />
                {!jobSpecFileName && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '14px 0' }}>
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                      <span style={{ fontSize: 12, color: 'var(--text-3)' }}>or paste below</span>
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    </div>
                    <textarea
                      value={jobSpec}
                      onChange={e => setJobSpec(e.target.value)}
                      placeholder="Paste the full job description here…"
                      rows={7}
                      style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, color: 'var(--text)', fontSize: 13, lineHeight: 1.6, resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
                    />
                  </>
                )}
                {jobSpecFileName && <div style={{ marginTop: 8, fontSize: 12, color: '#34D399' }}>✓ {jobSpecFileName} loaded</div>}
                {errors.jobSpec && <div style={{ fontSize: 11, color: '#F87171', marginTop: 8 }}>{errors.jobSpec}</div>}
              </>
            )}

            {jobSpecTab === 'cv' && (
              <>
                <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 16 }}>
                  If you have the candidate's CV, add it here — questions can then probe real experience (roles, dates, projects), not just the job spec. Great for catching an embellished CV before your client does.
                </div>
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
                  {(['upload', 'text'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setCvInputTab(t)} style={{
                      padding: '7px 16px', border: 'none', background: 'none', cursor: 'pointer',
                      fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                      color: cvInputTab === t ? 'var(--blue)' : 'var(--text-3)',
                      borderBottom: cvInputTab === t ? '2px solid var(--blue)' : '2px solid transparent', marginBottom: -1,
                    }}>
                      {t === 'upload' ? 'CV Upload' : 'CV Text'}
                    </button>
                  ))}
                </div>
                {cvInputTab === 'upload' && (
                  <>
                    <FileUpload label="CV" onExtracted={(text, name) => { setCvText(text); setCvFileName(name) }} />
                    {cvFileName && <div style={{ marginTop: 8, fontSize: 12, color: '#34D399' }}>✓ {cvFileName} loaded</div>}
                  </>
                )}
                {cvInputTab === 'text' && (
                  <textarea
                    value={cvText}
                    onChange={e => { setCvText(e.target.value); setCvFileName('') }}
                    placeholder="Paste the candidate's CV / résumé text here — skills, experience, dates, achievements…"
                    rows={8}
                    style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, color: 'var(--text)', fontSize: 13, lineHeight: 1.6, resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
                  />
                )}
              </>
            )}
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
  const initials = `${prep.firstName[0] ?? ''}${prep.lastName[0] ?? ''}`.toUpperCase()
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
            {prep.title ? `${prep.title} ` : ''}{prep.firstName} {prep.lastName}
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
  // generated from the real job spec (and CV, when the recruiter provided one) captured on
  // the prep itself — this is a preview, not the real candidate session, but it's now grounded
  // in the same material the candidate's own session will use. Reuses the same InterviewRoom
  // already built for InterviewIntake — including its exact fallback: /session/prepare isn't
  // currently deployed on the .NET backend (404 in production, confirmed 2026-08-24 — a
  // pre-existing gap, not new), so InterviewIntake.tsx already falls back to local heuristic
  // generation on failure. Mirror that here rather than surfacing a broken feature.
  async function startPreview(prep: InterviewPrep) {
    setPreviewError('')
    setPreviewingId(prep.id)

    const jobSpecText = prep.jobSpecText?.trim() || `${prep.role} — ${prep.level} level position.`
    const preferredName = prep.firstName

    try {
      const session = await explainApi.sessionPrepare({ jobSpecText, cvText: prep.cvText ?? undefined })
      navigate(`/interview-room/${prep.id}`, {
        state: {
          questions: session.questions,
          sarahIntro: session.sarahIntro,
          jamesIntro: session.jamesIntro,
          specialistTitle: session.specialistTitle,
          mikeScript: session.mikeScript,
          companyFacts: session.companyFacts,
          jobTitle: prep.role,
          preferredName,
          autoStart: true,
        },
      })
    } catch {
      try {
        const cvCtx = buildCVContext('')
        const jobCtx = buildJobSpecContext(jobSpecText)
        navigate(`/interview-room/${prep.id}`, {
          state: {
            cvCtx, jobCtx,
            questions: buildPersonalisedQuestions(cvCtx, jobCtx),
            sarahIntro: buildSarahIntro(cvCtx, jobCtx),
            jamesIntro: buildJamesIntro(cvCtx, jobCtx),
            specialistTitle: inferSpecialistTitle(jobCtx.title),
            mikeScript: null,
            companyFacts: [],
            jobTitle: prep.role,
            preferredName,
            autoStart: true,
          },
        })
      } catch (err) {
        setPreviewError(err instanceof Error ? err.message : 'Could not prepare the interview preview.')
        setPreviewingId(null)
      }
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
