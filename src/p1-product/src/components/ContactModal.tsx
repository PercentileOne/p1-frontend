import { useState } from 'react'

type Status = 'idle' | 'sending' | 'sent' | 'error'

export default function ContactModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('https://formspree.io/f/mykqrrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      })
      if (res.ok) {
        setStatus('sent')
        if (typeof window !== 'undefined' && (window as any).gtag) {
          ;(window as any).gtag('event', 'contact_form_sent', { event_category: 'engagement' })
        }
      } else { setStatus('error') }
    } catch { setStatus('error') }
  }

  const input: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 10,
    border: '1px solid rgba(255,255,255,.1)', fontSize: 14,
    background: 'rgba(255,255,255,.06)', outline: 'none',
    color: '#F1F5F9', fontFamily: 'inherit', boxSizing: 'border-box',
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div style={{ background: '#0F172A', border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, padding: '36px 32px', width: '100%', maxWidth: 480, boxShadow: '0 40px 100px rgba(0,0,0,.6)', animation: 'modal-in .25s cubic-bezier(.34,1.56,.64,1) both' }}>
        <style>{`@keyframes modal-in{from{opacity:0;transform:scale(.94) translateY(12px)}to{opacity:1;transform:none}} @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 12 }}>P</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#F1F5F9', margin: 0, letterSpacing: -.5 }}>Start Your Journey</h2>
            <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>Tell us about yourself — we'll be in touch.</p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, padding: '3px 10px', borderRadius: 20, background: 'rgba(99,102,241,.15)', border: '1px solid rgba(99,102,241,.3)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: '#A5B4FC', letterSpacing: '.06em' }}>NOW IN BETA</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.08)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: 16, flexShrink: 0 }}>✕</button>
        </div>

        {status === 'sent' ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ width: 60, height: 60, borderRadius: 18, background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 26 }}>✓</div>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#F1F5F9', marginBottom: 6 }}>You're on the list!</p>
            <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>Thanks for reaching out. Francis will be in touch personally.</p>
            <button onClick={onClose} style={{ padding: '10px 28px', borderRadius: 50, background: 'var(--accent)', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: 14 }}>Close</button>
          </div>
        ) : status === 'error' ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ width: 60, height: 60, borderRadius: 18, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 26 }}>!</div>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#F1F5F9', marginBottom: 6 }}>Something went wrong</p>
            <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>Please try again or email us at francis@percentile.one</p>
            <button onClick={() => setStatus('idle')} style={{ padding: '10px 28px', borderRadius: 50, background: 'var(--accent)', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: 14 }}>Try Again</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '.06em', display: 'block', marginBottom: 5 }}>YOUR NAME</label>
                <input style={input} placeholder="Francis Cobbinah" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '.06em', display: 'block', marginBottom: 5 }}>EMAIL ADDRESS</label>
                <input style={input} type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '.06em', display: 'block', marginBottom: 5 }}>WHAT BRINGS YOU HERE?</label>
              <input style={input} placeholder="e.g. I want to organise my life, track my goals..." value={subject} onChange={e => setSubject(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '.06em', display: 'block', marginBottom: 5 }}>YOUR MESSAGE</label>
              <textarea style={{ ...input, minHeight: 100, resize: 'vertical' }} placeholder="Tell us where you are right now and where you want to be..." value={message} onChange={e => setMessage(e.target.value)} required />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button type="button" onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 50, border: '1px solid rgba(255,255,255,.1)', background: 'transparent', fontSize: 14, fontWeight: 700, color: '#64748B', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={status === 'sending'} style={{ flex: 2, padding: 12, borderRadius: 50, background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                {status === 'sending' ? '⏳ Sending...' : '🚀 Start My Journey'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
