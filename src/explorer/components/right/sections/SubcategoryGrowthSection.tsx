type GrowthPoint = { year: number; value: number };

type IndustryStats = {
  totalJobsLastYear: number;
  totalJobsThisYear: number;
  projectedJobsNextYear: number;
  growthRate10yr: number;
};

type Props = {
  growthGraph: GrowthPoint[];
  industryStats: IndustryStats;
};

export const SubcategoryGrowthSection = ({
  growthGraph,
  industryStats,
}: Props) => {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ color: "#fff", marginBottom: 12 }}>Growth & demand</h2>

      <div
        style={{
          display: "flex",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            flex: "1 1 260px",
            padding: 16,
            borderRadius: 16,
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <p style={{ color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>
            10‑year growth
          </p>
          <p style={{ color: "#fff", fontSize: 24, margin: 0 }}>
            {industryStats.growthRate10yr}%
          </p>
        </div>

        <div
          style={{
            flex: "1 1 260px",
            padding: 16,
            borderRadius: 16,
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <p style={{ color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>
            Jobs this year
          </p>
          <p style={{ color: "#fff", fontSize: 24, margin: 0 }}>
            {industryStats.totalJobsThisYear.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Placeholder for sparkline */}
      <div
        style={{
          marginTop: 20,
          padding: 16,
          borderRadius: 16,
          background: "rgba(255,255,255,0.02)",
          color: "rgba(255,255,255,0.7)",
          fontSize: 13,
        }}
      >
        Growth trend visual goes here (sparkline / chart).
      </div>
    </section>
  );
};
