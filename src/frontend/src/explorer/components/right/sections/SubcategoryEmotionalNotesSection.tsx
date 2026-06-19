type Props = {
  emotionalNotes: string[];
};

export const SubcategoryEmotionalNotesSection = ({ emotionalNotes }: Props) => {
  if (!emotionalNotes.length) return null;

  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ color: "#fff", marginBottom: 12 }}>
        What this path really feels like
      </h2>
      <ul style={{ paddingLeft: 20, margin: 0 }}>
        {emotionalNotes.map((note, i) => (
          <li
            key={i}
            style={{
              color: "rgba(255,255,255,0.82)",
              lineHeight: 1.6,
              marginBottom: 8,
            }}
          >
            {note}
          </li>
        ))}
      </ul>
    </section>
  );
};
