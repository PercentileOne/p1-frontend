import { useState } from 'react';

type Status = 'idle' | 'sending' | 'sent' | 'error';

interface Props {
  onClose: () => void;
  defaultSubject?: string;
}

export default function ContactModal({ onClose, defaultSubject = '' }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('https://formspree.io/f/maqrzpvk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name, email, subject, message, source: 'explain.global' }),
      });
      if (res.ok) {
        setStatus('sent');
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'contact_form_sent', { event_category: 'engagement', event_label: 'explain.global' });
        }
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  const inp: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: '1px solid rgba(79,142,247,.2)', fontSize: 14,
    background: 'rgba(79,142,247,.06)', outline: 'none',
    color: '#F0F4FF', fontFamily: 'inherit', boxSizing: 'border-box',
    transition: 'border-color .2s',
  };
  const lbl: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: 'rgba(240,244,255,.4)',
    letterSpacing: '.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6,
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '14vh 20px 20px', overflowY: 'auto' }}
    >
      <style>{`
        @keyframes eg-modal-in{from{opacity:0;transform:scale(.94) translateY(14px)}to{opacity:1;transform:none}}
        @keyframes eg-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .eg-inp:focus{border-color:rgba(79,142,247,.55)!important;background:rgba(79,142,247,.10)!important}
      `}</style>

      <div style={{ background: '#070C1A', border: '1px solid rgba(79,142,247,.2)', borderRadius: 22, padding: '36px 32px', width: '100%', maxWidth: 500, boxShadow: '0 40px 100px rgba(0,0,0,.7), 0 0 80px rgba(79,142,247,.08)', animation: 'eg-modal-in .25s cubic-bezier(.34,1.56,.64,1) both' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 26 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderRadius: 100, background: 'rgba(79,142,247,.08)', border: '1px solid rgba(79,142,247,.25)', marginBottom: 14 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4F8EF7', display: 'inline-block', boxShadow: '0 0 6px #4F8EF7' }} />
              <span style={{ fontSize: 10, fontWeight: 800, color: '#4F8EF7', letterSpacing: '.15em', textTransform: 'uppercase' }}>Explain.global</span>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#F0F4FF', margin: '0 0 4px', letterSpacing: '-.02em' }}>Register Your Interest</h2>
            <p style={{ fontSize: 13, color: 'rgba(240,244,255,.45)', margin: 0 }}>Tell us a bit about yourself — Francis will be in touch personally.</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(240,244,255,.4)', fontSize: 15, flexShrink: 0 }}>✕</button>
        </div>

        {status === 'sent' ? (
          <div style={{ textAlign: 'center', padding: '28px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(52,211,153,.1)', border: '1px solid rgba(52,211,153,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: 28 }}>✓</div>
            <p style={{ fontSize: 17, fontWeight: 800, color: '#F0F4FF', marginBottom: 8 }}>You're on the list!</p>
            <p style={{ fontSize: 13, color: 'rgba(240,244,255,.5)', marginBottom: 24 }}>Thanks for reaching out. Francis will be in touch personally.</p>
            <button onClick={onClose} style={{ padding: '11px 32px', borderRadius: 50, background: '#4F8EF7', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: 14, boxShadow: '0 4px 20px rgba(79,142,247,.4)' }}>Close</button>
          </div>
        ) : status === 'error' ? (
          <div style={{ textAlign: 'center', padding: '28px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: 28 }}>!</div>
            <p style={{ fontSize: 17, fontWeight: 800, color: '#F0F4FF', marginBottom: 8 }}>Something went wrong</p>
            <p style={{ fontSize: 13, color: 'rgba(240,244,255,.5)', marginBottom: 24 }}>Please try again, email <strong style={{ color: '#4F8EF7' }}>francis@explain.global</strong> or call <strong style={{ color: '#4F8EF7' }}>+44 7346 814898</strong></p>
            <button onClick={() => setStatus('idle')} style={{ padding: '11px 32px', borderRadius: 50, background: '#4F8EF7', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: 14 }}>Try Again</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={lbl}>Your Name</label>
                <input className="eg-inp" style={inp} placeholder="Your name" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={lbl}>Email Address</label>
                <input className="eg-inp" style={inp} type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
            </div>
            <div>
              <label style={lbl}>I'm interested in…</label>
              <input className="eg-inp" style={inp} placeholder="e.g. Early access, partnering, hiring with Explain…" value={subject} onChange={e => setSubject(e.target.value)} required />
            </div>
            <div>
              <label style={lbl}>Message <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'rgba(240,244,255,.25)' }}>(optional)</span></label>
              <textarea className="eg-inp" style={{ ...inp, minHeight: 90, resize: 'vertical' }} placeholder="Tell us where you are and where you want to go…" value={message} onChange={e => setMessage(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button type="button" onClick={onClose} style={{ flex: 1, padding: 13, borderRadius: 50, border: '1px solid rgba(79,142,247,.2)', background: 'transparent', fontSize: 14, fontWeight: 700, color: 'rgba(240,244,255,.4)', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={status === 'sending'} style={{ flex: 2, padding: 13, borderRadius: 50, background: 'linear-gradient(135deg,#4F8EF7,#2D5BFF)', color: '#fff', fontSize: 14, fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(79,142,247,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {status === 'sending' ? (
                  <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'eg-spin .7s linear infinite' }} /> Sending…</>
                ) : '✦ Register My Interest'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
