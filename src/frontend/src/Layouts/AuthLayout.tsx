import React, { useState } from "react";
import { AgentPanel } from "./AgentPanel";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [insight, setInsight] = useState("Insights will appear here");
  const [imageUrl, setImageUrl] = useState(
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
  );
  const [lifestyle, setLifestyle] = useState(
    "As you define your path, we’ll show you what the lifestyle, habits, and daily rhythm of that world really look like.",
  );
  const [showLifestyle, setShowLifestyle] = useState(false);
  const [visible, setVisible] = useState(true);

  const updateInsight = (msg: string) => {
    setVisible(false);
    setTimeout(() => {
      setInsight(msg);
      setVisible(true);
    }, 120);
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* LEFT SIDE */}
      <div className="flex items-center justify-center p-10 bg-white">
        <div className="w-full max-w-md">
          <AgentPanel className="-mt-4 mb-6" />

          {children &&
            React.cloneElement(children as any, {
              setInsight: updateInsight,
              setImageUrl,
              setLifestyle,
              showLifestyle,
              setShowLifestyle,
            })}
        </div>
      </div>

      {/* RIGHT SIDE — IDENTITY PANEL */}
      <div className="hidden md:flex items-center justify-center bg-blue-600 text-white p-0 relative">
        {/* Full-bleed image */}
        <img
          src={imageUrl}
          alt="Identity visual"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Insight + Lifestyle Button */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <h2
            key={insight}
            className={`text-3xl font-bold max-w-xl transition-opacity duration-300 ${
              visible ? "opacity-100" : "opacity-0"
            }`}
          >
            {insight}
          </h2>

          <button
            onClick={() => setShowLifestyle((prev) => !prev)}
            className="mt-4 inline-flex items-center px-4 py-2 text-sm font-semibold bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur border border-white/40"
          >
            {showLifestyle ? "Hide lifestyle" : "View lifestyle"}
          </button>

          {/* Lifestyle Panel */}
          {showLifestyle && (
            <div className="mt-4 p-4 bg-white/20 backdrop-blur rounded-lg border border-white/30 text-sm">
              {lifestyle}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
