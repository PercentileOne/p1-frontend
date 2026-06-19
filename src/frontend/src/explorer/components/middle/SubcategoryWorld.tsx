import React from "react";
import type { Career } from "../../../data/models/Career";

// ✅ Import the CINEMATIC WORLD subcategories (rich model)
import { Subcategories as worldSubcategories } from "../../../explorer/data/models/Subcategory";

// ✅ Import careers (these are the full career objects)
import { careers, type Career as DataCareer } from "../../data/careers";

import { SubcategoryHeroSection } from "../right/sections/SubcategoryHeroSection";
import { SubcategoryOverviewSection } from "../right/sections/SubcategoryOverviewSection";
import { SubcategoryGrowthSection } from "../right/sections/SubcategoryGrowthSection";
import { SubcategoryTopRolesSection } from "../right/sections/SubcategoryTopRolesSection";
import { SubcategoryEmotionalNotesSection } from "../right/sections/SubcategoryEmotionalNotesSection";
import { SubcategoryCTAFooterSection } from "../right/sections/SubcategoryCTAFooterSection";

interface Props {
  subcategoryId: string;
}

export const SubcategoryWorld: React.FC<Props> = ({ subcategoryId }) => {
  // ⭐ Look up the CINEMATIC subcategory, not the metadata one
  const subcategory = worldSubcategories.find((s) => s.id === subcategoryId);

  if (!subcategory) {
    return <div>Subcategory not found.</div>;
  }

  // ⭐ Resolve top roles using the cinematic model's topRoles array
  const topRoles = careers.filter((c: DataCareer) => subcategory.topRoles.includes(c.id)) as unknown as Career[];

  return (
    <div
      style={{
        position: "relative",
        padding: "72px 72px 120px",
        maxWidth: "960px",
        margin: "0 auto",
      }}
    >
      <SubcategoryHeroSection subcategory={subcategory} />

      <SubcategoryOverviewSection overview={subcategory.overview} />

      <SubcategoryGrowthSection
        growthGraph={subcategory.growthGraph}
        industryStats={subcategory.industryStats}
      />

      <SubcategoryTopRolesSection roles={topRoles} />

      <SubcategoryEmotionalNotesSection
        emotionalNotes={subcategory.emotionalNotes}
      />

      <SubcategoryCTAFooterSection subcategory={subcategory} />
    </div>
  );
};
