interface Props {
  pct: number;        // 0–100
  accent?: string;    // tailwind bg class
  height?: string;
}

export default function ProgressBar({ pct, accent = "bg-indigo-500", height = "h-[3px]" }: Props) {
  return (
    <div className={`w-full ${height} rounded-full bg-white/[0.06] overflow-hidden`}>
      <div
        className={`h-full rounded-full ${accent} transition-all duration-500`}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}
