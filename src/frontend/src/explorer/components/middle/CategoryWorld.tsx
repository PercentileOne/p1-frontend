import React from "react";

interface CategoryWorldProps {
  categoryId: string;
}

export const CategoryWorld: React.FC<CategoryWorldProps> = ({ categoryId }) => {
  return (
    <div>
      <h2>Category world</h2>
      <p>Currently viewing category:</p>
      <pre
        style={{
          padding: "8px 12px",
          background: "#f1f3f5",
          borderRadius: "6px",
          fontSize: "13px",
        }}
      >
        {categoryId}
      </pre>
      <p style={{ marginTop: "16px", opacity: 0.7 }}>
        This is a placeholder for the cinematic category world. We’ll plug in
        real visuals and metadata next.
      </p>
    </div>
  );
};
