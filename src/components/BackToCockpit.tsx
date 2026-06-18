import { useNavigate } from "react-router-dom";
import { Home, ChevronLeft } from "lucide-react";

/* Consistent "← Cockpit" back button — appears in all module sticky headers */
export default function BackToCockpit() {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate("/cockpit")}
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.07] transition-all text-xs font-medium shrink-0"
    >
      <ChevronLeft size={12} />
      <Home size={11} />
    </button>
  );
}
