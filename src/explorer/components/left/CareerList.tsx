import { careers } from "../../../data/careers";
import { subcategories } from "../../../data/Subcategories";
import { useExplorerMachine } from "../../state/useExplorerMachine";

type CareerListProps = {
  selectedCareerId: string | null;
  onSelectCareer: (id: string) => void;
};

export const CareerList = ({
  selectedCareerId,
  onSelectCareer,
}: CareerListProps) => {
  const selectedSubcategoryId = useExplorerMachine(
    (s) => s.selectedSubcategoryId,
  );

  const sub = subcategories.find((s) => s.id === selectedSubcategoryId);
  if (!sub) return null;

  const visibleCareers = careers.filter((c) => sub.careers.includes(c.id));

  return (
    <div className="career-list">
      {visibleCareers.map((career) => (
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
