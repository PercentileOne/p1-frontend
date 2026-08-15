import { motion } from 'framer-motion';

interface ChairSpinnerProps {
  label?: string;
  size?: number;
}

export function ChairSpinner({ label, size = 120 }: ChairSpinnerProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '24px 16px' }}>
      <div style={{ perspective: '600px' }}>
        <motion.img
          src="/images/mastermind-chair-tight.png"
          alt=""
          animate={{ rotateY: [-14, 14, -14] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: size,
            height: 'auto',
            display: 'block',
            filter: 'drop-shadow(0 12px 32px rgba(0,0,0,0.7))',
            transformStyle: 'preserve-3d',
          }}
        />
      </div>
      <motion.div
        animate={{ scaleX: [0.7, 1, 0.7], opacity: [0.25, 0.15, 0.25] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: size * 0.6,
          height: 6,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.5)',
          filter: 'blur(4px)',
          marginTop: -8,
        }}
      />
      {label && (
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ fontSize: '13px', color: 'var(--text-3)', letterSpacing: '0.02em' }}
        >
          {label}
        </motion.div>
      )}
    </div>
  );
}
