interface SettingsRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  last?: boolean;
}

export default function SettingsRow({ label, description, children, last }: SettingsRowProps) {
  return (
    <div className={`flex items-center justify-between gap-3 py-3 ${last ? "" : "border-b border-white/[0.1]"}`}>
      <div className="min-w-0">
        <p className="text-[12.5px] font-medium text-slate-200 leading-snug">{label}</p>
        {description && <p className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
