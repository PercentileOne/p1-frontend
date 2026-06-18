interface DangerButtonProps {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}

export default function DangerButton({ label, onClick, disabled }: DangerButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-rose-300 border border-rose-500/25 bg-rose-500/10 hover:bg-rose-500/20 hover:border-rose-500/40 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {label}
    </button>
  );
}
