import React from "react";
import { useExplorerMachine, type ExplorerMachineStore } from "../../state/useExplorerMachine";
import { careers, type Career } from "../../data/careers";

export const SubcategoryCareerList: React.FC = () => {
  const selectedSubcategoryId = useExplorerMachine(
    (s: ExplorerMachineStore) => s.selectedSubcategoryId,
  );
  const setSelectedCareerId = useExplorerMachine((s: ExplorerMachineStore) => s.setSelectedCareerId);

  if (!selectedSubcategoryId) {
    return null;
  }

  // Filter careers that belong to this subcategory
  const filteredCareers = careers.filter(
    (c: Career) => (c as Career & { subcategoryId?: string }).subcategoryId === selectedSubcategoryId,
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
        {filteredCareers.map((career: Career) => (
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
