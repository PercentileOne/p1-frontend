import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Send, Briefcase, User, Loader2, Play, FileText, X, ChevronUp, ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { interviewPrepsApi, type InterviewPrep } from '../api/interviewPrepsApi'
import { explainApi } from '../api/explainApi'
import { buildCVContext, buildJobSpecContext, buildSarahIntro, buildJamesIntro, buildPersonalisedQuestions, inferSpecialistTitle } from '../utils/contextBuilder'
import { FileUpload } from '../components/FileUpload'
import { DateTimePicker } from '../components/DateTimePicker'

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

function fileToBase64(file: File): Promise<{ base64: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve({ base64: result.slice(result.indexOf(',') + 1) }) // strip the data: URL prefix
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function isoToLocalInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function SendPrepForm({ existing, onSent, onCancel }: { existing?: InterviewPrep; onSent: (prep: InterviewPrep) => void; onCancel: () => void }) {
  const { token } = useAuth()
  const [title, setTitle] = useState(existing?.title ?? '')
  const [firstName, setFirstName] = useState(existing?.firstName ?? '')
  const [lastName, setLastName] = useState(existing?.lastName ?? '')
  const [email, setEmail] = useState(existing?.email ?? '')
  const [level, setLevel] = useState(existing?.level ?? '')
  const [interviewDate, setInterviewDate] = useState(existing ? isoToLocalInput(existing.interviewDate) : '')
  const [jobSpecTab, setJobSpecTab] = useState<'jobspec' | 'cv'>('jobspec')
  const [jobSpec, setJobSpec] = useState(existing?.jobSpecText ?? '')
  const [jobSpecFileName, setJobSpecFileName] = useState('')
  const [jobSpecExtracting, setJobSpecExtracting] = useState(false)
  const [cvInputTab, setCvInputTab] = useState<'upload' | 'text'>('upload')
  const [cvText, setCvText] = useState(existing?.cvText ?? '')
  const [cvFileName, setCvFileName] = useState(existing?.cvFileName ?? '')
  const [cvFile, setCvFile] = useState<File | null>(null) // only set when a NEW file is picked this session
  const [cvExtracting, setCvExtracting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  const [apiErr, setApiErr] = useState('')
  // A multi-page PDF can take a moment to extract — without this, clicking Send the instant
  // a file is dropped submits whatever cvText/jobSpec held before the upload (usually empty).
  const stillExtracting = jobSpecExtracting || cvExtracting

  // No separate Job Title field — the job spec already carries it, so ask for it once.
  // buildJobSpecContext reads the spec's first line (same logic InterviewPackStart.tsx
  // already relies on), falling back to "the role" if that line doesn't look title-like.
  const derivedRole = useMemo(() => buildJobSpecContext(jobSpec).title, [jobSpec])

  function validate() {
    const e: Record<string, string> = {}
    if (!firstName.trim()) e.firstName = 'First name is required.'
    if (!lastName.trim()) e.lastName = 'Last name is required.'
    if (!email.trim()) e.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Please enter a valid email.'
    if (!level) e.level = 'Level is required.'
    if (!interviewDate) e.interviewDate = 'Interview date is required.'
    if (jobSpec.trim().length < 20) e.jobSpec = 'Paste or upload the job spec — questions need to be grounded in the real role.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (stillExtracting || !validate() || !token) return
    setApiErr('')
    setSending(true)
    // Only sent when a new file was actually picked this session — an edit that doesn't
    // touch the CV tab should leave whatever file's already on record alone.
    const cvFilePayload = cvFile ? await fileToBase64(cvFile) : null
    const body = {
      title: title || undefined,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      role: derivedRole,
      level,
      interviewDate: new Date(interviewDate).toISOString(),
      jobSpecText: jobSpec.trim(),
      cvText: cvText.trim() || undefined,
      cvFileBase64: cvFilePayload?.base64,
      cvFileName: cvFile?.name,
      cvFileContentType: cvFile?.type,
    }
    try {
      const prep = existing
        ? await interviewPrepsApi.update(token, existing.id, body)
        : await interviewPrepsApi.send(token, body)
      onSent(prep)
    } catch (err) {
      setApiErr(err instanceof Error ? err.message : `Failed to ${existing ? 'save' : 'send'} interview prep.`)
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
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>{existing ? 'Edit Interview Prep' : 'Send Candidate Interview Prep'}</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.6, maxWidth: 560 }}>
          {existing
            ? "Saving resends the invite email to the candidate with the updated details — handy for a typo'd name or a rescheduled date."
            : "The candidate gets an email invite to create a free account and start practicing — James and Sarah will reference the role, the interview date, and (where provided) the candidate's own CV directly in their session."}
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
                  onExtractingChange={setJobSpecExtracting}
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
                {jobSpec.trim().length >= 20 && (
                  <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-3)' }}>
                    Detected role: <span style={{ color: 'var(--text)', fontWeight: 700 }}>{derivedRole}</span>
                  </div>
                )}
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
                    <FileUpload label="CV" onExtracted={(text, name, file) => { setCvText(text); setCvFileName(name); setCvFile(file) }} onExtractingChange={setCvExtracting} />
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
          <DateTimePicker value={interviewDate} onChange={setInterviewDate} hasError={!!errors.interviewDate} />
          {errors.interviewDate && <div style={{ fontSize: 11, color: '#F87171', marginTop: 6 }}>{errors.interviewDate}</div>}
        </div>

        {apiErr && (
          <div style={{ fontSize: 13, color: '#F87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px' }}>
            {apiErr}
          </div>
        )}

        <motion.button
          onClick={handleSubmit}
          disabled={sending || stillExtracting}
          whileHover={{ boxShadow: '0 4px 32px rgba(79,142,247,0.45)' }}
          whileTap={{ scale: 0.98 }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'linear-gradient(135deg,#4F8EF7,#2563eb)', color: '#fff', border: 'none',
            borderRadius: 10, padding: '14px 24px', fontSize: 14, fontWeight: 700,
            cursor: sending || stillExtracting ? 'default' : 'pointer', opacity: sending || stillExtracting ? 0.7 : 1, fontFamily: 'inherit',
          }}
        >
          {stillExtracting
            ? 'Extracting file text…'
            : sending
              ? (existing ? 'Saving…' : 'Sending…')
              : existing ? <>Save &amp; Resend <Send size={15} /></> : <>Send Interview Prep <Send size={15} /></>}
        </motion.button>
      </div>
    </motion.div>
  )
}

