import { motion } from 'framer-motion';
import type { ScoreResponse } from '../api/explainApi';

interface Props {
  score: ScoreResponse;
  compact?: boolean;
}

const DIMS = [
  { key: 'relevance', label: 'Relevance' },
  { key: 'clarity', label: 'Clarity' },
  { key: 'depth', label: 'Depth' },
  { key: 'confidence', label: 'Confidence' },
] as const;

function scoreColor(v: number) {
  if (v >= 0.70) return '#34D399';
  if (v >= 0.45) return '#F59E0B';
  return '#EF4444';
}

export function ScoringDisplay({ score, compact }: Props) {
  const overall = score.overallScore;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? '10px' : '14px' }}>
      {/* Overall ring */}
      {!compact && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '6px' }}>
          <div style={{ position: 'relative', width: '72px', height: '72px', flexShrink: 0 }}>
            <svg width="72" height="72" viewBox="0 0 72 72">
              <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6"/>
              <motion.circle
                cx="36" cy="36" r="30" fill="none"
                stroke={scoreColor(overall)} strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 30}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 30 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 30 * (1 - overall) }}
                transition={{ duration: 1, ease: 'easeOut' }}
                transform="rotate(-90 36 36)"
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', fontWeight: 800, color: scoreColor(overall),
            }}>
              {Math.round(overall * 100)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>Overall Score</div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
              {overall >= 0.7 ? 'Strong answer' : overall >= 0.45 ? 'Good with room to improve' : 'Needs work — see feedback below'}
            </div>
          </div>
        </div>
      )}

      {/* Dimension bars */}
      {DIMS.map(({ key, label }) => {
        const val = (score as unknown as Record<string, number>)[key] ?? 0;
        const color = scoreColor(val);
        return (
          <div key={key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)' }}>{label}</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{Math.round(val * 100)}%</span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${val * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                style={{ height: '100%', background: color, borderRadius: '2px' }}
              />
            </div>
          </div>
        );
      })}

      {/* Feedback items */}
      {!compact && score.feedback.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
          {score.feedback.filter(f => f.severity !== 'low').map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <div style={{
                width: '5px', height: '5px', borderRadius: '50%', marginTop: '6px', flexShrink: 0,
                background: f.severity === 'high' ? '#EF4444' : '#F59E0B',
              }} />
              <div style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.55 }}>{f.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
