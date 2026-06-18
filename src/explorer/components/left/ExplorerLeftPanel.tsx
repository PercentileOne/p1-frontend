import { CategoryList } from "./CategoryList";
import { SubcategoryList } from "../middle/SubcategoryList";
import { CareerList } from "./CareerList";
import { useExplorerMachine } from "../../state/useExplorerMachine";

export const ExplorerLeftPanel = () => {
  const state = useExplorerMachine((s) => s.state);

  const selectedCareerId = useExplorerMachine((s) => s.selectedCareerId);
  const selectCareer = useExplorerMachine((s) => s.selectCareer);

  return (
    <div className="explorer-left-panel">
      <CategoryList />

      {(state === "enteringCategory" || state === "enteringSubcategory") && (
        <SubcategoryList />
      )}

      {(state === "enteringSubcategory" || state === "enteringCareer") && (
        <CareerList
          selectedCareerId={selectedCareerId}
          onSelectCareer={selectCareer}
        />
      )}
    </div>
  );
};
