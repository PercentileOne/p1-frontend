import { subcategories } from "../../../data/Subcategories";
import { useExplorerMachine } from "../../state/useExplorerMachine";

export const SubcategoryList = () => {
  const selectedCategoryId = useExplorerMachine((s) => s.selectedCategoryId);
  const selectedSubcategoryId = useExplorerMachine(
    (s) => s.selectedSubcategoryId,
  );
  const selectSubcategory = useExplorerMachine((s) => s.selectSubcategory);

  const filtered = subcategories.filter(
    (sub) => sub.categoryId === selectedCategoryId,
  );

  return (
    <div className="subcategory-list">
      {filtered.map((sub) => (
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
