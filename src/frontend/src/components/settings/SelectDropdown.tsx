interface SelectDropdownProps {
  value: string;
  options: string[];
  onChange: (next: string) => void;
  disabled?: boolean;
}

export default function SelectDropdown({ value, options, onChange, disabled }: SelectDropdownProps) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={e => onChange(e.target.value)}
      className="rounded-xl px-3 py-1.5 text-[12px] font-medium text-slate-200 border border-white/[0.08] outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 focus:border-indigo-500 transition-colors"
      style={{ colorScheme: "dark", backgroundColor: "#1c1f2e" }}
    >
      {options.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
}
