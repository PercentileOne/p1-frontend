import { motion } from 'framer-motion'

interface ExplainLogoProps {
  size?: number
  withAnimation?: boolean
  delay?: number
  cometDuration?: number  // seconds per orbit — lower = faster, 0 = no comet
}

export function ExplainLogo({ size = 100, withAnimation = true, delay = 0.3, cometDuration = 2.8 }: ExplainLogoProps) {
  const CX = 50, CY = 50, R = 42

  const bars = [
    { x: 33, y: 28, w: 34, h: 7, d: delay + 0.58 },
    { x: 33, y: 46, w: 22, h: 7, d: delay + 0.80 },
    { x: 33, y: 65, w: 34, h: 7, d: delay + 1.02 },
  ]

  const logoInit = withAnimation ? { opacity: 0, scale: 0.88 } : { opacity: 1, scale: 1 }
  const logoAnim = { opacity: 1, scale: 1 }
  const logoTrans = withAnimation
    ? { delay, duration: 0.9, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }
    : { duration: 0 }

  return (
    <motion.div initial={logoInit} animate={logoAnim} transition={logoTrans} style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="exl-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#4f46e5" />
            <stop offset="60%"  stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="exl-e" x1="50" y1="26" x2="50" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#a5b4fc" />
            <stop offset="50%"  stopColor="#6366f1" />
            <stop offset="100%" stopColor="#3730a3" stopOpacity="0.85" />
          </linearGradient>
          <filter id="exl-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <motion.circle cx={CX} cy={CY} r={R + 8}
          fill="none" stroke="#7c3aed" strokeWidth="1"
          animate={{ strokeOpacity: [0.03, 0.14, 0.03] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />

        <circle cx={CX} cy={CY} r={R + 1} fill="#060c18" />

        <motion.circle cx={CX} cy={CY} r={R + 1}
          fill="none" stroke="url(#exl-ring)" strokeWidth="2.5"
          initial={withAnimation ? { opacity: 0 } : { opacity: 1 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.05, duration: 0.7, ease: 'easeOut' }}
        />

        <motion.rect
          x={33} y={28} width={7} height={44}
          fill="url(#exl-e)" filter="url(#exl-glow)"
          initial={withAnimation ? { opacity: 0, scaleY: 0 } : { opacity: 1, scaleY: 1 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ delay: delay + 0.35, duration: 0.45, ease: 'easeOut' }}
          style={{ transformOrigin: '36px 28px' }}
        />

        {bars.map((b, i) => (
          <motion.rect
            key={i}
            x={b.x} y={b.y} width={b.w} height={b.h}
            fill="url(#exl-e)" filter="url(#exl-glow)"
            initial={withAnimation ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: b.d, duration: 0.36, ease: 'easeOut' }}
            style={{ transformOrigin: `${b.x}px ${b.y + b.h / 2}px` }}
          />
        ))}

        <motion.circle cx={CX} cy={CY} r={R + 1}
          fill="none" stroke="#7c3aed" strokeWidth="1.5"
          animate={{ r: [R + 1, R + 14], strokeOpacity: [0.35, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 6, ease: 'easeOut', delay: delay + 4.7 }}
        />
      </svg>

      {cometDuration > 0 && (
        <motion.svg
          width={size} height={size} viewBox="0 0 100 100"
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
          animate={{ rotate: 360 }}
          transition={{ duration: cometDuration, repeat: Infinity, ease: 'linear' }}
        >
          <circle cx={50} cy={50} r={43} fill="none"
            stroke="rgba(79,142,247,0.25)" strokeWidth="7"
            strokeLinecap="round" strokeDasharray="38 233"
          />
          <circle cx={50} cy={50} r={43} fill="none"
            stroke="rgba(99,179,255,0.92)" strokeWidth="2.5"
            strokeLinecap="round" strokeDasharray="20 251"
          />
        </motion.svg>
      )}
    </motion.div>
  )
}
