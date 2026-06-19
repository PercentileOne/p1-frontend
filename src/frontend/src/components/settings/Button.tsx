interface ButtonProps {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "primary";
}

export default function Button({ label, onClick, disabled, variant = "default" }: ButtonProps) {
  const isPrimary = variant === "primary";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${
        isPrimary
          ? "text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:brightness-110 shadow-[0_4px_14px_rgba(79,70,229,0.35)]"
          : "text-slate-300 border border-white/[0.1] hover:bg-white/[0.06] hover:border-white/[0.18]"
      }`}
    >
      {label}
    </button>
  );
}
