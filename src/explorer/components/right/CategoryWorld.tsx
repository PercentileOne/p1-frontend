import React from "react";
import { Categories } from "../../data/models/Category";

interface Props {
  categoryId: string;
}

export const CategoryWorld: React.FC<Props> = ({ categoryId }) => {
  const category = Categories.find((c) => c.id === categoryId);

  if (!category) {
    return <div>Category not found.</div>;
  }

  return (
    <div
      style={{
        padding: "72px",
        maxWidth: "960px",
        margin: "0 auto",
        color: "#fff",
      }}
    >
      <h1 style={{ fontSize: "48px", marginBottom: "16px" }}>
        {category.name}
      </h1>

      <p style={{ opacity: 0.8, fontSize: "20px" }}>
        A world within your chosen field.
      </p>

      <div style={{ marginTop: "32px", opacity: 0.7 }}>
        <h3>What this world is about</h3>
        {category.overview.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <div style={{ marginTop: "32px", opacity: 0.7 }}>
        <h3>Emotional tone</h3>
        <p>{category.emotionalNotes.join(", ")}</p>
      </div>
    </div>
  );
};
