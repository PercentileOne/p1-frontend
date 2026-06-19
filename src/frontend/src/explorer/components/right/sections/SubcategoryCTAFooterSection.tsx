import type { Subcategory } from "../../../data/models/Subcategory";

type Props = {
  subcategory: Subcategory;
};

export const SubcategoryCTAFooterSection = ({ subcategory }: Props) => {
  return (
    <section style={{ marginTop: 32 }}>
      <div
        style={{
          padding: 20,
          borderRadius: 18,
          background:
            "linear-gradient(135deg, rgba(72,199,236,0.18), rgba(255,183,76,0.18))",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div>
          <p
            style={{
              color: "#fff",
              margin: 0,
              marginBottom: 4,
              fontSize: 16,
            }}
          >
            Ready to explore roles in {subcategory.name}?
          </p>
          <p
            style={{
              color: "rgba(255,255,255,0.8)",
              margin: 0,
              fontSize: 14,
            }}
          >
            Choose a role on the left to see a full cinematic breakdown.
          </p>
        </div>
      </div>
    </section>
  );
};
