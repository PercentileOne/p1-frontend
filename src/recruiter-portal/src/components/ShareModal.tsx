import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  role?: string;
  company?: string;
  score: number; // 0–100
  shareUrl: string;
  onClose: () => void;
}

const PLATFORMS = [
  {
    id: 'linkedin',
    label: 'LinkedIn',
    color: '#0A66C2',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    getUrl: (url: string, text: string) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`,
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    color: '#25D366',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
    getUrl: (url: string, text: string) =>
      `https://wa.me/?text=${encodeURIComponent(`${text}\n\n${url}`)}`,
  },
  {
    id: 'x',
    label: 'X (Twitter)',
    color: '#000000',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    getUrl: (url: string, text: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  {
    id: 'email',
    label: 'Email',
    color: '#6B7280',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
    ),
    getUrl: (url: string, text: string) =>
      `mailto:?subject=${encodeURIComponent('My Explain Interview Score')}&body=${encodeURIComponent(`${text}\n\n${url}`)}`,
  },
];

export function ShareModal({ role, company, score, shareUrl, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const roleLabel = role ?? 'this role';
  const companyLabel = company ? ` at ${company}` : '';
  const shareText = `I just scored ${score}% on my ${roleLabel}${companyLabel} interview with Explain — the AI interview platform. Watch my full session here:`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, backdropFilter: 'blur(4px)' }}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 101, padding: '24px 16px', pointerEvents: 'none',
        }}
      >
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '20px', overflow: 'hidden', width: '100%', maxWidth: '440px', pointerEvents: 'auto' }}>

          {/* Score card hero */}
          <div style={{
            background: 'linear-gradient(135deg, #1a1040 0%, #0f1729 100%)',
            padding: '28px 28px 24px',
            borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(167,139,250,0.7)', marginBottom: '8px' }}>
                  Explain · Interview Score
                </div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#fff', lineHeight: 1.25, marginBottom: company ? '4px' : 0 }}>
                  {role ?? 'Interview Session'}
                </div>
                {company && (
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>{company}</div>
                )}
              </div>
              <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
                ✕
              </button>
            </div>

            {/* Big score */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
              <div style={{ fontSize: '64px', fontWeight: 900, lineHeight: 1, color: score >= 70 ? '#34D399' : score >= 50 ? '#F59E0B' : '#EF4444', fontVariantNumeric: 'tabular-nums' }}>
                {score}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>%</div>
              <div style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: score >= 70 ? '#34D399' : score >= 50 ? '#F59E0B' : '#EF4444', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  {score >= 80 ? 'Excellent' : score >= 70 ? 'Strong' : score >= 50 ? 'Good' : 'Developing'}
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>AI-scored · Verified</div>
              </div>
            </div>
          </div>

          {/* Share message preview */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '8px' }}>Message preview</div>
            <div style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.6, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px' }}>
              {shareText}
            </div>
          </div>

          {/* Platform buttons */}
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '4px' }}>
              {PLATFORMS.map(p => (
                <a
                  key={p.id}
                  href={p.getUrl(shareUrl, shareText)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: `${p.color}18`,
                    border: `1px solid ${p.color}40`,
                    borderRadius: '10px', padding: '12px 14px',
                    color: p.id === 'x' ? '#fff' : p.color,
                    textDecoration: 'none', fontSize: '13px', fontWeight: 700,
                    transition: 'all 0.15s',
                  }}
                >
                  {p.icon}
                  {p.label}
                </a>
              ))}
            </div>

            {/* Copy link */}
            <button
              onClick={copyLink}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                background: copied ? 'rgba(52,211,153,0.12)' : 'var(--bg3)',
                border: `1px solid ${copied ? 'rgba(52,211,153,0.4)' : 'var(--border)'}`,
                borderRadius: '10px', padding: '12px',
                color: copied ? '#34D399' : 'var(--text-2)',
                fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {copied ? (
                <>✓ Link copied!</>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                  </svg>
                  Copy link
                </>
              )}
            </button>

            <div style={{ fontSize: '10px', color: 'var(--text-3)', textAlign: 'center', marginTop: '2px' }}>
              Recipients can view your scores and transcript · CV included if uploaded
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
