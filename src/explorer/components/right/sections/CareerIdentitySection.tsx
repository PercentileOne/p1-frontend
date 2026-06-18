import React from "react";
import type { Career } from "../../../data/models/Career";

type Props = {
  career: Career;
};

export const CareerIdentitySection = ({ career }: Props) => {
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
        Who Thrives Here?
      </h2>

      {/* Identity summary */}
      <p
        style={{
          fontSize: 17,
          lineHeight: 1.6,
          opacity: 0.85,
          marginBottom: 24,
        }}
      >
        {career.identity.summary}
      </p>

      {/* Traits */}
      <div style={{ marginBottom: 32 }}>
        <h3
          style={{
            fontSize: 22,
            marginBottom: 12,
            fontWeight: 500,
          }}
        >
          Key Traits
        </h3>

        <ul style={{ paddingLeft: 20, opacity: 0.85, lineHeight: 1.6 }}>
          {career.identity.traits.map((trait, i) => (
            <li key={i}>{trait}</li>
          ))}
        </ul>
      </div>

      {/* Strengths */}
      <div style={{ marginBottom: 32 }}>
        <h3
          style={{
            fontSize: 22,
            marginBottom: 12,
            fontWeight: 500,
          }}
        >
          Strengths That Help
        </h3>

        <ul style={{ paddingLeft: 20, opacity: 0.85, lineHeight: 1.6 }}>
          {career.identity.strengths.map((strength, i) => (
            <li key={i}>{strength}</li>
          ))}
        </ul>
      </div>

      {/* Weaknesses */}
      <div>
        <h3
          style={{
            fontSize: 22,
            marginBottom: 12,
            fontWeight: 500,
          }}
        >
          Common Challenges
        </h3>

        <ul style={{ paddingLeft: 20, opacity: 0.85, lineHeight: 1.6 }}>
          {career.identity.weaknesses.map((weakness, i) => (
            <li key={i}>{weakness}</li>
          ))}
        </ul>
      </div>
    </section>
  );
};
