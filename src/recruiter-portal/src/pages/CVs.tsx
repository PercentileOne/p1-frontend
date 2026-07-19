import { useState, useRef, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Upload, Mail } from 'lucide-react'

const CVS = [
  {
    id: 1, initials: 'JO', candidate: 'James Okafor', email: 'j.okafor@gmail.com', mobile: '07712 334 891',
    role: 'Senior .NET Developer', source: 'Email', received: '18 Jul', status: 'Shortlisted',
    trustScore: 82, practiceScore: 78, hasPracticed: true, packGenerated: true,
    location: 'London, UK', experience: '8 years', currentEmployer: 'Accenture',
    education: 'BSc Computer Science, UCL', salaryExpectation: '£85,000', rightToWork: 'Yes — UK Citizen',
    linkedin: 'linkedin.com/in/jokafor',
    skills: ['.NET', 'C#', 'Azure', 'SQL Server', 'React', 'Microservices'],
    summary: 'Senior .NET developer with 8 years building enterprise-grade systems for financial services clients. Strong Azure background and team lead experience.',
  },
  {
    id: 2, initials: 'SM', candidate: 'Sarah Mitchell', email: 's.mitchell@outlook.com', mobile: '07834 221 556',
    role: 'Product Manager', source: 'Upload', received: '17 Jul', status: 'Reviewed',
    trustScore: 71, practiceScore: null, hasPracticed: false, packGenerated: true,
    location: 'Manchester, UK', experience: '5 years', currentEmployer: 'Booking.com',
    education: 'MBA, Manchester Business School', salaryExpectation: '£70,000', rightToWork: 'Yes — UK Citizen',
    linkedin: 'linkedin.com/in/sarahmitchell',
    skills: ['Agile', 'Roadmapping', 'Jira', 'Stakeholder Mgmt', 'SQL', 'Figma'],
    summary: 'Product Manager with a track record of shipping B2C digital products. Data-driven approach with strong cross-functional team leadership.',
  },
  {
    id: 3, initials: 'RP', candidate: 'Raj Patel', email: 'raj.patel@proton.me', mobile: '07901 445 772',
    role: 'DevOps Engineer', source: 'Email', received: '17 Jul', status: 'New',
    trustScore: 68, practiceScore: null, hasPracticed: false, packGenerated: false,
    location: 'Birmingham, UK', experience: '4 years', currentEmployer: 'DXC Technology',
    education: 'BEng Electronic Engineering, Aston University', salaryExpectation: '£65,000', rightToWork: 'Yes — ILR',
    linkedin: '',
    skills: ['Kubernetes', 'Docker', 'Terraform', 'AWS', 'CI/CD', 'Python'],
    summary: 'DevOps engineer specialising in containerised deployments and infrastructure as code. Experience across AWS and on-premise environments.',
  },
  {
    id: 4, initials: 'CT', candidate: 'Claire Thompson', email: 'claire.t@mac.com', mobile: '07766 998 123',
    role: 'UX Designer', source: 'Upload', received: '16 Jul', status: 'Shortlisted',
    trustScore: 91, practiceScore: 88, hasPracticed: true, packGenerated: true,
    location: 'London, UK', experience: '6 years', currentEmployer: 'Fjord (Accenture Song)',
    education: 'BA Graphic Design, Goldsmiths', salaryExpectation: '£72,000', rightToWork: 'Yes — UK Citizen',
    linkedin: 'linkedin.com/in/clairethompsonux',
    skills: ['Figma', 'User Research', 'Prototyping', 'Design Systems', 'Accessibility', 'Motion'],
    summary: 'Senior UX designer with agency and in-house experience. Specialist in research-led design and building scalable design systems.',
  },
  {
    id: 5, initials: 'DO', candidate: 'Daniel Osei', email: 'd.osei@gmail.com', mobile: '07523 661 340',
    role: 'Data Analyst', source: 'Email', received: '15 Jul', status: 'Rejected',
    trustScore: null, practiceScore: null, hasPracticed: false, packGenerated: false,
    location: 'Leeds, UK', experience: '2 years', currentEmployer: 'Freelance',
    education: 'BSc Mathematics, University of Leeds', salaryExpectation: '£45,000', rightToWork: 'Yes — UK Citizen',
    linkedin: '',
    skills: ['Python', 'Excel', 'Power BI', 'SQL'],
    summary: 'Junior data analyst with experience in retail analytics and dashboard reporting. Looking for first permanent role.',
  },
  {
    id: 7, initials: 'FC', candidate: 'Francis Cobbinah', email: 'francis@percentile.one', mobile: '07432 367 704',
    role: 'Senior .NET Developer & Software Architect', source: 'Upload', received: '19 Jul', status: 'Shortlisted',
    trustScore: 96, practiceScore: null, hasPracticed: false, packGenerated: false,
    location: 'London, UK', experience: '24 years', currentEmployer: 'Percentile One (Self-Employed)',
    education: 'Microsoft Certified Professional (1998, 2005) · 400+ Technical Books',
    salaryExpectation: '£95,000+', rightToWork: 'Yes — UK',
    linkedin: 'linkedin.com/in/franciscobbinah',
    skills: ['.NET / C#', 'Azure', 'React', 'SQL Server', 'Software Architecture', 'Microservices'],
    summary: 'Exceptionally passionate Senior .NET Developer and Software Architect with 24 years of commercial experience across investment banking, insurance, and retail. Currently building a cutting-edge AI-powered learning and recruitment platform (Explain.global). Previous employers include Bank of Tokyo Mitsubishi, HSBC, Amlin Insurance, Marks & Spencer and BGC Partners.',
  },
  {
    id: 6, initials: 'PS', candidate: 'Priya Sharma', email: 'priya.sharma@hotmail.co.uk', mobile: '07688 774 902',
    role: 'Business Analyst', source: 'Upload', received: '14 Jul', status: 'Reviewed',
    trustScore: 77, practiceScore: 74, hasPracticed: true, packGenerated: true,
    location: 'London, UK', experience: '7 years', currentEmployer: 'KPMG',
    education: 'BSc Business Information Systems, City University', salaryExpectation: '£68,000', rightToWork: 'Yes — UK Citizen',
    linkedin: 'linkedin.com/in/priyasharma-ba',
    skills: ['BPMN', 'Requirements Gathering', 'Agile', 'Visio', 'SQL', 'Stakeholder Mgmt'],
    summary: 'Business analyst with 7 years in financial services and consulting. Strong process modelling and requirements elicitation skills.',
  },
]

