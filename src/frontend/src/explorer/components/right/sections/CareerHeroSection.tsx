import type { Career } from "../../../data/models/Career";

type Props = {
  career: Career;
};

export const CareerHeroSection = ({ career }: Props) => {
  return (
    <section style={{ marginBottom: 48 }}>
      <div
        style={{
          position: "relative",
          height: 320,
          borderRadius: 28,
          overflow: "hidden",
          backgroundImage: `url(${career.heroImageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Cinematic gradient overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0.15))",
          }}
        />

        {/* Text content */}
        <div
          style={{
            position: "absolute",
            left: 32,
            bottom: 32,
            color: "#fff",
          }}
        >
          <h1
            style={{
              fontSize: 36,
              margin: 0,
              fontWeight: 700,
              letterSpacing: "-0.5px",
            }}
          >
            {career.name}
          </h1>

          <p
            style={{
              marginTop: 8,
              opacity: 0.85,
              fontSize: 16,
            }}
          >sala
            {career.categoryName} • {career.subcategoryName}
          </p>

          {/* Tags */}
          <div
            style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}
          >
            {career.tags?.slice(0, 4).map((tag, i) => (
              <div
                key={i}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.12)",
                  fontSize: 13,
                  backdropFilter: "blur(4px)",
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Salary + Difficulty quick stats */}
      <div
        style={{
          marginTop: 20,
          display: "flex",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            flex: "1 1 200px",
            padding: 16,
            borderRadius: 16,
            background: "rgba(255,255,255,0.05)",
          }}
        >
          <p style={{ margin: 0, opacity: 0.7 }}>Average Salary</p>
          <p style={{ margin: 0, fontSize: 22 }}>
            £{career.salary.average.toLocaleString()}
          </p>
        </div>

        <div
          style={{
            flex: "1 1 200px",
            padding: 16,
            borderRadius: 16,
            background: "rgba(255,255,255,0.05)",
          }}
        >
          <p style={{ margin: 0, opacity: 0.7 }}>Difficulty</p>
          <p style={{ margin: 0, fontSize: 22 }}>{career.difficulty}/10</p>
        </div>
      </div>
    </section>
  );
};