// ── Sent list — same sortable-table + search + filter-pills pattern as the candidate
// portal's Interview Preps / My Interviews pages, per Francis's explicit ask to keep the
// two lists visually consistent. ──────────────────────────────────────────────────────

function statusColor(status: string) {
  return status === 'sent' ? '#F59E0B' : status === 'opened' ? '#4F8EF7' : status === 'completed' ? '#34D399' : 'var(--text-3)'
}

function levelColor(level: string) {
  return level === 'Standard' ? '#34D399' : level === 'Pro' ? '#F59E0B' : level === 'Expert' ? '#EF4444' : '#4F8EF7'
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
    + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

const FILTER_OPTS = ['All', 'Upcoming', 'Past'] as const
type FilterOpt = (typeof FILTER_OPTS)[number]
type SortKey = 'interviewDate' | 'lastName' | 'role' | 'status'
const PAGE_SIZE = 7

const thStyle: React.CSSProperties = {
  padding: '12px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: 'var(--text-3)', textAlign: 'left',
  whiteSpace: 'nowrap', userSelect: 'none',
}

export default function InterviewPreps() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const [view, setView] = useState<View>('list')
  const [editingPrep, setEditingPrep] = useState<InterviewPrep | null>(null)
  const [preps, setPreps] = useState<InterviewPrep[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [previewingId, setPreviewingId] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState('')
  const [filter,  setFilter]  = useState<FilterOpt>('All')
  const [search,  setSearch]  = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('interviewDate')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page,    setPage]    = useState(1)

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

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  const now = Date.now()
  const filtered = preps
    .filter(p => filter === 'All' || (filter === 'Upcoming' ? new Date(p.interviewDate).getTime() >= now : new Date(p.interviewDate).getTime() < now))
    .filter(p => {
      const q = search.toLowerCase()
      if (!q) return true
      return p.role.toLowerCase().includes(q) || `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      const av = sortKey === 'lastName' ? a.lastName : a[sortKey]
      const bv = sortKey === 'lastName' ? b.lastName : b[sortKey]
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const upcomingCount = preps.filter(p => new Date(p.interviewDate).getTime() >= now).length

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span style={{ opacity: 0.25, marginLeft: 4 }}>↕</span>
    return sortDir === 'asc'
      ? <ChevronUp size={11} style={{ marginLeft: 3, verticalAlign: 'middle' }} />
      : <ChevronDown size={11} style={{ marginLeft: 3, verticalAlign: 'middle' }} />
  }

  const sortableTh = (label: string, key: SortKey) => (
    <th key={key} style={{ ...thStyle, cursor: 'pointer' }} onClick={() => toggleSort(key)}>
      {label}<SortIcon k={key} />
    </th>
  )

  return (
    <div>
      <AnimatePresence mode="wait">
        {view === 'form' ? (
          <SendPrepForm
            key="form"
            existing={editingPrep ?? undefined}
            onCancel={() => { setEditingPrep(null); setView('list') }}
            onSent={prep => {
              setPreps(p => editingPrep ? p.map(x => x.id === prep.id ? prep : x) : [prep, ...p])
              setEditingPrep(null)
              setView('list')
            }}
          />
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>Interview Preps</h1>
                <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>{preps.length} sent · {upcomingCount} upcoming</p>
              </div>
              <button onClick={() => { setEditingPrep(null); setView('form') }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
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
                <button onClick={() => { setEditingPrep(null); setView('form') }} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '10px 20px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
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
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 220px', minWidth: 0, position: 'relative' }}>
                    <input
                      value={search}
                      onChange={e => { setSearch(e.target.value); setPage(1) }}
                      placeholder="Search candidate, role, or email…"
                      style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 36px 9px 14px', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }} />
                    {search && (
                      <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 2 }}>
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {FILTER_OPTS.map(f => (
                      <button key={f} onClick={() => { setFilter(f); setPage(1) }} style={{
                        padding: '8px 14px', borderRadius: 20, border: '1px solid', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                        background: filter === f ? 'rgba(79,142,247,0.15)' : 'transparent',
                        borderColor: filter === f ? 'rgba(79,142,247,0.5)' : 'var(--border)',
                        color: filter === f ? '#4F8EF7' : 'var(--text-3)', transition: 'all 0.15s',
                      }}>{f}</button>
                    ))}
                  </div>
                </div>

                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          {sortableTh('Interview Date', 'interviewDate')}
                          {sortableTh('Candidate', 'lastName')}
                          {sortableTh('Role', 'role')}
                          {sortableTh('Status', 'status')}
                          <th style={thStyle}>CV</th>
                          <th style={thStyle} />
                        </tr>
                      </thead>
                      <tbody>
                        {visible.map((prep, i) => {
                          const levelClr = levelColor(prep.level)
                          const statusClr = statusColor(prep.status)
                          return (
                            <tr key={prep.id}
                              onClick={() => { setEditingPrep(prep); setView('form') }}
                              title="Click to edit"
                              style={{ background: i % 2 === 1 ? 'rgba(255,255,255,0.025)' : 'transparent', cursor: 'pointer', transition: 'background 0.1s' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,142,247,0.06)')}
                              onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 1 ? 'rgba(255,255,255,0.025)' : 'transparent')}
                            >
                              <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{fmtDate(prep.interviewDate)}</td>
                              <td style={{ padding: '14px 16px' }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{prep.title ? `${prep.title} ` : ''}{prep.firstName} {prep.lastName}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{prep.email}</div>
                              </td>
                              <td style={{ padding: '14px 16px' }}>
                                <div style={{ fontSize: 13, color: 'var(--text)' }}>{prep.role}</div>
                                <span style={{ fontSize: 10, fontWeight: 700, color: levelClr, background: `${levelClr}18`, padding: '2px 8px', borderRadius: 20, display: 'inline-block', marginTop: 4 }}>{prep.level}</span>
                              </td>
                              <td style={{ padding: '14px 16px' }}>
                                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: statusClr, background: `${statusClr}18`, padding: '4px 10px', borderRadius: 20 }}>
                                  {prep.status}
                                </span>
                              </td>
                              <td style={{ padding: '14px 16px' }}>
                                {prep.cvFileUrl
                                  ? (
                                    <a
                                      href={prep.cvFileUrl} target="_blank" rel="noreferrer"
                                      onClick={e => e.stopPropagation()}
                                      title={prep.cvFileName ?? 'View CV'}
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#34D399', background: 'rgba(52,211,153,0.1)', padding: '3px 8px', borderRadius: 20, textDecoration: 'none', maxWidth: 140 }}
                                    >
                                      <FileText size={11} style={{ flexShrink: 0 }} />
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prep.cvFileName ?? 'View CV'}</span>
                                    </a>
                                  )
                                  : <span style={{ fontSize: 12, color: 'var(--text-3)' }}>—</span>}
                              </td>
                              <td style={{ padding: '14px 16px' }}>
                                <button
                                  type="button"
                                  disabled={previewingId === prep.id}
                                  onClick={e => { e.stopPropagation(); startPreview(prep) }}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                                    background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.25)', borderRadius: 8,
                                    padding: '6px 12px', fontSize: 12, fontWeight: 700, color: '#4F8EF7', fontFamily: 'inherit',
                                    cursor: previewingId === prep.id ? 'default' : 'pointer',
                                  }}
                                >
                                  {previewingId === prep.id ? <><Loader2 size={12} className="animate-spin" /> Preparing…</> : <><Play size={12} /> Preview</>}
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {visible.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No interview preps match your filter.</div>}

                  {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: page === 1 ? 'var(--text-3)' : 'var(--text-2)', cursor: page === 1 ? 'default' : 'pointer', fontSize: 12, fontFamily: 'inherit', opacity: page === 1 ? 0.4 : 1 }}
                        >← Prev</button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                          <button key={n} onClick={() => setPage(n)} style={{
                            padding: '6px 10px', borderRadius: 6, border: '1px solid', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
                            background: n === page ? 'rgba(79,142,247,0.15)' : 'transparent',
                            borderColor: n === page ? 'rgba(79,142,247,0.5)' : 'var(--border)',
                            color: n === page ? '#4F8EF7' : 'var(--text-3)',
                          }}>{n}</button>
                        ))}
                        <button
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: page === totalPages ? 'var(--text-3)' : 'var(--text-2)', cursor: page === totalPages ? 'default' : 'pointer', fontSize: 12, fontFamily: 'inherit', opacity: page === totalPages ? 0.4 : 1 }}
                        >Next →</button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
