type Props = {
  overview: string[];
};

export const SubcategoryOverviewSection = ({ overview }: Props) => {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ color: "#fff", marginBottom: 12 }}>What this world is about</h2>
      {overview.map((para, i) => (
        <p
          key={i}
          style={{
            color: "rgba(255,255,255,0.82)",
            lineHeight: 1.6,
            marginBottom: 12,
          }}
        >
          {para}
        </p>
      ))}
    </section>
  );
};
