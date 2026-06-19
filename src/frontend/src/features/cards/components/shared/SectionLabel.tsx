interface Props {
  children: React.ReactNode;
  className?: string;
}

export default function SectionLabel({ children, className = "" }: Props) {
  return (
    <span className={`text-[11px] font-bold uppercase tracking-widest text-white/45 ${className}`}>
      {children}
    </span>
  );
}
