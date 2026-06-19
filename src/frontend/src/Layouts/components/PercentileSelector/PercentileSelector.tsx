import React, { useState, useEffect } from "react";
import "./PercentileSelector.css";

interface PercentileSelectorProps {
  selectedPercentile: number | null;
  onSelect: (value: number) => void;
  insight: string;
  imageUrl: string;
}

export const PercentileSelector: React.FC<PercentileSelectorProps> = ({
  selectedPercentile,
  onSelect,
  insight,
  imageUrl,
}) => {
  const [displayedInsight, setDisplayedInsight] = useState(insight);
  const [fadeInsight, setFadeInsight] = useState(false);

  const [displayedImage, setDisplayedImage] = useState(imageUrl);
  const [fadeImage, setFadeImage] = useState(false);

  // Fade-in logic for insight
  useEffect(() => {
    setFadeInsight(true);
    const timeout = setTimeout(() => {
      setDisplayedInsight(insight);
      setFadeInsight(false);
    }, 250);
    return () => clearTimeout(timeout);
  }, [insight]);

  // Cross-fade logic for image
  useEffect(() => {
    setFadeImage(true);
    const timeout = setTimeout(() => {
      setDisplayedImage(imageUrl);
      setFadeImage(false);
    }, 320);
    return () => clearTimeout(timeout);
  }, [imageUrl]);

  const cards = [
    { value: 1, label: "Top 1%", desc: "Elite mastery, intense focus." },
    {
      value: 5,
      label: "Top 5%",
      desc: "High performance, disciplined growth.",
    },
    { value: 50, label: "Average", desc: "Balanced, steady improvement." },
  ];

  return (
    <div className="percentile-container">
      <div className="cards-row">
        {cards.map((card) => {
          const isSelected = selectedPercentile === card.value;

          return (
            <div
              key={card.value}
              className={`percentile-card ${isSelected ? "selected" : "dimmed"}`}
              onClick={() => onSelect(card.value)}
            >
              <div className="card-label">{card.label}</div>
              <div className="card-desc">{card.desc}</div>
            </div>
          );
        })}
      </div>

      <div className={`insight-box ${fadeInsight ? "fade" : ""}`}>
        {displayedInsight}
      </div>

      <div className="image-wrapper">
        <img
          src={displayedImage}
          className={`fade-image ${fadeImage ? "fade" : ""}`}
          alt="percentile-visual"
        />
      </div>
    </div>
  );
};
