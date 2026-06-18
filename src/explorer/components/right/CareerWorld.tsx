import React from "react";
import { CareerWorldData } from "../../data/models/CareerWorldData";

interface Props {
  careerId: string;
}

export const CareerWorld: React.FC<Props> = ({ careerId }) => {
  const career = CareerWorldData.find((c) => c.id === careerId);

  if (!career) {
    return <div style={{ color: "#fff" }}>Career not found.</div>;
  }

  return (
    <div
      style={{
        padding: "72px",
        maxWidth: "960px",
        margin: "0 auto",
        color: "#fff",
      }}
    >
      <h1 style={{ fontSize: "48px", marginBottom: "16px" }}>
        {careerId.replace(/_/g, " ")}
      </h1>

      <p style={{ opacity: 0.8, fontSize: "20px" }}>
        A deep dive into this career.
      </p>

      <div style={{ marginTop: "32px", opacity: 0.7 }}>
        <h3>Overview</h3>
        {career.overview.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <div style={{ marginTop: "32px", opacity: 0.7 }}>
        <h3>Lifestyle</h3>
        <ul>
          {career.lifestyle.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: "32px", opacity: 0.7 }}>
        <h3>Emotional Tone</h3>
        <p>{career.emotionalNotes.join(", ")}</p>
      </div>

      <div style={{ marginTop: "32px", opacity: 0.7 }}>
        <h3>Growth & Future</h3>
        <p>Demand: {career.growth.demand}</p>
        <p>Automation Risk: {career.growth.automationRisk}</p>
        <p>Future Score: {career.growth.futureScore}</p>
      </div>
    </div>
  );
};
