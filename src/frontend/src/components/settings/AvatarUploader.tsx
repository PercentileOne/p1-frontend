import { useRef, useState } from "react";
import { Camera } from "lucide-react";

interface AvatarUploaderProps {
  src: string;
  initials: string;
  onChange?: (file: File) => void;
}

export default function AvatarUploader({ src, initials, onChange }: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    onChange?.(file);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      className="relative w-20 h-20 rounded-full shrink-0 cursor-pointer group overflow-hidden border border-white/[0.1]"
      style={{ boxShadow: "0 6px 18px rgba(0,0,0,0.5), 0 0 0 3px rgba(99,102,241,0.12)" }}
    >
      {preview || src ? (
        <img src={preview ?? src} alt="Profile" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-indigo-600/30 text-indigo-200 text-lg font-bold">
          {initials}
        </div>
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/55 transition-colors duration-200 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
        <Camera size={16} className="text-white" />
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
