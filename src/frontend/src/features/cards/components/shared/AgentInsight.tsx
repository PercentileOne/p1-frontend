import { Sparkles } from "lucide-react";

interface Props {
  children: React.ReactNode;
  accent?: string;
}

export default function AgentInsight({ children, accent = "indigo" }: Props) {
  return (
    <div className={`flex gap-3 p-3 rounded-xl bg-${accent}-600/8 border border-${accent}-500/15`}>
      <Sparkles size={13} className={`text-${accent}-400 mt-[1px] shrink-0`} />
      <p className="text-[11px] text-white/60 leading-relaxed">{children}</p>
    </div>
  );
}
