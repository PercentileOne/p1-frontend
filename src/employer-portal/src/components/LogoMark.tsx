interface ChairLogoProps {
  size?: number
  showText?: boolean
}

export function ChairLogo({ size = 96, showText = true }: ChairLogoProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: size, height: size,
        borderRadius: Math.round(size * 0.22),
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.5), 0 0 0 1px rgba(79,142,247,0.15)',
        flexShrink: 0,
        position: 'relative',
        background: '#060a12',
      }}>
        <img
          src="/images/mastermind-chair-tight.png"
          alt="InterviewMe"
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 30%',
            display: 'block',
          }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(79,142,247,0.08) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
      </div>
      {showText && (
        <div style={{
          fontSize: Math.round(size * 0.24),
          fontWeight: 800,
          letterSpacing: '-0.01em',
          color: '#fff',
          lineHeight: 1,
          fontFamily: "-apple-system,'Segoe UI',system-ui,sans-serif",
        }}>
          InterviewMe<span style={{ color: '#4F8EF7' }}>.global</span>
        </div>
      )}
    </div>
  )
}
