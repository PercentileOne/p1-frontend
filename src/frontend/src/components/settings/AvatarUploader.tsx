import { useRef, useState } from "react";
import { Camera } from "lucide-react";

interface AvatarUploaderProps {
  src: string;
  initials: string;
  onChange?: (file: File) => void;
  /** "circle" (default) is the classic round avatar; "banner" is a wide cover-photo shape. */
  variant?: "circle" | "banner";
}

export default function AvatarUploader({ src, initials, onChange, variant = "circle" }: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    onChange?.(file);
  };

  const isBanner = variant === "banner";

  return (
    <div
      onClick={() => inputRef.current?.click()}
      className={`relative shrink-0 cursor-pointer group overflow-hidden border border-white/[0.1] ${
        isBanner ? "w-full aspect-[3/1] rounded-2xl" : "w-20 h-20 rounded-full"
      }`}
      style={{ boxShadow: isBanner ? "0 6px 18px rgba(0,0,0,0.4)" : "0 6px 18px rgba(0,0,0,0.5), 0 0 0 3px rgba(99,102,241,0.12)" }}
    >
      {preview || src ? (
        <img src={preview ?? src} alt={isBanner ? "Banner" : "Profile"} className="w-full h-full object-cover" />
      ) : isBanner ? (
        <div className="w-full h-full flex items-center justify-center bg-white/[0.03] text-slate-600 text-[11px] font-semibold">
          No banner yet — click to add one
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-indigo-600/30 text-indigo-200 text-lg font-bold">
          {initials}
        </div>
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/55 transition-colors duration-200 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
        <Camera size={isBanner ? 20 : 16} className="text-white" />
        <span className="text-[9px] font-bold text-white uppercase tracking-wide">Change</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
