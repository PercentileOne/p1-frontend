import React from "react";
import type { Career } from "../../../data/models/Career";

type Props = {
  career: Career;
};

export const CareerPathwaySection = ({ career }: Props) => {
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
        Pathway to Success
      </h2>

      {/* Entry Requirements */}
      <div style={{ marginBottom: 32 }}>
        <h3
          style={{
            fontSize: 22,
            marginBottom: 12,
            fontWeight: 500,
          }}
        >
          Entry Requirements
        </h3>

        <ul style={{ paddingLeft: 20, opacity: 0.85, lineHeight: 1.6 }}>
          {career.pathway.entryRequirements.map((req, i) => (
            <li key={i}>{req}</li>
          ))}
        </ul>
      </div>

      {/* Skills to Learn */}
      <div style={{ marginBottom: 32 }}>
        <h3
          style={{
            fontSize: 22,
            marginBottom: 12,
            fontWeight: 500,
          }}
        >
          Skills to Learn
        </h3>

        <ul style={{ paddingLeft: 20, opacity: 0.85, lineHeight: 1.6 }}>
          {career.pathway.skills.map((skill, i) => (
            <li key={i}>{skill}</li>
          ))}
        </ul>
      </div>

      {/* Qualifications */}
      {career.pathway.qualifications?.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h3
            style={{
              fontSize: 22,
              marginBottom: 12,
              fontWeight: 500,
            }}
          >
            Recommended Qualifications
          </h3>

          <ul style={{ paddingLeft: 20, opacity: 0.85, lineHeight: 1.6 }}>
            {career.pathway.qualifications.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Time Estimates */}
      <div style={{ marginBottom: 32 }}>
        <h3
          style={{
            fontSize: 22,
            marginBottom: 12,
            fontWeight: 500,
          }}
        >
          How Long Will It Take?
        </h3>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 24,
          }}
        >
          <TimeCard label="Junior Level" value={career.pathway.timeToJunior} />
          <TimeCard label="Mid-Level" value={career.pathway.timeToMid} />
          <TimeCard label="Senior Level" value={career.pathway.timeToSenior} />
          <TimeCard label="Expert Level" value={career.pathway.timeToExpert} />
        </div>
      </div>

      {/* Learning Path */}
      <div>
        <h3
          style={{
            fontSize: 22,
            marginBottom: 12,
            fontWeight: 500,
          }}
        >
          Recommended Learning Path
        </h3>

        <ol style={{ paddingLeft: 20, opacity: 0.85, lineHeight: 1.6 }}>
          {career.pathway.learningPath.map((step, i) => (
            <li key={i} style={{ marginBottom: 8 }}>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

const TimeCard = ({ label, value }: { label: string; value: string }) => (
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
