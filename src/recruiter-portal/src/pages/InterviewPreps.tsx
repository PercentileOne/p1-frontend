import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Send, Briefcase, User, Loader2, Play, FileText, X, ChevronUp, ChevronDown, Trash2, MailCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { interviewPrepsApi, type InterviewPrep } from '../api/interviewPrepsApi'
import { explainApi } from '../api/explainApi'
import { buildCVContext, buildJobSpecContext, buildSarahIntro, buildJamesIntro, buildPersonalisedQuestions, inferSpecialistTitle } from '../utils/contextBuilder'
import { type Career, searchCareers, reportMissingCareerTitle } from '../api/careersApi'
import { generateHotTopics } from '../api/aiScoring'
import { Pagination } from '../components/Pagination'
import { FileUpload } from '../components/FileUpload'
import { DateTimePicker } from '../components/DateTimePicker'

// Same four values, same colours, as the candidate's own "Question Difficulty" picker on
// InterviewPackStart.tsx (both candidate- and recruiter-portal copies) — Francis's explicit
// ask: this dropdown and that one must speak the same language, not two different scales.
// "Beginner" added 2026-09-15 to match the candidate side (was missing here, so a recruiter
// could never send a first-timer-calibrated prep even after that tier shipped candidate-side).
const DIFFICULTIES = [
  { value: 'Beginner',  color: '#4F8EF7', borderColor: 'rgba(79,142,247,0.3)',  desc: 'Foundational questions with no pressure — a genuine first practice run, great if they’re new to this.' },
  { value: 'Standard', color: '#34D399', borderColor: 'rgba(52,211,153,0.3)', desc: 'Well-rounded questions to build genuine confidence and solid preparation.' },
  { value: 'Pro',       color: '#F59E0B', borderColor: 'rgba(245,158,11,0.3)', desc: 'Challenging questions that probe deeper — sharpen your edge beyond the basics.' },
  { value: 'Expert',    color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)',  desc: "We'll treat you like the leading authority in your field. Intense. Technical. Unforgiving." },
]
// Same values as the candidate-side INTERVIEW_ROUNDS (InterviewPackStart.tsx) — a recruiter
// sending a prep usually knows exactly which real stage the candidate is prepping for, so
// this is set here rather than left for the candidate to guess when they open the prep link.
const ROUNDS = [
  'First Round Interview',
  'Second Round Interview',
  'Third Round Interview',
  'Fourth Round Interview',
  'Fifth Round Interview',
  'Final Round Interview',
]
// Same values as the candidate-side SALARY_BANDS (InterviewPackStart.tsx) — a recruiter
// sending a real prep genuinely knows the role's actual salary, unlike a candidate
// self-selecting an aspirational band for solo practice (Francis, 2026-09-18). The
// difficulty-blend math itself lives server-side (sessionPrepareClient in aiScoring.ts) — this
// list is just the labels, kept in sync by hand the same way ROUNDS/DIFFICULTIES already are.
const SALARY_BANDS = [
  'N/A', 'Under £25k', '£25k+', '£35k+', '£45k+', '£55k+', '£65k+', '£80k+', '£100k+',
  '£140k+', '£200k+', '£300k+', '£400k+', '£500k+', '£750k+', '£1M+',
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
  const [round, setRound] = useState(existing?.round ?? ROUNDS[0])
  const [salaryExpectation, setSalaryExpectation] = useState(existing?.salaryExpectation ?? SALARY_BANDS[0])
  const [interviewDate, setInterviewDate] = useState(existing ? isoToLocalInput(existing.interviewDate) : '')
  // Job Title is now its own tab, matching the candidate-side InterviewPackStart.tsx layout
  // (2026-09-15 — previously this form had no Job Title field at all and silently derived one
  // from the job spec's first line, while Job Spec was the only field actually required; the
  // candidate side flipped to Job Title being the primary, standalone-sufficient field months
  // ago). Prefilled from `existing.role` on edit — a best-effort starting point even though
  // that value may itself have been auto-derived under the old behaviour.
  const [jobTitle, setJobTitle] = useState(existing?.role ?? '')
  const [activeTab, setActiveTab] = useState<'jobTitle' | 'jobspec' | 'cv'>(
    existing?.jobSpecText ? 'jobspec' : (existing?.cvText || existing?.cvFileName) ? 'cv' : 'jobTitle'
  )
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

  // Job title type-ahead — same real-careers-database search as InterviewPackStart.tsx,
  // copied via careersApi.ts (see CLAUDE.md's "copy then trim" convention). Never blocks free
  // text; a title genuinely missing from the database still sends fine, just gets reported.
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

  // Special Focus — same feature/copy as InterviewPackStart.tsx's own (candidate-side), added
  // here 2026-09-15: Francis's original intent was for the RECRUITER to be able to set this on
  // the candidate's behalf, not only for the candidate to set it themselves. Kept as chips, not
  // a single string, matching the candidate-side data shape exactly (backend stores/returns the
  // same string[]).
  const [specialFocusInput, setSpecialFocusInput] = useState('')
  const [specialFocusChips, setSpecialFocusChips] = useState<string[]>(existing?.specialFocus ?? [])
  const [hotTopicsLoading, setHotTopicsLoading] = useState(false)

  const addSpecialFocusChip = useCallback((raw: string) => {
    const value = raw.trim()
    if (!value) return
    setSpecialFocusChips(prev => prev.some(c => c.toLowerCase() === value.toLowerCase()) ? prev : [...prev, value])
  }, [])

  const removeSpecialFocusChip = useCallback((value: string) => {
    setSpecialFocusChips(prev => prev.filter(c => c !== value))
  }, [])

  const handleWhatsHot = useCallback(async () => {
    if (!jobTitle.trim() || hotTopicsLoading) return
    setHotTopicsLoading(true)
    try {
      const topics = await generateHotTopics(jobTitle.trim())
      topics.forEach(addSpecialFocusChip)
    } finally {
      setHotTopicsLoading(false)
    }
  }, [jobTitle, hotTopicsLoading, addSpecialFocusChip])

  // A role signal is now "Job Title OR Job Spec", matching InterviewPackStart.tsx's own
  // hasRole check — Job Spec is no longer the sole required field. When only a Job Spec is
  // given (no typed title), fall back to the same first-line heuristic this form used to rely
  // on exclusively.
  const hasJobTitle = jobTitle.trim().length > 2
  const hasJobSpec = jobSpec.trim().length >= 20
  const resolvedRole = hasJobTitle ? jobTitle.trim() : buildJobSpecContext(jobSpec).title

  function validate() {
    const e: Record<string, string> = {}
    if (!firstName.trim()) e.firstName = 'First name is required.'
    if (!lastName.trim()) e.lastName = 'Last name is required.'
    if (!email.trim()) e.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Please enter a valid email.'
    if (!level) e.level = 'Level is required.'
    if (!interviewDate) e.interviewDate = 'Interview date is required.'
    if (!hasJobTitle && !hasJobSpec) e.role = 'Add a job title, or paste/upload the job spec — questions need to be grounded in the real role.'
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
      role: resolvedRole,
      level,
      round,
      salaryExpectation: salaryExpectation === 'N/A' ? undefined : salaryExpectation,
      interviewDate: new Date(interviewDate).toISOString(),
      jobSpecText: jobSpec.trim(),
      cvText: cvText.trim() || undefined,
      cvFileBase64: cvFilePayload?.base64,
      cvFileName: cvFile?.name,
      cvFileContentType: cvFile?.type,
      specialFocus: specialFocusChips.length > 0 ? specialFocusChips : undefined,
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

        <div>
          <FieldLabel>Interview round</FieldLabel>
          <select
            value={round}
            onChange={e => setRound(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer', appearance: 'none', backgroundImage: SELECT_CHEVRON, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' }}
          >
            {ROUNDS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div>
          <FieldLabel optional>Salary expectation</FieldLabel>
          <select
            value={salaryExpectation}
            onChange={e => setSalaryExpectation(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer', appearance: 'none', backgroundImage: SELECT_CHEVRON, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' }}
          >
            {SALARY_BANDS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Job Title + Job Spec + CV — recruiter's responsibility, not the candidate's. Grounds
            every generated question in the real role and the real candidate — and, for CV, gives
            an astute interviewer's eye into things like employment dates, so practice actually
            catches what a CV might be fudging. Job Title added 2026-09-15 to match the
            candidate-side InterviewPackStart.tsx three-tab layout — either Job Title or Job Spec
            is enough to send, same as there. */}
        <div style={{ background: 'var(--bg2)', border: `1px solid ${errors.role ? 'rgba(245,158,11,0.5)' : 'var(--border)'}`, borderRadius: 16 }}>
          {/* No overflow:hidden on the card — it clipped the job-title suggestions dropdown to a sliver (found
              2026-09-25). The tab bar rounds its own top corners instead so the active tab's tint still stays inside. */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', borderRadius: '16px 16px 0 0', overflow: 'hidden' }}>
            <button type="button" onClick={() => setActiveTab('jobTitle')} style={{
              flex: 1, padding: '12px 16px', border: 'none', background: activeTab === 'jobTitle' ? 'rgba(79,142,247,0.08)' : 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 700, fontFamily: 'inherit', color: activeTab === 'jobTitle' ? 'var(--blue)' : 'var(--text-3)',
              borderBottom: activeTab === 'jobTitle' ? '2px solid var(--blue)' : '2px solid transparent', marginBottom: -1,
            }}>
              💼 Job Title {hasJobTitle ? '✓' : ''}
            </button>
            <button type="button" onClick={() => setActiveTab('jobspec')} style={{
              flex: 1, padding: '12px 16px', border: 'none', background: activeTab === 'jobspec' ? 'rgba(79,142,247,0.08)' : 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 700, fontFamily: 'inherit', color: activeTab === 'jobspec' ? 'var(--blue)' : 'var(--text-3)',
              borderBottom: activeTab === 'jobspec' ? '2px solid var(--blue)' : '2px solid transparent', marginBottom: -1,
            }}>
              📄 Job Spec {hasJobSpec ? '✓' : '(optional)'}
            </button>
            <button type="button" onClick={() => setActiveTab('cv')} style={{
              flex: 1, padding: '12px 16px', border: 'none', background: activeTab === 'cv' ? 'rgba(79,142,247,0.08)' : 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 700, fontFamily: 'inherit', color: activeTab === 'cv' ? 'var(--blue)' : 'var(--text-3)',
              borderBottom: activeTab === 'cv' ? '2px solid var(--blue)' : '2px solid transparent', marginBottom: -1,
            }}>
              👤 Candidate CV {cvText || cvFileName ? '✓' : '(optional, recommended)'}
            </button>
          </div>

          <div style={{ padding: '20px' }}>
            {activeTab === 'jobTitle' && (
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={e => handleJobTitleChange(e.target.value)}
                  onFocus={() => { if (jobTitleSuggestions.length > 0) setShowJobTitleSuggestions(true) }}
                  onBlur={handleJobTitleBlur}
                  autoComplete="off"
                  placeholder="e.g. Head of Engineering, Senior Product Manager, Registered Nurse…"
                  style={inputStyle}
                />
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
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 10, lineHeight: 1.5 }}>
                  Or switch to the Job Spec tab above — either one is enough to send on its own.
                </div>
              </div>
            )}

            {activeTab === 'jobspec' && (
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
                {!hasJobTitle && jobSpec.trim().length >= 20 && (
                  <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-3)' }}>
                    Detected role: <span style={{ color: 'var(--text)', fontWeight: 700 }}>{resolvedRole}</span>
                  </div>
                )}
              </>
            )}

            {activeTab === 'cv' && (
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
        {errors.role && <div style={{ fontSize: 11, color: '#F87171', marginTop: -10 }}>{errors.role}</div>}

        {/* Special Focus — optional topics that narrow question generation; "What's Hot"
            suggests currently in-demand ones for the typed role. Same feature as the candidate
            side's own InterviewPackStart.tsx, since a recruiter should be able to set this on
            the candidate's behalf just as well as a candidate can set it for themselves. */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Special Focus</span>
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 400 }}>(optional — narrows questions to specific topics)</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              value={specialFocusInput}
              onChange={e => setSpecialFocusInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault()
                  addSpecialFocusChip(specialFocusInput)
                  setSpecialFocusInput('')
                }
              }}
              placeholder="e.g. Agentic AI Patterns — press Enter to add"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              type="button"
              onClick={handleWhatsHot}
              disabled={!jobTitle.trim() || hotTopicsLoading}
              title={!jobTitle.trim() ? 'Add a job title first' : undefined}
              style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7,
                background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.35)',
                borderRadius: 10, padding: '0 18px', color: '#a78bfa', fontSize: 13, fontWeight: 700,
                fontFamily: 'inherit', cursor: !jobTitle.trim() || hotTopicsLoading ? 'not-allowed' : 'pointer',
                opacity: !jobTitle.trim() ? 0.5 : 1,
              }}
            >
              {hotTopicsLoading ? '…' : '🔥'} What's Hot
            </button>
          </div>
          {specialFocusChips.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
              {specialFocusChips.map(chip => (
                <span key={chip} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)',
                  borderRadius: 20, padding: '6px 8px 6px 14px', fontSize: 12.5, color: 'var(--text)', fontWeight: 600,
                }}>
                  {chip}
                  <button
                    type="button"
                    onClick={() => removeSpecialFocusChip(chip)}
                    aria-label={`Remove ${chip}`}
                    style={{
                      width: 18, height: 18, borderRadius: '50%', border: 'none',
                      background: 'rgba(255,255,255,0.08)', color: 'var(--text-3)', fontSize: 12,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
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
  const [pageSize, setPageSize] = useState(7)
  // Bulk delete (Francis, 2026-09-24: clearing ~50 test preps) — selection spans the whole filtered
  // list, not just the visible page, so "select all" really means all of them.
  // Confirmation pop-up after a send/resend (Francis, 2026-09-25: worth having a clear "moment" on screen —
  // it also films well — rather than the new row just appearing in the list).
  const [sentNotice, setSentNotice] = useState<{ name: string; email: string; updated: boolean; phase: 'sending' | 'done' } | null>(null)
  // The send itself has already finished by the time this appears, so the "Sending…" beat is a short (1.5s) deliberate
  // pause — it reads as the action happening, and gives the confirmation a moment to land on screen.
  useEffect(() => {
    if (sentNotice?.phase !== 'sending') return
    const t = setTimeout(() => setSentNotice(n => (n ? { ...n, phase: 'done' } : n)), 1500)
    return () => clearTimeout(t)
  }, [sentNotice?.phase])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function deleteSelected() {
    if (!token || selected.size === 0 || deleting) return
    const n = selected.size
    if (!window.confirm(`Delete ${n} interview prep${n === 1 ? '' : 's'}? The candidate${n === 1 ? '' : 's'} will no longer see ${n === 1 ? 'it' : 'them'}, and any CV file attached will be removed. This can't be undone.`)) return
    setDeleting(true)
    setDeleteError('')
    try {
      await interviewPrepsApi.remove(token, [...selected])
      setPreps(p => p.filter(x => !selected.has(x.id)))
      setSelected(new Set())
      setPage(1)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete.')
    } finally {
      setDeleting(false)
    }
  }

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)
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
              setSentNotice({ name: `${prep.firstName} ${prep.lastName}`.trim(), email: prep.email, updated: !!editingPrep, phase: 'sending' })
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
                      onChange={e => { setSearch(e.target.value); setPage(1); setSelected(new Set()) }}
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
                      <button key={f} onClick={() => { setFilter(f); setPage(1); setSelected(new Set()) }} style={{
                        padding: '8px 14px', borderRadius: 20, border: '1px solid', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                        background: filter === f ? 'rgba(79,142,247,0.15)' : 'transparent',
                        borderColor: filter === f ? 'rgba(79,142,247,0.5)' : 'var(--border)',
                        color: filter === f ? '#4F8EF7' : 'var(--text-3)', transition: 'all 0.15s',
                      }}>{f}</button>
                    ))}
                  </div>
                </div>

                {(selected.size > 0 || deleteError) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                    {selected.size > 0 && (
                      <>
                        <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 600 }}>{selected.size} selected</span>
                        <button onClick={deleteSelected} disabled={deleting} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', color: '#F87171', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: deleting ? 'default' : 'pointer', opacity: deleting ? 0.6 : 1 }}>
                          {deleting ? <><Loader2 size={13} className="animate-spin" /> Deleting…</> : <><Trash2 size={13} /> Delete selected</>}
                        </button>
                        <button onClick={() => setSelected(new Set())} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>Clear selection</button>
                      </>
                    )}
                    {deleteError && <span style={{ fontSize: 12, color: '#F87171' }}>{deleteError}</span>}
                  </div>
                )}

                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <th style={{ ...thStyle, width: 40 }}>
                            <input
                              type="checkbox"
                              title={`Select all ${filtered.length} matching preps`}
                              checked={filtered.length > 0 && filtered.every(p => selected.has(p.id))}
                              onChange={e => setSelected(e.target.checked ? new Set(filtered.map(p => p.id)) : new Set())}
                              style={{ cursor: 'pointer' }}
                            />
                          </th>
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
                              <td style={{ padding: '14px 8px 14px 16px', width: 40 }} onClick={e => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selected.has(prep.id)}
                                  onChange={e => setSelected(prev => { const next = new Set(prev); if (e.target.checked) next.add(prep.id); else next.delete(prep.id); return next })}
                                  style={{ cursor: 'pointer' }}
                                />
                              </td>
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

                  <Pagination
                    page={page} totalPages={totalPages} onPageChange={setPage}
                    pageSize={pageSize} onPageSizeChange={n => { setPageSize(n); setPage(1) }}
                    rangeStart={(page - 1) * pageSize + 1} rangeEnd={Math.min(page * pageSize, filtered.length)} total={filtered.length}
                  />
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sentNotice && (
          <motion.div
            key="sent-notice"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { if (sentNotice.phase === 'done') setSentNotice(null) }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 420, textAlign: 'center', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 20, padding: '36px 32px 30px', boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}
            >
              <AnimatePresence mode="wait" initial={false}>
                {sentNotice.phase === 'sending' ? (
                  <motion.div key="sending" exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15 }}>
                    <div style={{ position: 'relative', width: 76, height: 76, margin: '0 auto 20px' }}>
                      <motion.div
                        animate={{ scale: [1, 1.5], opacity: [0.5, 0] }} transition={{ duration: 1, repeat: Infinity, ease: 'easeOut' }}
                        style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(79,142,247,0.45)' }}
                      />
                      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#4F8EF7,#2563eb)', boxShadow: '0 10px 32px rgba(79,142,247,0.35)', overflow: 'hidden' }}>
                        <motion.div animate={{ x: [-26, 0, 26], y: [10, 0, -10], opacity: [0, 1, 0] }} transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}>
                          <Send size={32} color="#fff" strokeWidth={2} />
                        </motion.div>
                      </div>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', lineHeight: 1.3 }}>Sending prep link to<br />{sentNotice.name}…</div>
                    <div style={{ height: 40 }} />
                  </motion.div>
                ) : (
                  <motion.div key="done" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.05, type: 'spring', stiffness: 280, damping: 16 }}
                      style={{ width: 76, height: 76, borderRadius: '50%', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#34D399,#047857)', boxShadow: '0 10px 32px rgba(52,211,153,0.35)' }}
                    >
                      <MailCheck size={36} color="#fff" strokeWidth={2} />
                    </motion.div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
                      {sentNotice.updated ? 'Prep link updated and resent to' : 'Prep link sent to'}<br />{sentNotice.name}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 10, lineHeight: 1.6 }}>
                      {sentNotice.email}<br />They can start practicing straight away.
                    </div>
                    <button
                      onClick={() => setSentNotice(null)}
                      style={{ marginTop: 24, padding: '11px 32px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Done
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
