import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

const API = import.meta.env.VITE_EXPLAIN_API_URL as string;

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState("");
  const [phase,   setPhase]   = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errMsg,  setErrMsg]  = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) { setErrMsg("Please enter a valid email address."); return; }
    setErrMsg("");
    setPhase("loading");
    try {
      await fetch(`${API}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setPhase("done");
    } catch {
      setPhase("error");
      setErrMsg("Something went wrong. Please try again.");
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #060a12 0%, #080d1a 50%, #0a0f1c 100%)",
      fontFamily: '-apple-system,"Segoe UI",sans-serif', padding: 24,
    }}>
      {/* Ambient orbs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", top: "10%", left: "20%", background: "radial-gradient(ellipse, rgba(52,211,153,0.06) 0%, transparent 70%)", filter: "blur(40px)" }} />
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", bottom: "15%", right: "15%", background: "radial-gradient(ellipse, rgba(99,102,241,0.07) 0%, transparent 70%)", filter: "blur(40px)" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ width: "100%", maxWidth: 400, position: "relative", zIndex: 1 }}
      >
        {/* Logo + brand */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", border: "2px solid rgba(52,211,153,0.4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", background: "rgba(52,211,153,0.06)" }}>
            <Mail size={26} color="#34D399" />
          </div>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "0.02em", margin: "0 0 6px" }}>
            Interview<span style={{ color: "#34D399" }}>Me</span><span style={{ color: "#4F8EF7" }}>.global</span>
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(255,255,255,0.032)", backdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.07)", borderRadius: 24, padding: 32,
          boxShadow: "0 32px 80px rgba(0,0,0,0.55)",
        }}>
          {phase === "done" ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: "center" }}>
              <CheckCircle2 size={40} color="#34D399" style={{ margin: "0 auto 16px" }} />
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: "0 0 10px" }}>Check your inbox</h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, margin: "0 0 24px" }}>
                If an account exists for <strong style={{ color: "rgba(255,255,255,0.8)" }}>{email}</strong>, we've sent a password reset link. It expires in 2 hours.
              </p>
              <Link to="/login" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#818cf8", textDecoration: "none", fontWeight: 600 }}>
                <ArrowLeft size={14} /> Back to sign in
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: "0 0 8px", letterSpacing: "-0.02em" }}>Reset your password</h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, margin: "0 0 24px" }}>
                Enter your email and we'll send you a link to reset your password.
              </p>

              <div style={{ marginBottom: 20 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: "#111111", border: "1px solid rgba(148,163,184,0.16)",
                  borderRadius: 10, padding: "12px 14px",
                  boxShadow: "inset 0 2px 6px rgba(0,0,0,0.55)",
                  transition: "border-color 0.2s",
                }}>
                  <Mail size={14} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0 }} />
                  <input
                    type="email"
                    placeholder="Your email address"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setErrMsg(""); }}
                    autoFocus
                    style={{
                      flex: 1, background: "none", border: "none", outline: "none",
                      fontSize: 13, color: "#fff", fontFamily: "inherit",
                    }}
                  />
                </div>
                {errMsg && <p style={{ fontSize: 11, color: "#F87171", margin: "6px 0 0 2px" }}>{errMsg}</p>}
              </div>

              <button
                type="submit"
                disabled={phase === "loading"}
                style={{
                  width: "100%", padding: "13px 0",
                  background: "linear-gradient(135deg,#34D399,#059669)",
                  color: "#fff", border: "none", borderRadius: 12,
                  fontSize: 14, fontWeight: 700, cursor: phase === "loading" ? "not-allowed" : "pointer",
                  fontFamily: "inherit", opacity: phase === "loading" ? 0.7 : 1,
                  boxShadow: "0 4px 20px rgba(52,211,153,0.25)", transition: "opacity 0.2s",
                }}
              >
                {phase === "loading" ? "Sending…" : "Send Reset Link →"}
              </button>

              <div style={{ textAlign: "center", marginTop: 20 }}>
                <Link to="/login" style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <ArrowLeft size={12} /> Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}

