import type { Career } from "../../../data/models/Career";
import { useExplorerMachine } from "../../../state/useExplorerMachine";

type Props = {
  career: Career;
};

export const CareerCTASection = ({ career }: Props) => {
  const transitionTo = useExplorerMachine((s) => s.transitionTo);

  const handleClick = () => {
    transitionTo("exitingCareer");

    setTimeout(() => {
      // This is where the next step will go:
      // e.g., open the learning plan, start onboarding, etc.
      console.log("CTA completed for:", career.name);
    }, 450);
  };

  return (
    <section style={{ marginTop: 48, marginBottom: 80 }}>
      <div
        style={{
          padding: 32,
          borderRadius: 24,
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
          backdropFilter: "blur(6px)",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontSize: 26,
            marginBottom: 12,
            fontWeight: 600,
            letterSpacing: "-0.3px",
          }}
        >
          Ready to Begin Your Journey?
        </h2>

        <p
          style={{
            fontSize: 17,
            opacity: 0.85,
            marginBottom: 24,
            lineHeight: 1.6,
          }}
        >
          {career.ctaMessage ||
            `Start exploring the first steps toward becoming a ${career.name}. 
             We’ll guide you with clarity, structure, and confidence.`}
        </p>

        <button
          onClick={handleClick}
          style={{
            padding: "14px 32px",
            fontSize: 18,
            borderRadius: 999,
            border: "none",
            cursor: "pointer",
            background: "linear-gradient(135deg, #4cc9f0, #4361ee)",
            color: "#fff",
            fontWeight: 600,
            letterSpacing: "-0.3px",
            transition: "transform 0.2s ease, opacity 0.2s ease",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = "scale(1.03)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1.0)")}
        >
          Start Your Path
        </button>
      </div>
    </section>
  );
};
