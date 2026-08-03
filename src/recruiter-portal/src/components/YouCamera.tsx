import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  label?: string;
  cameraOn: boolean;
  speaking?: boolean;
  onToggle: () => void;
}

export function YouCamera({ label = 'You', cameraOn, speaking = false, onToggle }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camState, setCamState] = useState<'requesting' | 'active' | 'denied'>('requesting');

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: 320, height: 240 }, audio: false })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCamState('active');
      })
      .catch(() => setCamState('denied'));

    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  // Enable/disable video track when cameraOn changes
  useEffect(() => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) track.enabled = cameraOn;
  }, [cameraOn]);

  const showVideo = camState === 'active' && cameraOn;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      style={{
        width: '160px', flexShrink: 0,
        background: '#0a0a12',
        borderRadius: '16px',
        border: `1px solid ${speaking ? 'rgba(52,211,153,0.55)' : 'rgba(255,255,255,0.06)'}`,
        boxShadow: speaking ? '0 0 0 2px rgba(52,211,153,0.20)' : 'none',
        overflow: 'hidden',
        position: 'relative',
        minHeight: '120px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'border-color 0.1s, box-shadow 0.1s',
      }}
    >
      {/* Live webcam feed */}
      <video
        ref={videoRef}
        autoPlay playsInline muted
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)',
          opacity: showVideo ? 1 : 0,
          transition: 'opacity 0.3s',
        }}
      />

      {/* Camera off — empty chair */}
      <AnimatePresence>
        {!showVideo && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ position: 'absolute', inset: 0 }}
          >
            <img
              src="/images/mastermind-chair.png"
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center bottom', opacity: 0.7 }}
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(160deg, rgba(5,8,20,0.5) 0%, rgba(5,8,20,0.2) 100%)',
            }} />
            {camState === 'denied' && (
              <div style={{ position: 'absolute', bottom: 32, left: 0, right: 0, textAlign: 'center', fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                No camera
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom vignette */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 50%)', pointerEvents: 'none' }} />

      {/* Name + status */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 12px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>{label}</div>
        {camState === 'active' && (
          <div style={{ fontSize: '9px', fontWeight: 600, marginTop: '1px', letterSpacing: '0.05em', textTransform: 'uppercase', color: speaking ? '#34D399' : cameraOn ? 'rgba(52,211,153,0.6)' : 'rgba(255,255,255,0.3)' }}>
            {speaking ? '● Speaking' : cameraOn ? 'Live' : 'Off'}
          </div>
        )}
      </div>

      {/* Camera toggle button */}
      {camState === 'active' && (
        <button
          onClick={onToggle}
          title={cameraOn ? 'Turn camera off' : 'Turn camera on'}
          style={{
            position: 'absolute', top: '8px', right: '8px',
            background: cameraOn ? 'rgba(0,0,0,0.6)' : 'rgba(239,68,68,0.9)',
            border: `2px solid ${cameraOn ? 'rgba(255,255,255,0.25)' : '#ef4444'}`,
            borderRadius: '10px', padding: '7px 10px',
            cursor: 'pointer', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', gap: '5px',
            transition: 'all 0.2s',
            boxShadow: cameraOn ? 'none' : '0 0 12px rgba(239,68,68,0.5)',
          }}
        >
          {cameraOn ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 10l4.553-2.069A1 1 0 0121 8.876v6.248a1 1 0 01-1.447.894L15 14M4 8h11a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 10l4.553-2.069A1 1 0 0121 8.876v6.248a1 1 0 01-1.447.894L15 14M4 8h11a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/>
              <line x1="3" y1="3" x2="21" y2="21"/>
            </svg>
          )}
          <span style={{ fontSize: '9px', fontWeight: 700, color: '#fff', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {cameraOn ? 'Cam' : 'Off'}
          </span>
        </button>
      )}
    </motion.div>
  );
}
