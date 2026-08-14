import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Lock, Eye, EyeOff, CheckCircle2, ArrowLeft } from "lucide-react";

const API = import.meta.env.VITE_EXPLAIN_API_URL as string;

export default function ResetPasswordPage() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const token      = params.get("token") ?? "";

  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [showPass,  setShowPass]  = useState(false);
  const [phase,     setPhase]     = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errMsg,    setErrMsg]    = useState("");

  if (!token) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#09090f", color: "#fff", fontFamily: "inherit" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#F87171", marginBottom: 16 }}>Invalid or missing reset token.</p>
          <Link to="/forgot-password" style={{ color: "#34D399", fontWeight: 600, textDecoration: "none" }}>Request a new reset link →</Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8)   { setErrMsg("Password must be at least 8 characters."); return; }
    if (password !== confirm)   { setErrMsg("Passwords don't match."); return; }
    setErrMsg("");
    setPhase("loading");

    try {
      const res = await fetch(`${API}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrMsg((data as { error?: string }).error ?? "Something went wrong. Please try again.");
        setPhase("error");
        return;
      }
      setPhase("done");
      setTimeout(() => navigate("/login"), 2500);
    } catch {
      setErrMsg("Something went wrong. Please try again.");
      setPhase("error");
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
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", border: "2px solid rgba(52,211,153,0.4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", background: "rgba(52,211,153,0.06)" }}>
            <Lock size={26} color="#34D399" />
          </div>
          <p style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "0.02em", margin: 0 }}>
            InterviewMe<span style={{ color: "#34D399" }}>.global</span>
          </p>
        </div>

        <div style={{
          background: "rgba(255,255,255,0.032)", backdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.07)", borderRadius: 24, padding: 32,
          boxShadow: "0 32px 80px rgba(0,0,0,0.55)",
        }}>
          {phase === "done" ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: "center" }}>
              <CheckCircle2 size={40} color="#34D399" style={{ margin: "0 auto 16px" }} />
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: "0 0 10px" }}>Password updated!</h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, margin: "0 0 4px" }}>
                Taking you back to sign in…
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: "0 0 8px", letterSpacing: "-0.02em" }}>Choose a new password</h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, margin: "0 0 24px" }}>
                At least 8 characters. Make it a good one.
              </p>

              {/* New password */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#111111", border: "1px solid rgba(148,163,184,0.16)", borderRadius: 10, padding: "12px 14px", boxShadow: "inset 0 2px 6px rgba(0,0,0,0.55)" }}>
                  <Lock size={14} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0 }} />
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="New password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setErrMsg(""); }}
                    autoFocus
                    style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, color: "#fff", fontFamily: "inherit" }}
                  />
                  <button type="button" onClick={() => setShowPass(p => !p)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "rgba(255,255,255,0.3)" }}>
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Confirm */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#111111", border: "1px solid rgba(148,163,184,0.16)", borderRadius: 10, padding: "12px 14px", boxShadow: "inset 0 2px 6px rgba(0,0,0,0.55)" }}>
                  <Lock size={14} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0 }} />
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirm}
                    onChange={e => { setConfirm(e.target.value); setErrMsg(""); }}
                    style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13, color: "#fff", fontFamily: "inherit" }}
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
                {phase === "loading" ? "Updating…" : "Update Password →"}
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

