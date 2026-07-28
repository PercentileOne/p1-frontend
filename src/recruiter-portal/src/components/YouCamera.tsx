import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface Props {
  /** Label shown below the tile — defaults to "You" */
  label?: string;
}

export function YouCamera({ label = 'You' }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<'requesting' | 'active' | 'denied'>('requesting');

  useEffect(() => {
    let stream: MediaStream | null = null;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: 320, height: 240 }, audio: false })
      .then(s => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
        setState('active');
      })
      .catch(() => setState('denied'));

    return () => {
      stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      style={{
        width: '160px',
        flexShrink: 0,
        background: '#0a0a12',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden',
        position: 'relative',
        minHeight: '120px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Live webcam feed */}
      {state === 'active' && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)', // mirror like every video call
          }}
        />
      )}

      {/* Fallback — camera denied or requesting */}
      {state !== 'active' && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
          color: 'rgba(255,255,255,0.25)', fontSize: '11px', textAlign: 'center', padding: '12px',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M15 10l4.553-2.069A1 1 0 0121 8.876v6.248a1 1 0 01-1.447.894L15 14M4 8h11a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {state === 'requesting' ? 'Requesting camera…' : 'Camera unavailable'}
        </div>
      )}

      {/* Bottom vignette + name */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '10px 12px',
      }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>{label}</div>
        {state === 'active' && (
          <div style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(52,211,153,0.9)', letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: '1px' }}>
            Live
          </div>
        )}
      </div>
    </motion.div>
  );
}
