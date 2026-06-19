import { careers, type Career } from "../../data/careers";
import { subcategories, type Subcategory } from "../../data/Subcategories";
import { useExplorerMachine, type ExplorerMachineStore } from "../../state/useExplorerMachine";

type CareerListProps = {
  selectedCareerId: string | null;
  onSelectCareer: (id: string) => void;
};

export const CareerList = ({
  selectedCareerId,
  onSelectCareer,
}: CareerListProps) => {
  const selectedSubcategoryId = useExplorerMachine(
    (s: ExplorerMachineStore) => s.selectedSubcategoryId,
  );

  const sub = subcategories.find((s: Subcategory) => s.id === selectedSubcategoryId);
  if (!sub) return null;

  const visibleCareers = careers.filter((c: Career) => sub.careers.includes(c.id));

  return (
    <div className="career-list">
      {visibleCareers.map((career: Career) => (
        <button
          key={career.id}
          onClick={() => onSelectCareer(career.id)}
          className={career.id === selectedCareerId ? "active" : ""}
        >
          {career.identity?.title ?? career.id}
        </button>
      ))}
    </div>
  );
};
