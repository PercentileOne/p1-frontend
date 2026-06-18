import { useState } from "react";

interface TextInputProps {
  value: string;
  onChange?: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
}

export default function TextInput({ value, onChange, placeholder, disabled, multiline, rows = 3 }: TextInputProps) {
  const [focused, setFocused] = useState(false);

  const baseStyle: React.CSSProperties = {
    background: disabled ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.03)",
    border: `1px solid ${focused ? "#6366f1" : "rgba(255,255,255,0.08)"}`,
    boxShadow: focused ? "0 0 0 3px rgba(99,102,241,0.18)" : "none",
    transition: "box-shadow 200ms ease, border-color 200ms ease",
  };

  const className =
    "w-full rounded-xl px-3 py-2 text-[13px] text-slate-200 placeholder:text-slate-600 outline-none disabled:cursor-not-allowed disabled:text-slate-500";

  if (multiline) {
    return (
      <textarea
        value={value}
        onChange={e => onChange?.(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className={`${className} resize-none`}
        style={baseStyle}
      />
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange?.(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      style={baseStyle}
    />
  );
}
