interface Props {
  score: number;      // 0–100
  size?: number;
  accent?: string;    // e.g. "stroke-indigo-500"
}

export default function MasteryRing({ score, size = 44, accent = "stroke-indigo-500" }: Props) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        className={`${accent} transition-all duration-700`}
      />
    </svg>
  );
}
