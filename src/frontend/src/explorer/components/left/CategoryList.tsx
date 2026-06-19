import { categories, type Category } from "../../data/categories";
import { useExplorerMachine, type ExplorerMachineStore } from "../../state/useExplorerMachine";

export const CategoryList = () => {
  const selectedCategoryId = useExplorerMachine((s: ExplorerMachineStore) => s.selectedCategoryId);
  const selectCategory = useExplorerMachine((s: ExplorerMachineStore) => s.selectCategory);

  return (
    <div className="category-list">
      {categories.map((cat: Category) => (
        <button
          key={cat.id}
          onClick={() => selectCategory(cat.id)}
          className={cat.id === selectedCategoryId ? "active" : ""}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
};
