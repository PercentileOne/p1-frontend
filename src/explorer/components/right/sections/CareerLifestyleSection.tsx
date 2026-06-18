import React from "react";
import type { Career } from "../../../data/models/Career";

type Props = {
  career: Career;
};

export const CareerLifestyleSection = ({ career }: Props) => {
  return (
    <section style={{ marginTop: 48, marginBottom: 48 }}>
      <h2
        style={{
          fontSize: 28,
          marginBottom: 16,
          fontWeight: 600,
          letterSpacing: "-0.3px",
        }}
      >
        Lifestyle & Daily Rhythm
      </h2>

      {/* Lifestyle description */}
      <p
        style={{
          fontSize: 17,
          lineHeight: 1.6,
          opacity: 0.85,
          marginBottom: 24,
        }}
      >
        {career.lifestyle.description}
      </p>

      {/* Quick lifestyle stats */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 24,
          marginBottom: 32,
        }}
      >
        <StatCard
          label="Work Environment"
          value={career.lifestyle.environment}
        />
        <StatCard label="Energy Level" value={career.lifestyle.energy} />
        <StatCard
          label="Collaboration"
          value={career.lifestyle.collaboration}
        />
        <StatCard label="Stress Level" value={career.lifestyle.stress} />
      </div>

      {/* Optional: A Day in the Life video */}
      {career.lifestyle.videoUrl && (
        <div style={{ marginTop: 32 }}>
          <h3
            style={{
              fontSize: 22,
              marginBottom: 12,
              fontWeight: 500,
            }}
          >
            A Day in the Life
          </h3>

          <div
            style={{
              position: "relative",
              paddingBottom: "56.25%", // 16:9 ratio
              height: 0,
              overflow: "hidden",
              borderRadius: 16,
            }}
          >
            <iframe
              src={career.lifestyle.videoUrl}
              title="A Day in the Life"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                border: "none",
                borderRadius: 16,
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </section>
  );
};

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <div
    style={{
      flex: "1 1 200px",
      padding: 16,
      borderRadius: 16,
      background: "rgba(255,255,255,0.05)",
    }}
  >
    <p style={{ margin: 0, opacity: 0.7 }}>{label}</p>
    <p style={{ margin: 0, fontSize: 20 }}>{value}</p>
  </div>
);
