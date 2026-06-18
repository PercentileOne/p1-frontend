import type { Subcategory } from "../../../data/models/Subcategory";

type Props = {
  subcategory: Subcategory;
};

export const SubcategoryHeroSection = ({ subcategory }: Props) => {
  return (
    <section style={{ marginBottom: 48 }}>
      <div
        style={{
          borderRadius: 24,
          overflow: "hidden",
          position: "relative",
          height: 260,
          backgroundImage: `url(${subcategory.heroImageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0.1))",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 32,
            bottom: 28,
            color: "#fff",
          }}
        >
          <h1 style={{ fontSize: 32, margin: 0 }}>{subcategory.name}</h1>
          <p style={{ marginTop: 8, opacity: 0.8 }}>
            A world within your chosen field.
          </p>
        </div>
      </div>
    </section>
  );
};
