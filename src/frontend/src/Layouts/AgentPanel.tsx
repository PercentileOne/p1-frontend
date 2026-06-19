import React from "react";

export const AgentPanel: React.FC<{ className?: string }> = ({ className }) => {
  const hour = new Date().getHours();

  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div
      className={`w-full rounded-xl bg-black/5 backdrop-blur-sm border border-black/10 p-6 shadow-sm ${className}`}
    >
      <h2 className="text-xl font-semibold text-gray-900">
        {greeting}, Francis.
      </h2>

      <p className="text-gray-600 mt-2">
        Ready to build something extraordinary today.
      </p>
    </div>
  );
};