const STATUS_OPTIONS = ['All', 'New', 'Reviewed', 'Shortlisted', 'Rejected']
const SOURCE_OPTIONS = ['All Sources', 'Upload', 'Email']

const STATUS_COLORS: Record<string, string> = {
  New: '#4F8EF7',
  Reviewed: '#A78BFA',
  Shortlisted: '#34D399',
  Rejected: '#EF4444',
}

export default function CVsPage() {
  const [filter, setFilter] = useState('All')
  const [source, setSource] = useState('All Sources')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<typeof CVS[0] | null>(null)
  const [dragging, setDragging] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const visible = CVS.filter(c => {
    const matchStatus = filter === 'All' || c.status === filter
    const matchSource = source === 'All Sources' || c.source === source
    const q = search.toLowerCase()
    const matchSearch = !q || c.candidate.toLowerCase().includes(q) || c.role.toLowerCase().includes(q) || c.skills.some(s => s.toLowerCase().includes(q))
    return matchStatus && matchSource && matchSearch
  })

  return (
    <div style={{ display: 'flex', gap: 20, height: '100%', minHeight: 0 }}>

      {/* Left panel */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>CV Library</h1>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
              {CVS.length} CVs · {CVS.filter(c => c.status === 'Shortlisted').length} shortlisted · {CVS.filter(c => !c.hasPracticed).length} yet to practice
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowUpload(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 16px', background: 'var(--bg2)',
                border: '1px solid var(--border)', borderRadius: 8,
                fontSize: 13, fontWeight: 600, color: 'var(--text-2)',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <Upload size={14} /> Upload CV
            </button>
            <button style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 16px', background: 'rgba(79,142,247,0.1)',
              border: '1px solid rgba(79,142,247,0.25)', borderRadius: 8,
              fontSize: 13, fontWeight: 600, color: '#4F8EF7',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <Mail size={14} /> Connect Inbox
            </button>
          </div>
        </div>

        {/* Drop zone */}
        <AnimatePresence>
          {showUpload && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); setShowUpload(false) }}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragging ? '#4F8EF7' : 'rgba(79,142,247,0.3)'}`,
                  borderRadius: 12, padding: '28px 20px',
                  background: dragging ? 'rgba(79,142,247,0.07)' : 'rgba(79,142,247,0.03)',
                  textAlign: 'center', cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative',
                }}
              >
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" multiple style={{ display: 'none' }} />
                <Upload size={24} color="#4F8EF7" style={{ marginBottom: 8 }} />
                <p style={{ color: 'var(--text-2)', fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>
                  Drag & drop CVs here, or click to browse
                </p>
                <p style={{ color: 'var(--text-3)', fontSize: 11, margin: 0 }}>
                  PDF, Word (.doc, .docx) — multiple files supported
                </p>
                <button
                  onClick={e => { e.stopPropagation(); setShowUpload(false) }}
                  style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex' }}
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 0 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, role, or skill…"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8,
                padding: '9px 36px 9px 14px', fontSize: 13, color: 'var(--text)', outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 2 }}>
                <X size={14} />
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STATUS_OPTIONS.map(s => (
              <button key={s} onClick={() => setFilter(s)} style={{
                padding: '7px 13px', borderRadius: 20, border: '1px solid',
                fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                background: filter === s ? 'rgba(79,142,247,0.15)' : 'transparent',
                borderColor: filter === s ? 'rgba(79,142,247,0.5)' : 'var(--border)',
                color: filter === s ? '#4F8EF7' : 'var(--text-3)',
                transition: 'all 0.15s',
              }}>{s}</button>
            ))}
            <div style={{ width: 1, background: 'var(--border)', margin: '0 2px' }} />
            {SOURCE_OPTIONS.map(s => (
              <button key={s} onClick={() => setSource(s)} style={{
                padding: '7px 13px', borderRadius: 20, border: '1px solid',
                fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                background: source === s ? 'rgba(167,139,250,0.15)' : 'transparent',
                borderColor: source === s ? 'rgba(167,139,250,0.5)' : 'var(--border)',
                color: source === s ? '#A78BFA' : 'var(--text-3)',
                transition: 'all 0.15s',
              }}>{s}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Candidate', 'Role', 'Skills', 'Source', 'Received', 'Trust', 'Practiced', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((c, i) => (
                <tr
                  key={c.id}
                  onClick={() => setSelected(c)}
                  style={{
                    background: selected?.id === c.id ? 'rgba(79,142,247,0.08)' : i % 2 === 1 ? 'rgba(255,255,255,0.025)' : 'transparent',
                    cursor: 'pointer', transition: 'background 0.12s',
                    borderLeft: selected?.id === c.id ? '2px solid #4F8EF7' : '2px solid transparent',
                  }}
                  onMouseEnter={e => { if (selected?.id !== c.id) e.currentTarget.style.background = 'rgba(79,142,247,0.05)' }}
                  onMouseLeave={e => { if (selected?.id !== c.id) e.currentTarget.style.background = i % 2 === 1 ? 'rgba(255,255,255,0.025)' : 'transparent' }}
                >
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#4F8EF7,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{c.initials}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.candidate}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.location}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{c.role}</td>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {c.skills.slice(0, 3).map(s => (
                        <span key={s} style={{ fontSize: 10, fontWeight: 600, color: '#4F8EF7', background: 'rgba(79,142,247,0.1)', padding: '2px 7px', borderRadius: 10 }}>{s}</span>
                      ))}
                      {c.skills.length > 3 && <span style={{ fontSize: 10, color: 'var(--text-3)' }}>+{c.skills.length - 3}</span>}
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ fontSize: 11, color: c.source === 'Email' ? '#A78BFA' : 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {c.source === 'Email' ? <Mail size={11} /> : <Upload size={11} />} {c.source}
                    </span>
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{c.received}</td>
                  <td style={{ padding: '13px 16px' }}>
                    {c.trustScore != null
                      ? <span style={{ fontSize: 13, fontWeight: 800, color: c.trustScore >= 75 ? '#34D399' : c.trustScore >= 60 ? '#F59E0B' : '#EF4444' }}>{c.trustScore}%</span>
                      : <span style={{ fontSize: 12, color: 'var(--text-3)' }}>—</span>}
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    {c.hasPracticed
                      ? <span style={{ fontSize: 11, color: '#34D399', fontWeight: 700 }}>✓ {c.practiceScore}%</span>
                      : <span style={{ fontSize: 11, color: '#F59E0B' }}>Not yet</span>}
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLORS[c.status], background: `${STATUS_COLORS[c.status]}18`, padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>{c.status}</span>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ fontSize: 11, color: '#4F8EF7', fontWeight: 600 }}>View →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No CVs match your search.</div>
          )}
        </div>
      </div>

      {/* Right panel — CV detail */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{
              width: 320, flexShrink: 0,
              background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16,
              display: 'flex', flexDirection: 'column',
              maxHeight: 'calc(100vh - 100px)', overflowY: 'auto',
            }}
          >
            {/* Panel header */}
            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#4F8EF7,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{selected.initials}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{selected.candidate}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{selected.role}</div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 2, flexShrink: 0, marginTop: 2 }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Scores */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <ScoreCard label="Trust Score" value={selected.trustScore} suffix="%" color={selected.trustScore != null && selected.trustScore >= 75 ? '#34D399' : '#F59E0B'} />
                <ScoreCard label="Practice Score" value={selected.practiceScore} suffix="%" color="#4F8EF7" empty={!selected.hasPracticed} />
              </div>

              {/* Explain activity */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 2 }}>Explain Activity</div>
                <ActivityRow label="Has Practiced" value={selected.hasPracticed ? 'Yes' : 'Not yet'} ok={selected.hasPracticed} />
                <ActivityRow label="Pack Generated" value={selected.packGenerated ? 'Yes' : 'No'} ok={selected.packGenerated} />
                <ActivityRow label="Practice Score" value={selected.practiceScore != null ? `${selected.practiceScore}%` : '—'} ok={selected.practiceScore != null} />
              </div>

              {/* Contact */}
              <Section title="Contact">
                <DetailRow label="Email" value={selected.email} />
                <DetailRow label="Mobile" value={selected.mobile} />
                <DetailRow label="Location" value={selected.location} />
                {selected.linkedin && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="#4F8EF7"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2" fill="#4F8EF7"/></svg>
                    <span style={{ fontSize: 11, color: '#4F8EF7' }}>{selected.linkedin}</span>
                  </div>
                )}
              </Section>

              {/* CV Details */}
              <Section title="CV Details">
                <DetailRow label="Experience" value={selected.experience} />
                <DetailRow label="Current Employer" value={selected.currentEmployer} />
                <DetailRow label="Education" value={selected.education} />
                <DetailRow label="Salary Expectation" value={selected.salaryExpectation} />
                <DetailRow label="Right to Work" value={selected.rightToWork} />
              </Section>

              {/* Skills */}
              <Section title="AI-Extracted Skills">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {selected.skills.map(s => (
                    <span key={s} style={{ fontSize: 11, fontWeight: 600, color: '#4F8EF7', background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)', padding: '3px 9px', borderRadius: 12 }}>{s}</span>
                  ))}
                </div>
              </Section>

              {/* Summary */}
              <Section title="AI Summary">
                <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>{selected.summary}</p>
              </Section>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
                <ActionBtn primary label="+ Generate Interview Pack" />
                <ActionBtn label="Shortlist Candidate" />
                <ActionBtn label="Download CV" />
                <ActionBtn label="Send to Candidate" />
              </div>

              {/* Status */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Object.keys(STATUS_COLORS).map(s => (
                  <button
                    key={s}
                    onClick={() => {}}
                    style={{
                      flex: 1, padding: '7px 4px', borderRadius: 8, border: '1px solid',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      background: selected.status === s ? `${STATUS_COLORS[s]}18` : 'transparent',
                      borderColor: selected.status === s ? STATUS_COLORS[s] : 'var(--border)',
                      color: selected.status === s ? STATUS_COLORS[s] : 'var(--text-3)',
                      transition: 'all 0.15s',
                    }}
                  >{s}</button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── HELPERS ── */
function ScoreCard({ label, value, suffix, color, empty }: { label: string; value: number | null; suffix: string; color: string; empty?: boolean }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      {value != null && !empty
        ? <div style={{ fontSize: 26, fontWeight: 900, color }}>{value}{suffix}</div>
        : <div style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 600 }}>Not yet</div>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
      <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 11, color: 'var(--text-2)', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

function ActivityRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: ok ? '#34D399' : '#F59E0B' }}>{value}</span>
    </div>
  )
}

function ActionBtn({ label, primary }: { label: string; primary?: boolean }) {
  return (
    <button style={{
      width: '100%', padding: '10px 14px', borderRadius: 8,
      background: primary ? 'var(--blue)' : 'transparent',
      border: `1px solid ${primary ? 'transparent' : 'var(--border)'}`,
      color: primary ? '#fff' : 'var(--text-2)',
      fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
      transition: 'all 0.15s',
    }}>{label}</button>
  )
}
