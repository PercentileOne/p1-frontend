import React, { useState } from "react";
import { PercentileSelector } from "../Layouts/components/PercentileSelector/PercentileSelector";

const getInsightFor = (value: number): string => {
  switch (value) {
    case 1:
      return "Top 1% performers operate with elite focus and long-term discipline. This level reflects rare consistency and a deep commitment to mastery.";
    case 5:
      return "Top 5% performers balance ambition with sustainable habits. You’re operating at a high level with room to push into elite territory.";
    case 50: //A single athlete in deep focus
      return "A balanced, steady path. You’re building a foundation that can grow in any direction you choose.";
    default: // A calm workspace
      return "";
  }
};

const getImageFor = (value: number): string => {
  switch (value) {
    case 1:
      return "/images/top1.jpeg";
    case 5:
      return "/images/top5.jpeg";
    case 50:
      return "/images/average.jpeg";
    default:
      return "/images/default.jpeg";
  }
};

export const OnboardingPercentileStep: React.FC = () => {
  const [percentile, setPercentile] = useState<number | null>(null);
  const [insight, setInsight] = useState("");
  const [imageUrl, setImageUrl] = useState("/images/default.jpeg");

  const handleSelect = (value: number) => {
    setPercentile(value);
    setInsight(getInsightFor(value));
    setImageUrl(getImageFor(value));
  };

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "32px 20px" }}>
      <h1 style={{ marginBottom: "24px", color: "#0a2a33" }}>
        Choose Your Performance Level
      </h1>

      <PercentileSelector
        selectedPercentile={percentile}
        onSelect={handleSelect}
        insight={insight}
        imageUrl={imageUrl}
      />
    </div>
  );
};
