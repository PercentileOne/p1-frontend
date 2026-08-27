import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { introductionsApi, type ApiError } from '../api/introductionsApi'

interface Props {
  candidateName: string
  candidateRole?: string
  overallScore?: number
  onClose: () => void
}

export function IntroduceEmployerModal({ candidateName, candidateRole, overallScore, onClose }: Props) {
  const { token } = useAuth()
  const [employerEmail, setEmployerEmail] = useState('')
  const [employerCompany, setEmployerCompany] = useState('')
  const [message, setMessage] = useState(`Hi, thought you'd want to see ${candidateName.split(' ')[0]}'s interview — I think they'd be a strong fit.`)
  const [proposedFeeGbp, setProposedFeeGbp] = useState('')
  const [saving, setSaving] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const mouseDownOnBackdropRef = useRef(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    if (!employerEmail.trim() || !employerEmail.includes('@')) { setError('A valid employer email is required.'); return }
    setSaving(true)
    setError('')
    try {
      await introductionsApi.send(token, {
        candidateName,
        candidateRole,
        overallScore,
        employerEmail: employerEmail.trim(),
        employerCompany: employerCompany.trim() || undefined,
        message: message.trim() || undefined,
        proposedFeeGbp: proposedFeeGbp.trim() ? Number(proposedFeeGbp) : undefined,
      })
      setSent(true)
    } catch (err) {
      setError((err as ApiError).error ?? 'Failed to send introduction.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onMouseDown={e => { mouseDownOnBackdropRef.current = e.target === e.currentTarget }}
        onClick={e => { if (e.target === e.currentTarget && mouseDownOnBackdropRef.current) onClose() }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }}
          style={{ width: '100%', maxWidth: 440, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}
        >
          {sent ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>Introduction sent</div>
              <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 20 }}>{employerEmail} can watch {candidateName}'s interview right away — no account needed on their end.</p>
              <button onClick={onClose} style={{ padding: '10px 24px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Done</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Introduce {candidateName} to an employer</h2>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>They'll get a free, no-login link to watch the interview and see the score.</p>
              </div>

              <Field label="Employer email">
                <input type="text" autoComplete="off" value={employerEmail} onChange={e => setEmployerEmail(e.target.value)} placeholder="hiring.manager@company.com" style={inputStyle} />
              </Field>
              <Field label="Company">
                <input type="text" autoComplete="off" value={employerCompany} onChange={e => setEmployerCompany(e.target.value)} placeholder="Optional" style={inputStyle} />
              </Field>
              <Field label="Message">
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit' }} />
              </Field>
              <Field label="Proposed introduction fee (£)">
                <input type="number" min={0} step="50" value={proposedFeeGbp} onChange={e => setProposedFeeGbp(e.target.value)} placeholder="Optional" style={inputStyle} />
              </Field>

              {error && <div style={{ fontSize: 12, color: '#EF4444' }}>{error}</div>}

              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button type="button" onClick={onClose} style={{ padding: '10px 16px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-2)' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: '10px 16px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', background: 'var(--blue)', color: '#fff', border: 'none', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Sending…' : 'Send introduction'}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      {children}
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
  padding: '9px 12px', color: 'var(--text)', fontSize: 13, outline: 'none', caretColor: 'var(--blue)', width: '100%', boxSizing: 'border-box',
}
