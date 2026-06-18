interface ComingSoonCardProps {
  icon: React.ReactNode;
  label: string;
}

export default function ComingSoonCard({ icon, label }: ComingSoonCardProps) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] opacity-50 cursor-not-allowed select-none">
      <span className="text-slate-500 shrink-0">{icon}</span>
      <span className="flex-1 text-[11.5px] font-medium text-slate-400 truncate">{label}</span>
      <span className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-white/[0.06] text-slate-600 shrink-0">
        Soon
      </span>
    </div>
  );
}
