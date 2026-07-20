import { useState, useRef } from 'react'
import { Upload, ChevronLeft, FileText, User, Zap, Save, CheckCircle, Star } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Spec {
  title: string
  client: string
  salary: string
  type: string
  deadline: string
  requirements: string[]
  skills: string[]
}

interface CV {
  name: string
  role: string
  experience: string
  skills: string[]
  highlights: string[]
}

const MOCK_SPEC: Spec = {
  title: 'Senior .NET Developer',
  client: 'Barclays Tech',
  salary: '£75k–£90k',
  type: 'Permanent',
  deadline: '1 Aug 2026',
  requirements: [
    '5+ years .NET / C# experience',
    'Strong Azure cloud background',
    'Experience with microservices architecture',
    'SQL Server and Entity Framework',
    'Agile / Scrum delivery experience',
    'Financial services experience preferred',
  ],
  skills: ['.NET', 'C#', 'Azure', 'SQL Server', 'Microservices', 'React', 'Agile'],
}

const MOCK_CV: CV = {
  name: 'James Okafor',
  role: 'Senior .NET Developer',
  experience: '8 years',
  skills: ['.NET', 'C#', 'Azure', 'SQL Server', 'React', 'Microservices', 'Docker'],
  highlights: [
    '8 years building enterprise .NET systems at Accenture',
    'Led Azure migration for a major UK bank',
    'Delivered microservices platform handling 2M+ daily transactions',
    'Team lead experience across 6-person squads',
    'BSc Computer Science, UCL',
  ],
}

const MOCK_PACK_SPEC_ONLY = [
  { category: 'Technical',   question: 'Walk me through your experience with microservices in .NET — what patterns have you used and what challenges did you face?', from: 'Spec', fromText: 'Microservices architecture' },
  { category: 'Technical',   question: 'Describe a complex Azure deployment you led. What services did you use and how did you handle scaling?',                     from: 'Spec', fromText: 'Strong Azure cloud background' },
  { category: 'Technical',   question: 'How do you approach database design in SQL Server for high-throughput financial applications?',                              from: 'Spec', fromText: 'SQL Server · Financial services' },
  { category: 'Behavioural', question: 'Tell me about a time you led a team through a challenging delivery. How did you manage competing priorities?',               from: 'Spec', fromText: 'Agile / Scrum delivery' },
  { category: 'Behavioural', question: 'Describe a situation where you had to push back on requirements from a stakeholder. How did you handle it?',                 from: 'Spec', fromText: 'Financial services experience' },
  { category: 'Culture',     question: 'What does a good engineering culture look like to you, and how have you contributed to one in your current role?',           from: 'Spec', fromText: 'Barclays Tech values' },
]

const MOCK_PACK_WITH_CV = [
  { category: 'Technical',   question: 'Walk me through your experience with microservices in .NET — what patterns have you used and what challenges did you face?', from: 'CV',   fromText: '2M+ daily transaction platform' },
  { category: 'Technical',   question: 'Describe a complex Azure deployment you led. What services did you use and how did you handle scaling?',                     from: 'CV',   fromText: 'Led Azure migration for UK bank' },
  { category: 'Technical',   question: 'How do you approach database design in SQL Server for high-throughput financial applications?',                              from: 'Spec', fromText: 'SQL Server · Financial services' },
  { category: 'Behavioural', question: 'Tell me about a time you led a team through a challenging delivery. How did you manage competing priorities?',               from: 'CV',   fromText: 'Team lead, 6-person squads' },
  { category: 'Behavioural', question: 'Describe a situation where you had to push back on requirements from a stakeholder. How did you handle it?',                 from: 'Spec', fromText: 'Financial services experience' },
  { category: 'Culture',     question: 'What does a good engineering culture look like to you, and how have you contributed to one in your current role?',           from: 'CV',   fromText: 'Senior / lead background' },
]

const CAT_COLORS: Record<string, string> = {
  Technical: '#4F8EF7',
  Behavioural: '#A78BFA',
  Culture: '#34D399',
}

const MOCK_SCORES: { score: number; comment: string }[] = [
  { score: 9, comment: 'Excellent depth — cited CQRS, event sourcing, and specific failure modes. Directly relevant.' },
  { score: 8, comment: 'Strong answer. Named Azure services accurately. Could have elaborated on cost controls.' },
  { score: 6, comment: 'Adequate but surface-level. Mentioned indexing but lacked financial-domain specifics.' },
  { score: 9, comment: 'Compelling example. Clear ownership, measurable outcome, good stakeholder management.' },
  { score: 7, comment: 'Reasonable response. Showed confidence but the outcome wasn\'t fully articulated.' },
  { score: 8, comment: 'Thoughtful and genuine. Referenced specific team rituals and how they improved delivery.' },
]

