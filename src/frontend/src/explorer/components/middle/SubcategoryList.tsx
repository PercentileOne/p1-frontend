import { subcategories, type Subcategory } from "../../../data/Subcategories";
import { useExplorerMachine, type ExplorerMachineStore } from "../../state/useExplorerMachine";

export const SubcategoryList = () => {
  const selectedCategoryId = useExplorerMachine((s: ExplorerMachineStore) => s.selectedCategoryId);
  const selectedSubcategoryId = useExplorerMachine(
    (s: ExplorerMachineStore) => s.selectedSubcategoryId,
  );
  const selectSubcategory = useExplorerMachine((s: ExplorerMachineStore) => s.selectSubcategory);

  const filtered = subcategories.filter(
    (sub: Subcategory) => sub.categoryId === selectedCategoryId,
  );

  return (
    <div className="subcategory-list">
      {filtered.map((sub: Subcategory) => (
        <button
          key={sub.id}
          onClick={() => selectSubcategory(sub.id)}
          className={sub.id === selectedSubcategoryId ? "active" : ""}
        >
          {sub.name}
        </button>
      ))}
    </div>
  );
};
