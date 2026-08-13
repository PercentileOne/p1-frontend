import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import QRCode from 'qrcode'

const DEMO: Record<string, CandidateData> = {
  'francis-cobbinah-head-of-engineering': {
    name: 'Francis Cobbinah',
    role: 'Head of Engineering',
    company: 'Open to opportunities',
    location: 'London, UK',
    score: 91,
    grade: 'A+',
    gradeColor: '#34D399',
    interviewDate: '7 Aug 2026',
    interviewer: 'James (AI Technical Lead)',
    questions: 15,
    duration: '22 mins',
    tags: ['System Design', 'Leadership', 'Azure', '.NET', 'Team Building'],
    answers: [
      { q: "Walk me through how you'd architect a high-availability API at scale.", score: 94, summary: 'Demonstrated strong grasp of load balancing, circuit breakers, and blue-green deployments. Referenced real Azure infrastructure experience.' },
      { q: 'How do you handle technical debt when delivery timelines are tight?', score: 88, summary: 'Clear framework: triage by risk, document explicitly, schedule repayment in next sprint. Balanced pragmatism with engineering discipline.' },
      { q: 'Tell me about a time you had to rebuild trust within an engineering team.', score: 95, summary: 'Specific example, clear actions, measurable outcome. Showed genuine empathy and leadership under pressure.' },
      { q: 'How do you approach hiring engineers at senior level?', score: 89, summary: 'Focused on competency-based interviews, culture add vs culture fit, and portfolio review over whiteboard tests.' },
    ],
    dimensions: [
      { label: 'Depth', score: 93 },
      { label: 'Understanding', score: 90 },
      { label: 'Accuracy', score: 88 },
      { label: 'Relevance', score: 94 },
      { label: 'Delivery', score: 91 },
    ],
  },
}

interface CandidateData {
  name: string
  role: string
  company: string
  location: string
  score: number
  grade: string
  gradeColor: string
  interviewDate: string
  interviewer: string
  questions: number
  duration: string
  tags: string[]
  answers: { q: string; score: number; summary: string }[]
  dimensions: { label: string; score: number }[]
  profileVideoUrl?: string  // URL to profile intro video — set when candidate has recorded one
}

