import { motion } from "framer-motion";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}

export default function ToggleSwitch({ checked, onChange, disabled }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`w-9 h-5 rounded-full relative shrink-0 transition-colors duration-300 ${
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
      } ${checked ? "bg-indigo-600" : "bg-white/10"}`}
      style={{
        boxShadow: checked
          ? "0 0 10px rgba(99,102,241,0.35), 0 1px 0 rgba(255,255,255,0.08) inset"
          : "0 1px 0 rgba(255,255,255,0.04) inset",
      }}
    >
      <motion.div
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
        animate={{ left: checked ? "18px" : "2px" }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      />
    </button>
  );
}
