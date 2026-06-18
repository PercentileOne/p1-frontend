import React from "react";
import { useExplorerMachine } from "../../state/useExplorerMachine";
import { careers } from "../../../data/careers";

export const SubcategoryCareerList: React.FC = () => {
  const selectedSubcategoryId = useExplorerMachine(
    (s) => s.selectedSubcategoryId,
  );
  const setSelectedCareerId = useExplorerMachine((s) => s.setSelectedCareerId);

  if (!selectedSubcategoryId) {
    return null;
  }

  // Filter careers that belong to this subcategory
  const filteredCareers = careers.filter(
    (c) => c.subcategoryId === selectedSubcategoryId,
  );

  if (filteredCareers.length === 0) {
    return (
      <div style={{ padding: "24px" }}>
        <p className="placeholder-message">
          No careers available yet for this field.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px" }}>
      <h3 style={{ marginBottom: "12px", color: "#444" }}>Careers</h3>

      <div className="career-list">
        {filteredCareers.map((career) => (
          <button
            key={career.id}
            onClick={() => setSelectedCareerId(career.id)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "8px 12px",
              marginBottom: "8px",
              background: "#f8f8f8",
              border: "1px solid #ddd",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            {career.name}
          </button>
        ))}
      </div>
    </div>
  );
};
