interface Props {
  level: 1 | 2 | 3 | 4 | 5;
}

const COLORS = ["", "bg-emerald-400", "bg-sky-400", "bg-amber-400", "bg-orange-400", "bg-rose-400"];

export default function DifficultyDots({ level }: Props) {
  return (
    <div className="flex items-center gap-[3px]">
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className={`w-[5px] h-[5px] rounded-full transition-all ${
            i <= level ? COLORS[level] : "bg-white/10"
          }`}
        />
      ))}
    </div>
  );
}
