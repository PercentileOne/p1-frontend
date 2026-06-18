import { motion } from "framer-motion";
import { CategoryWorld } from "../CategoryWorld";
import { CareerWorld } from "../../middle/CareerWorld";
import { SubcategoryWorld } from "../../middle/SubcategoryWorld";
import { useExplorerMachine } from "../../../state/useExplorerMachine";

export const WorldContentLayer = () => {
  const selectedCareerId = useExplorerMachine((s) => s.selectedCareerId);
  const selectedSubcategoryId = useExplorerMachine((s) => s.selectedSubcategoryId);
  const selectedCategoryId = useExplorerMachine((s) => s.selectedCategoryId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ position: "relative" }}
    >
      {selectedCareerId ? (
        <CareerWorld careerId={selectedCareerId} />
      ) : selectedSubcategoryId ? (
        <SubcategoryWorld subcategoryId={selectedSubcategoryId} />
      ) : selectedCategoryId ? (
        <CategoryWorld categoryId={selectedCategoryId} />
      ) : (
        <div
          style={{
            padding: "72px",
            maxWidth: "960px",
            margin: "0 auto",
            color: "#fff",
            opacity: 0.7,
          }}
        >
          <h2>Select a category to begin</h2>
        </div>
      )}
    </motion.div>
  );
};