export default function PackBuilder({ specTitle, onBack }: { specTitle: string; onBack: () => void }) {
  const [cvUploaded, setCvUploaded] = useState(false)
  const [cvDragging, setCvDragging] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [saved, setSaved] = useState(false)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [scoring, setScoring] = useState(false)
  const [scores, setScores] = useState<Record<number, { score: number; comment: string }>>({})
  const cvRef = useRef<HTMLInputElement>(null)

  function handleGenerate() {
    setGenerating(true)
    setAnswers({})
    setScores({})
    setTimeout(() => { setGenerating(false); setGenerated(true) }, 1800)
  }

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function handleScoreAnswers() {
    setScoring(true)
    setTimeout(() => {
      const result: Record<number, { score: number; comment: string }> = {}
      packRows.forEach((_, i) => { if (answers[i]?.trim()) result[i] = MOCK_SCORES[i] })
      setScores(result)
      setScoring(false)
    }, 2200)
  }

  const answeredCount = Object.values(answers).filter(a => a.trim()).length
  const scoredCount = Object.keys(scores).length
  const overallScore = scoredCount > 0
    ? Math.round(Object.values(scores).reduce((sum, s) => sum + s.score, 0) / scoredCount * 10)
    : null

  const spec = MOCK_SPEC
  const cv = cvUploaded ? MOCK_CV : null
  const packRows = cvUploaded ? MOCK_PACK_WITH_CV : MOCK_PACK_SPEC_ONLY

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontFamily: 'inherit', padding: 0 }}>
          <ChevronLeft size={16} /> Job Specs
        </button>
        <span style={{ color: 'var(--border)' }}>/</span>
        <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 600 }}>{specTitle}</span>
        <span style={{ fontSize: 13, color: 'var(--border)' }}>→</span>
        <span style={{ fontSize: 13, color: '#4F8EF7', fontWeight: 600 }}>Pack Builder</span>
      </div>

      {/* Top two panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Job Spec panel */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(79,142,247,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={15} color="#4F8EF7" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>{spec.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{spec.client} · {spec.type} · {spec.salary}</div>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#34D399', background: 'rgba(52,211,153,0.1)', padding: '3px 8px', borderRadius: 20 }}>Loaded</span>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>Requirements</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {spec.requirements.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 13, color: 'var(--text-2)' }}>
                  <span style={{ color: '#4F8EF7', marginTop: 1, flexShrink: 0 }}>·</span> {r}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>Key Skills</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {spec.skills.map(s => (
                <span key={s} style={{ fontSize: 12, fontWeight: 600, color: '#4F8EF7', background: 'rgba(79,142,247,0.1)', padding: '4px 10px', borderRadius: 10 }}>{s}</span>
              ))}
            </div>
          </div>
        </div>

        {/* CV panel */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
          <AnimatePresence mode="wait">
            {!cvUploaded ? (
              <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={15} color="#A78BFA" />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>Candidate CV</div>
                  <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: 'var(--text-3)', background: 'var(--bg)', padding: '3px 8px', borderRadius: 20, border: '1px solid var(--border)' }}>Optional</span>
                </div>
                <div
                  onDragOver={e => { e.preventDefault(); setCvDragging(true) }}
                  onDragLeave={() => setCvDragging(false)}
                  onDrop={e => { e.preventDefault(); setCvDragging(false); setCvUploaded(true) }}
                  onClick={() => cvRef.current?.click()}
                  style={{
                    flex: 1, border: `2px dashed ${cvDragging ? '#A78BFA' : 'rgba(167,139,250,0.3)'}`,
                    borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 8, cursor: 'pointer', background: cvDragging ? 'rgba(167,139,250,0.06)' : 'transparent',
                    transition: 'all 0.2s', padding: 20, minHeight: 160,
                  }}
                >
                  <input ref={cvRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={() => setCvUploaded(true)} />
                  <Upload size={22} color="#A78BFA" />
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', textAlign: 'center' }}>Drop CV here, or click to browse</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>PDF or Word — AI will extract the details</div>
                </div>
                <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-3)', textAlign: 'center' }}>
                  No CV yet? You can still generate a spec-based pack and add it later.
                </div>
              </motion.div>
            ) : (
              <motion.div key="cv" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#A78BFA,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff' }}>JO</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{cv!.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{cv!.role} · {cv!.experience} exp</div>
                  </div>
                  <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#34D399', background: 'rgba(52,211,153,0.1)', padding: '3px 8px', borderRadius: 20 }}>CV Loaded</span>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>Key Highlights</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {cv!.highlights.map((h, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 13, color: 'var(--text-2)' }}>
                        <span style={{ color: '#A78BFA', marginTop: 1, flexShrink: 0 }}>·</span> {h}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>Skills</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {cv!.skills.map(s => (
                      <span key={s} style={{ fontSize: 12, fontWeight: 600, color: '#A78BFA', background: 'rgba(167,139,250,0.1)', padding: '4px 10px', borderRadius: 10 }}>{s}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Generate button */}
      {!generated && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <motion.button
            onClick={handleGenerate}
            disabled={generating}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '13px 32px', borderRadius: 10,
              background: generating ? 'rgba(79,142,247,0.3)' : 'linear-gradient(135deg,#4F8EF7,#7C3AED)',
              border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: generating ? 'wait' : 'pointer', fontFamily: 'inherit',
              boxShadow: '0 4px 24px rgba(79,142,247,0.3)',
            }}
          >
            <Zap size={15} />
            {generating ? 'Generating Pack…' : cvUploaded ? 'Generate Interview Pack' : 'Generate Pack from Spec'}
          </motion.button>
        </div>
      )}

      {/* Generated pack */}
      <AnimatePresence>
        {generated && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

            {/* Pack header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' }}>Interview Pack</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                  {packRows.length} questions · {cvUploaded ? 'Tailored to spec + CV' : 'Based on spec only'}
                  {answeredCount > 0 && <span style={{ color: '#34D399', marginLeft: 8 }}>· {answeredCount} answered</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {/* Overall score pill */}
                {overallScore !== null && (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: overallScore >= 75 ? 'rgba(52,211,153,0.15)' : overallScore >= 55 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${overallScore >= 75 ? 'rgba(52,211,153,0.3)' : overallScore >= 55 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                    <Star size={11} color={overallScore >= 75 ? '#34D399' : overallScore >= 55 ? '#F59E0B' : '#EF4444'} />
                    <span style={{ fontSize: 13, fontWeight: 900, color: overallScore >= 75 ? '#34D399' : overallScore >= 55 ? '#F59E0B' : '#EF4444' }}>{overallScore}%</span>
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>overall</span>
                  </motion.div>
                )}
                {/* Score answers button */}
                {answeredCount > 0 && scoredCount === 0 && (
                  <motion.button onClick={handleScoreAnswers} disabled={scoring} whileHover={{ scale: 1.02 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: scoring ? 'rgba(167,139,250,0.3)' : 'linear-gradient(135deg,#A78BFA,#7C3AED)', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, color: '#fff', cursor: scoring ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
                    <Star size={13} />{scoring ? 'Scoring…' : `Score ${answeredCount} Answer${answeredCount > 1 ? 's' : ''}`}
                  </motion.button>
                )}
                <button onClick={handleGenerate} style={{ padding: '8px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, fontWeight: 600, color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Regenerate
                </button>
                <motion.button onClick={handleSave} whileHover={{ scale: 1.02 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: saved ? '#34D399' : 'var(--blue)', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.2s' }}>
                  {saved ? <><CheckCircle size={13} /> Saved</> : <><Save size={13} /> Save Pack</>}
                </motion.button>
              </div>
            </div>

            {/* Questions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {packRows.map((q, i) => {
                const s = scores[i]
                const scoreColor = s ? (s.score >= 8 ? '#34D399' : s.score >= 6 ? '#F59E0B' : '#EF4444') : null
                return (
                  <div key={i} style={{ background: 'var(--bg2)', border: `1px solid ${s ? (scoreColor + '40') : 'var(--border)'}`, borderRadius: 12, padding: '14px 16px', transition: 'border-color 0.3s' }}>
                    {/* Question row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-3)', minWidth: 18, marginTop: 1, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: CAT_COLORS[q.category], background: `${CAT_COLORS[q.category]}18`, padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap', marginTop: 1 }}>{q.category}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.5 }}>{q.question}</div>
                        <div style={{ marginTop: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: q.from === 'CV' ? '#A78BFA' : '#4F8EF7', background: q.from === 'CV' ? 'rgba(167,139,250,0.12)' : 'rgba(79,142,247,0.12)', padding: '2px 7px', borderRadius: 20, marginRight: 5 }}>{q.from}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{q.fromText}</span>
                        </div>
                      </div>
                      {/* Score badge */}
                      {s && (
                        <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                          style={{ flexShrink: 0, width: 40, height: 40, borderRadius: '50%', background: `${scoreColor}18`, border: `2px solid ${scoreColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: scoreColor }}>
                          {s.score}
                        </motion.div>
                      )}
                    </div>

                    {/* Answer textarea */}
                    <div style={{ marginTop: 10, marginLeft: 30 }}>
                      <textarea
                        value={answers[i] ?? ''}
                        onChange={e => setAnswers(a => ({ ...a, [i]: e.target.value }))}
                        placeholder="Type candidate's answer here during the call…"
                        rows={2}
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                          borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--text-2)',
                          fontFamily: 'inherit', resize: 'vertical', outline: 'none',
                          transition: 'border-color 0.15s',
                        }}
                        onFocus={e => (e.target.style.borderColor = 'rgba(167,139,250,0.5)')}
                        onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                      />
                    </div>

                    {/* AI comment */}
                    {s && (
                      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        style={{ marginTop: 6, marginLeft: 30, fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic', lineHeight: 1.5 }}>
                        <span style={{ color: scoreColor, fontStyle: 'normal', fontWeight: 700 }}>AI: </span>{s.comment}
                      </motion.div>
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
