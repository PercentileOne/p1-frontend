import { MessageSquare } from "lucide-react";

export default function ChatPage() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0f1117] text-slate-200 gap-4">
      <MessageSquare size={48} className="text-indigo-400 opacity-60" />
      <h1 className="text-2xl font-semibold text-white">Chat</h1>
      <p className="text-slate-500 text-sm">AI-powered conversation interface — coming soon.</p>
    </div>
  );
}
