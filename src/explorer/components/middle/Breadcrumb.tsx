import React from "react";
import { useExplorerMachine } from "../../state/useExplorerMachine";

export const Breadcrumb: React.FC = () => {
  const category = useExplorerMachine((s) => s.selectedCategoryId);
  const subcategory = useExplorerMachine((s) => s.selectedSubcategoryId);
  const career = useExplorerMachine((s) => s.selectedCareerId);

  const selectCategory = useExplorerMachine((s) => s.selectCategory);
  const selectSubcategory = useExplorerMachine((s) => s.selectSubcategory);
  const selectCareer = useExplorerMachine((s) => s.selectCareer);

  if (!category && !subcategory && !career) {
    return null;
  }

  return (
    <div
      style={{
        marginBottom: "16px",
        fontSize: "14px",
        color: "#666",
      }}
    >
      {category && (
        <span
          style={{ cursor: "pointer" }}
          onClick={() => selectCategory(category)}
        >
          {category}
        </span>
      )}
      {subcategory && (
        <span
          style={{ cursor: "pointer" }}
          onClick={() => selectSubcategory(subcategory)}
        >
          {" "}
          → {subcategory}
        </span>
      )}
      {career && (
        <span
          style={{ cursor: "pointer" }}
          onClick={() => selectCareer(career)}
        >
          {" "}
          → {career.replace(/_/g, " ")}
        </span>
      )}
    </div>
  );
};
