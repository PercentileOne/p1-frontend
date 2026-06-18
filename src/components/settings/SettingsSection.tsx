import { motion } from "framer-motion";

interface SettingsSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  badge?: string;
}

const EASE = [0.4, 0, 0.2, 1] as const;

export default function SettingsSection({ title, subtitle, children, badge }: SettingsSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      whileHover={{ y: -2 }}
      className="rounded-2xl p-4"
      style={{
        background: "linear-gradient(150deg, #1c1f2e 0%, #141720 100%)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 8px 28px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06) inset, 0 -1px 0 rgba(0,0,0,0.3) inset",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05, ease: EASE }}
        className="flex items-center justify-between mb-3"
      >
        <div>
          <h2 className="text-[15px] font-bold text-white leading-tight">{title}</h2>
          {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {badge && (
          <span className="text-[8px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-white/[0.06] text-slate-500 shrink-0">
            {badge}
          </span>
        )}
      </motion.div>
      <div className="flex flex-col gap-3">{children}</div>
    </motion.div>
  );
}
