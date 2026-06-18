import { categories } from "../../../data/categories";
import { useExplorerMachine } from "../../state/useExplorerMachine";

export const CategoryList = () => {
  const selectedCategoryId = useExplorerMachine((s) => s.selectedCategoryId);
  const selectCategory = useExplorerMachine((s) => s.selectCategory);

  return (
    <div className="category-list">
      {categories.map((cat) => (
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
