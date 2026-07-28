import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  label?: string;
}

export function YouCamera({ label = 'You' }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camState, setCamState] = useState<'requesting' | 'active' | 'denied'>('requesting');
  const [cameraOn, setCameraOn] = useState(true);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: 320, height: 240 }, audio: false })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCamState('active');
      })
      .catch(() => setCamState('denied'));

    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const toggleCamera = () => {
    const stream = streamRef.current;
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;
    const next = !cameraOn;
    videoTrack.enabled = next;
    setCameraOn(next);
  };

  const showVideo = camState === 'active' && cameraOn;

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
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)',
          opacity: showVideo ? 1 : 0,
          transition: 'opacity 0.3s',
        }}
      />

      {/* Camera off — silhouette */}
      <AnimatePresence>
        {!showVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(160deg, #111118 0%, #0a0a12 100%)',
            }}
          >
            {/* Silhouette SVG */}
            <svg width="52" height="64" viewBox="0 0 52 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="26" cy="18" rx="14" ry="16" fill="rgba(255,255,255,0.10)" />
              <path d="M2 62c0-13.255 10.745-24 24-24s24 10.745 24 24" stroke="rgba(255,255,255,0.10)" strokeWidth="4" strokeLinecap="round" fill="none"/>
            </svg>
            <div style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.25)', marginTop: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {camState === 'denied' ? 'No camera' : 'Camera off'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom vignette + name */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 50%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '10px 12px',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>{label}</div>
          {camState === 'active' && (
            <div style={{
              fontSize: '9px', fontWeight: 600, marginTop: '1px', letterSpacing: '0.05em', textTransform: 'uppercase',
              color: cameraOn ? 'rgba(52,211,153,0.9)' : 'rgba(255,255,255,0.3)',
            }}>
              {cameraOn ? 'Live' : 'Off'}
            </div>
          )}
        </div>

        {/* Camera on/off toggle — only shown if camera was granted */}
        {camState === 'active' && (
          <button
            onClick={toggleCamera}
            title={cameraOn ? 'Turn camera off' : 'Turn camera on'}
            style={{
              background: cameraOn ? 'rgba(255,255,255,0.1)' : 'rgba(239,68,68,0.25)',
              border: `1px solid ${cameraOn ? 'rgba(255,255,255,0.15)' : 'rgba(239,68,68,0.4)'}`,
              borderRadius: '6px',
              padding: '4px 6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            {cameraOn ? (
              // Camera on icon
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 10l4.553-2.069A1 1 0 0121 8.876v6.248a1 1 0 01-1.447.894L15 14M4 8h11a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/>
              </svg>
            ) : (
              // Camera off icon (with slash)
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(239,68,68,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 10l4.553-2.069A1 1 0 0121 8.876v6.248a1 1 0 01-1.447.894L15 14M4 8h11a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/>
                <line x1="3" y1="3" x2="21" y2="21"/>
              </svg>
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}
