import React from "react";
import type { Career } from "../../../data/models/Career";
import { careers } from "../../../data/careers";

import { CareerHeroSection } from "../right/sections/CareerHeroSection";
import { CareerLifestyleSection } from "../right/sections/CareerLifestyleSection";
import { CareerIdentitySection } from "../right/sections/CareerIdentitySection";
import { CareerPathwaySection } from "../right/sections/CareerPathwaySection";

interface CareerWorldProps {
  careerId: string;
}

export const CareerWorld: React.FC<CareerWorldProps> = ({ careerId }) => {
  const career = careers.find((c) => c.id === careerId) as unknown as Career | undefined;

  if (!career) {
    return <div>Career not found.</div>;
  }

  return (
    <div
      style={{
        position: "relative",
        padding: "72px 72px 120px",
        maxWidth: "960px",
        margin: "0 auto",
      }}
    >
      <CareerHeroSection career={career} />
      <CareerLifestyleSection career={career} />
      <CareerIdentitySection career={career} />
      <CareerPathwaySection career={career} />

      <div
        style={{
          marginTop: "20px",
          height: "300px",
          background: "#ddd",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#555",
        }}
      >
        World visualization coming soon
      </div>
    </div>
  );
};
