import { useExplorerMachine } from "../../state/useExplorerMachine";
import { CategoryWorld } from "./CategoryWorld";
import { SubcategoryWorld } from "./SubcategoryWorld";
import { CareerWorld } from "./CareerWorld";

export const WorldContentLayer = () => {
  const state = useExplorerMachine((s) => s.state);
  const selectedCategoryId = useExplorerMachine((s) => s.selectedCategoryId);
  const selectedSubcategoryId = useExplorerMachine(
    (s) => s.selectedSubcategoryId,
  );
  const selectedCareerId = useExplorerMachine((s) => s.selectedCareerId);

  if (state === "enteringCategory" && selectedCategoryId) {
    return <CategoryWorld categoryId={selectedCategoryId} />;
  }

  if (state === "enteringSubcategory" && selectedSubcategoryId) {
    return <SubcategoryWorld subcategoryId={selectedSubcategoryId} />;
  }

  if (state === "enteringCareer" && selectedCareerId) {
    return <CareerWorld careerId={selectedCareerId} />;
  }

  return (
    <div style={{ opacity: 0.5, fontSize: "14px", padding: "20px" }}>
      Choose a category and subcategory
    </div>
  );
};