export default function Profile() {
  const { slug } = useParams<{ slug: string }>()
  const candidate = slug ? DEMO[slug] ?? DEMO['francis-cobbinah-head-of-engineering'] : DEMO['francis-cobbinah-head-of-engineering']
  const [inviteClicked, setInviteClicked] = useState(false)
  const [copied, setCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')

  const profileUrl = `https://interviewme.global/${slug ?? 'francis-cobbinah-head-of-engineering'}`

  useEffect(() => {
    QRCode.toDataURL(profileUrl, {
      width: 200,
      margin: 2,
      color: { dark: '#ffffff', light: '#060A12' },
    }).then(setQrDataUrl)
  }, [profileUrl])

  const shareText = `I just interviewed for ${candidate.role} on Explain.global and scored ${candidate.score} · ${candidate.grade} 🎯\n\nWatch my full AI-verified interview and contact me directly — no application needed.\n\n${profileUrl}\n\nLet's make CVs redundant. ✊\n\n#InterviewMe #MakeCVsRedundant #OpenToWork`

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060A12' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @media (max-width: 768px) {
          .vm-grid { grid-template-columns: 1fr !important; }
          .vm-dims { grid-template-columns: repeat(3,1fr) !important; }
          .vm-header { flex-direction: column !important; align-items: flex-start !important; }
        }
      `}</style>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', background: 'rgba(6,10,18,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 0 0 1px rgba(79,142,247,0.15)', background: '#060a12' }}>
            <img src="https://explain.global/images/mastermind-chair.png" alt="Explain" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%' }} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
            view<span style={{ color: '#4F8EF7' }}>me</span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400, fontSize: 13 }}> · explain.global</span>
          </span>
        </Link>
        <Link to="/login" style={{ fontSize: 12, fontWeight: 700, color: '#4F8EF7', padding: '8px 18px', border: '1px solid rgba(79,142,247,0.3)', borderRadius: 20, textDecoration: 'none', background: 'rgba(79,142,247,0.08)' }}>
          Search Candidates →
        </Link>
      </nav>

      <div style={{ paddingTop: 80, maxWidth: 860, margin: '0 auto', padding: '96px 24px 60px' }}>

        {/* HEADER */}
        <motion.div className="vm-header" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 36 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#4F8EF7', textTransform: 'uppercase', background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: 20, padding: '3px 10px' }}>
                ● Verified Interview
              </span>
              <span style={{ fontSize: 11, color: '#475569' }}>{candidate.interviewDate}</span>
            </div>
            <h1 style={{ fontSize: 'clamp(1.6rem,4vw,2.4rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 8 }}>
              {candidate.name}
            </h1>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>{candidate.role}</div>
            <div style={{ fontSize: 13, color: '#475569' }}>{candidate.location} · {candidate.company}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
              {candidate.tags.map(t => (
                <span key={t} style={{ fontSize: 11, fontWeight: 600, color: '#cbd5e1', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '3px 10px' }}>{t}</span>
              ))}
            </div>
          </div>

          {/* SCORE BADGE */}
          <div style={{ flexShrink: 0, textAlign: 'center', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 20, padding: '20px 28px' }}>
            <div style={{ fontSize: 48, fontWeight: 900, color: candidate.gradeColor, lineHeight: 1, letterSpacing: '-0.04em' }}>{candidate.score}</div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 4, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Interview Score</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: candidate.gradeColor, marginTop: 6 }}>{candidate.grade}</div>
          </div>
        </motion.div>

        {/* META ROW */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }}
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
          {[
            { icon: '🤖', label: `Interviewed by ${candidate.interviewer}` },
            { icon: '❓', label: `${candidate.questions} questions` },
            { icon: '⏱️', label: candidate.duration },
          ].map(m => (
            <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '6px 14px' }}>
              <span>{m.icon}</span> {m.label}
            </div>
          ))}
        </motion.div>

        {/* PROFILE VIDEO */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
          style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: '#475569', textTransform: 'uppercase', marginBottom: 14 }}>
            Profile Introduction
          </div>
          {candidate.profileVideoUrl ? (
            <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', background: '#000', aspectRatio: '16/9', maxHeight: 380 }}>
              <video
                src={candidate.profileVideoUrl}
                controls
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          ) : (
            <div style={{ borderRadius: 20, border: '1px dashed rgba(79,142,247,0.25)', background: 'rgba(79,142,247,0.03)', padding: '36px 32px', display: 'flex', alignItems: 'center', gap: 24 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22 }}>
                🎥
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>
                  {candidate.name.split(' ')[0]} hasn't recorded a profile introduction yet
                </div>
                <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                  Profile videos let candidates introduce themselves in their own words — personality, goals, and what makes them stand out.
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* SCORE DIMENSIONS */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
          style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: '#475569', textTransform: 'uppercase', marginBottom: 14 }}>Score Breakdown</div>
          <div className="vm-dims" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            {candidate.dimensions.map(d => (
              <div key={d.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: d.score >= 85 ? '#34D399' : '#4F8EF7', marginBottom: 6 }}>{d.score}</div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{d.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ANSWER CARDS */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}
          style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: '#475569', textTransform: 'uppercase', marginBottom: 14 }}>Interview Highlights</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {candidate.answers.map((a, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px 22px', display: 'flex', gap: 16 }}>
                <div style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 12, background: a.score >= 90 ? 'rgba(52,211,153,0.1)' : 'rgba(79,142,247,0.1)', border: `1px solid ${a.score >= 90 ? 'rgba(52,211,153,0.2)' : 'rgba(79,142,247,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: a.score >= 90 ? '#34D399' : '#4F8EF7' }}>
                  {a.score}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 6, lineHeight: 1.4, fontStyle: 'italic' }}>"{a.q}"</div>
                  <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.55 }}>{a.summary}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* INVITE CTA */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}
          style={{ background: 'linear-gradient(135deg,rgba(79,142,247,0.08),rgba(139,92,246,0.08))', border: '1px solid rgba(79,142,247,0.15)', borderRadius: 24, padding: '32px 36px', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Impressed by {candidate.name.split(' ')[0]}?</div>
          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>
            Send a direct chat invitation — no job posting, no application process.<br />
            Just a conversation between you and a candidate who's already proved it.
          </div>
          {inviteClicked ? (
            <div style={{ fontSize: 14, color: '#34D399', fontWeight: 700 }}>
              ✓ To send invitations, <Link to="/login" style={{ color: '#4F8EF7' }}>subscribe to ViewMe</Link> — from £599/month.
            </div>
          ) : (
            <button onClick={() => setInviteClicked(true)} style={{ padding: '14px 36px', borderRadius: 12, background: 'linear-gradient(135deg,#3b7ef7,#8B5CF6)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 24px rgba(79,142,247,0.3)' }}>
              Invite to Chat →
            </button>
          )}
          <div style={{ fontSize: 11, color: '#334155', marginTop: 14 }}>
            Already subscribed? <Link to="/login" style={{ color: '#4F8EF7', textDecoration: 'none' }}>Sign in</Link>
          </div>
        </motion.div>

        {/* QR CODE CARD */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48, duration: 0.5 }}
          style={{ marginTop: 24, background: 'rgba(79,142,247,0.04)', border: '1px solid rgba(79,142,247,0.15)', borderRadius: 24, padding: '28px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
            {qrDataUrl && (
              <div style={{ flexShrink: 0, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(79,142,247,0.2)', padding: 10, background: '#060A12' }}>
                <img src={qrDataUrl} alt="QR code" style={{ width: 120, height: 120, display: 'block' }} />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4F8EF7', marginBottom: 6 }}>Your interview · anywhere</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 8, lineHeight: 1.3 }}>Put this QR code on your CV, PDF, or printed leaflet</div>
              <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 16 }}>
                Anyone who scans it — phone, tablet, laptop — lands directly on your verified interview profile. Works on paper <em style={{ fontStyle: 'normal', color: '#94a3b8' }}>and</em> electronic CVs, Word docs, PDFs, email signatures, WhatsApp, anywhere.
              </div>
              <a
                href={qrDataUrl}
                download={`interviewme-qr-${slug ?? 'profile'}.png`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 10, background: 'rgba(79,142,247,0.12)', border: '1px solid rgba(79,142,247,0.3)', color: '#4F8EF7', fontSize: 13, fontWeight: 800, textDecoration: 'none' }}
              >
                ↓ Download QR code
              </a>
            </div>
          </div>
        </motion.div>

        {/* SHARE CARD */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}
          style={{ marginTop: 24, background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 24, padding: '28px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#FBBF24', marginBottom: 4 }}>Share your interview</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>Help us make CVs redundant ✊</div>
            </div>
            <button onClick={handleCopy} style={{ padding: '10px 22px', borderRadius: 10, background: copied ? 'rgba(52,211,153,0.15)' : 'rgba(251,191,36,0.12)', border: `1px solid ${copied ? 'rgba(52,211,153,0.4)' : 'rgba(251,191,36,0.35)'}`, color: copied ? '#34D399' : '#FBBF24', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
              {copied ? '✓ Copied!' : 'Copy share text →'}
            </button>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 12, padding: '14px 16px', fontSize: 13, color: '#94a3b8', lineHeight: 1.6, whiteSpace: 'pre-line', fontFamily: 'inherit' }}>
            {shareText}
          </div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 12 }}>Paste this on LinkedIn, in an email, on WhatsApp — anywhere. Every share brings employers directly to you.</div>
        </motion.div>

        {/* FOOTER */}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#334155' }}>Powered by <a href="https://explain.global" style={{ color: '#4F8EF7', textDecoration: 'none' }}>Explain.global</a> — AI-led interviews, human insight.</span>
          <span style={{ fontSize: 12, color: '#1e293b' }}>Interview conducted {candidate.interviewDate}</span>
        </div>
      </div>
    </div>
  )
}
