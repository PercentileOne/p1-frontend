// Recruiter accounts are no longer self-service (Francis, 2026-09-21): recruiters and employers get access to candidate data, so they are
// onboarded by us — request access -> we vet them -> we create the account and send the payment link. The old self-registration form
// (which posted role:'recruiter' to the shared backend) is gone, and the backend now refuses that role anyway. This page stays only so
// old /register links and bookmarks land somewhere sensible.
import { Link } from "react-router-dom";
import { ChairLogo } from "../components/LogoMark";

export default function Register() {
  return (
    <div style={{
      minHeight: "100vh", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      background: "linear-gradient(135deg,#060a12 0%,#080d1a 50%,#0a0f1c 100%)", fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 440, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <ChairLogo size={84} showText={false} />
        </div>
        <h1 style={{ margin: "0 0 10px", fontSize: 24, fontWeight: 800, color: "#F0F4FF" }}>Recruiter accounts are set up by our team</h1>
        <p style={{ margin: "0 0 26px", fontSize: 14, lineHeight: 1.7, color: "rgba(240,244,255,0.6)" }}>
          Because recruiters and employers can search and contact candidates, we set each account up personally. Request access and we'll
          be in touch to get you started.
        </p>
        <a
          href="https://www.theinterviewchair.com/request-access.html"
          style={{
            display: "block", padding: "14px 20px", borderRadius: 12, textDecoration: "none", fontSize: 15, fontWeight: 700, color: "#fff",
            background: "linear-gradient(135deg,#4F8EF7,#6366f1)", boxShadow: "0 8px 24px rgba(79,142,247,0.3)",
          }}
        >
          Request access →
        </a>
        <p style={{ margin: "22px 0 0", fontSize: 13, color: "rgba(240,244,255,0.45)" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#4F8EF7", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
