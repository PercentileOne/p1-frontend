import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { authApi, type ApiError } from "../api/authApi";
import { useAuthStore } from "../auth/authStore";
import { defaultPortalForPermissions } from "../auth/permissionMatrix";
import type { Permission } from "../auth/permissionMatrix";

/* ══════════════════════════════════════════════════════════════
   REGISTER — Two-step cinematic form
   Step 1: Name + email
   Step 2: Password + optional profession
   ══════════════════════════════════════════════════════════════ */

const PROFESSIONS = [
  "Software Engineer", "Product Manager", "Data Scientist", "Designer",
  "Marketing", "Finance", "Consulting", "Healthcare", "Legal",
  "Sales", "Operations", "Entrepreneur", "Student", "Other",
];

type Phase = "idle" | "loading" | "success";

export default function RegisterPage() {
  const navigate   = useNavigate();
  const storeLogin = useAuthStore(s => s.login);

  const [step,       setStep]       = useState<1 | 2>(1);
  const [phase,      setPhase]      = useState<Phase>("idle");
  const [showPass,   setShowPass]   = useState(false);
  const [showConf,   setShowConf]   = useState(false);

  // Fields
  const [firstName,   setFirstName]   = useState("");
  const [lastName,    setLastName]    = useState("");
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [confirm,     setConfirm]     = useState("");
  const [profession,  setProfession]  = useState("");

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiErr, setApiErr] = useState("");

  // ── Validation ────────────────────────────────────────────────

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!firstName.trim())                          e.firstName = "First name is required.";
    if (!lastName.trim())                           e.lastName  = "Last name is required.";
    if (!email.trim())                              e.email     = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
                                                    e.email     = "Please enter a valid email.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!password)                                  e.password = "Password is required.";
    else if (password.length < 8)                   e.password = "Password must be at least 8 characters.";
    if (!confirm)                                   e.confirm  = "Please confirm your password.";
    else if (confirm !== password)                  e.confirm  = "Passwords do not match.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Step navigation ───────────────────────────────────────────

  const goToStep2 = () => {
    if (validateStep1()) { setStep(2); setApiErr(""); }
  };

  const handleBack = () => { setStep(1); setApiErr(""); setErrors({}); };

  // ── Submit ────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validateStep2()) return;
    setApiErr("");
    setPhase("loading");

    try {
      const { token, user } = await authApi.register({
        email:     email.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
      });

      const session = await authApi.getSession(token);
      storeLogin(token, user, session.permissions);

      setPhase("success");

      const permSet = new Set(session.permissions) as Set<Permission>;
      const dest    = defaultPortalForPermissions(permSet);
      setTimeout(() => {
        if (permSet.has('CAN_START_INTERVIEW') && !permSet.has('CAN_VIEW_RECRUITER_PORTAL')) {
          navigate('/profile');
        } else {
          const isSameOrigin = dest.startsWith(window.location.origin);
          if (isSameOrigin) navigate('/cockpit');
          else window.location.href = dest;
        }
      }, 2400);
    } catch (err) {
      setPhase("idle");
      const e = err as ApiError;
      setApiErr(e?.error ?? "Something went wrong. Please try again.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") step === 1 ? goToStep2() : handleSubmit();
  };

  // ── Password strength ─────────────────────────────────────────

  const strength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8)           s++;
    if (/[A-Z]/.test(password))         s++;
    if (/[0-9]/.test(password))         s++;
    if (/[^A-Za-z0-9]/.test(password))  s++;
    return s;
  })();

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "#F87171", "#F59E0B", "#34D399", "#4F8EF7"][strength];

  // ─────────────────────────────────────────────────────────────

  return (
    <div
      className="relative min-h-screen w-screen overflow-hidden flex items-center justify-center"
      style={{ background: "#07112a" }}
      onKeyDown={handleKeyDown}
    >
      <style>{`
        .reg-input::placeholder { color: rgba(140,180,255,0.45) !important; }
        .reg-input:-webkit-autofill,
        .reg-input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #0a1a3a inset !important;
          -webkit-text-fill-color: #ffffff !important;
        }
      `}</style>

      {/* Ambient orbs */}
      <Orb cls="w-[500px] h-[500px] top-[-12%] left-[-8%]"   color="79,142,247"  delay={0}  dur={20} />
      <Orb cls="w-[350px] h-[350px] bottom-[-8%] right-[-6%]" color="37,99,235"   delay={5}  dur={24} />
      <Orb cls="w-[250px] h-[250px] top-[45%]   right-[12%]"  color="79,142,247"  delay={11} dur={28} />

      {/* Radial glow */}
      <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full"
           style={{ background: "radial-gradient(ellipse, rgba(79,142,247,0.12) 0%, transparent 70%)" }} />

      <div className="relative z-10 w-full max-w-sm px-4 flex flex-col items-center gap-6">

        {/* Logo mark */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-2"
        >
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            background: "linear-gradient(135deg,#4F8EF7,#2563eb)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="26" height="26" viewBox="0 0 44 44" fill="none">
              <clipPath id="rg-clip"><circle cx="22" cy="22" r="18"/></clipPath>
              <circle cx="22" cy="22" r="20" fill="#061228"/>
              <g clipPath="url(#rg-clip)">
                <path d="M8,31 L8,27 L17,27 L17,22 L26,22 L26,16 L35,16 L35,31 Z" fill="#a5b4fc"/>
              </g>
              <circle cx="31" cy="14" r="2.2" fill="#e0e7ff"/>
            </svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 17, color: "#fff", letterSpacing: "-.02em" }}>
            explain<span style={{ color: "#2563eb" }}>.global</span>
          </span>
        </motion.div>

        {/* Headline */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-.03em", margin: 0 }}>
            Create your account
          </h1>
          <p style={{ fontSize: 13, color: "rgba(240,244,255,.45)", marginTop: 4 }}>
            Your interview intelligence platform awaits.
          </p>
        </motion.div>

        {/* Step indicator */}
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {[1, 2].map(n => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%",
                background: step >= n ? "#4F8EF7" : "rgba(255,255,255,.06)",
                border: `1px solid ${step >= n ? "#4F8EF7" : "rgba(255,255,255,.12)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700,
                color: step >= n ? "#fff" : "rgba(255,255,255,.3)",
                transition: "all .3s",
              }}>
                {step > n ? <Check size={12} /> : n}
              </div>
              {n < 2 && (
                <div style={{
                  width: 32, height: 1,
                  background: step > 1 ? "#4F8EF7" : "rgba(255,255,255,.10)",
                  transition: "background .3s",
                }} />
              )}
            </div>
          ))}
          <span style={{ fontSize: 11, color: "rgba(240,244,255,.4)", marginLeft: 4 }}>
            Step {step} of 2
          </span>
        </motion.div>

        {/* Card */}
        <motion.div
          className="w-full rounded-3xl p-7 flex flex-col gap-4"
          style={{
            background: "rgba(255,255,255,0.032)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.65, ease: "easeOut" }}
        >
          <AnimatePresence mode="wait">

            {/* ── Step 1: Identity ── */}
            {step === 1 && (
              <motion.div
                key="step1"
                className="flex flex-col gap-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                {/* Name row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <RegInput
                      placeholder="First name"
                      value={firstName}
                      onChange={v => { setFirstName(v); clearErr("firstName"); }}
                      autoFocus
                    />
                    <ErrMsg msg={errors.firstName} />
                  </div>
                  <div>
                    <RegInput
                      placeholder="Last name"
                      value={lastName}
                      onChange={v => { setLastName(v); clearErr("lastName"); }}
                    />
                    <ErrMsg msg={errors.lastName} />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <RegInput
                    placeholder="Email address"
                    type="email"
                    value={email}
                    onChange={v => { setEmail(v); clearErr("email"); }}
                  />
                  <ErrMsg msg={errors.email} />
                </div>

                {/* Profession (optional) */}
                <RegSelect
                  value={profession}
                  onChange={setProfession}
                  options={PROFESSIONS}
                  placeholder="Profession (optional)"
                />

                <PrimaryButton onClick={goToStep2} phase="idle" label="Continue" icon={<ArrowRight size={14} />} />
              </motion.div>
            )}

            {/* ── Step 2: Security ── */}
            {step === 2 && (
              <motion.div
                key="step2"
                className="flex flex-col gap-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                {/* Password */}
                <div>
                  <RegInput
                    placeholder="Password (min. 8 characters)"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={v => { setPassword(v); clearErr("password"); }}
                    autoFocus
                    suffix={
                      <button onClick={() => setShowPass(p => !p)} tabIndex={-1}
                        style={{ color: "#4b5563", background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                        {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    }
                  />
                  <ErrMsg msg={errors.password} />

                  {/* Strength meter */}
                  {password && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} style={{
                            flex: 1, height: 3, borderRadius: 2,
                            background: i <= strength ? strengthColor : "rgba(255,255,255,.08)",
                            transition: "background .25s",
                          }} />
                        ))}
                      </div>
                      <span style={{ fontSize: 10, color: strengthColor, fontWeight: 600 }}>{strengthLabel}</span>
                    </div>
                  )}
                </div>

                {/* Confirm */}
                <div>
                  <RegInput
                    placeholder="Confirm password"
                    type={showConf ? "text" : "password"}
                    value={confirm}
                    onChange={v => { setConfirm(v); clearErr("confirm"); }}
                    suffix={
                      <button onClick={() => setShowConf(p => !p)} tabIndex={-1}
                        style={{ color: "#4b5563", background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                        {showConf ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    }
                  />
                  <ErrMsg msg={errors.confirm} />
                </div>

                {apiErr && (
                  <p style={{ fontSize: 12, color: "#F87171", textAlign: "center", margin: 0 }}>{apiErr}</p>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={handleBack}
                    style={{
                      flex: "0 0 auto", height: 44, width: 44, borderRadius: 12,
                      background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.10)",
                      color: "rgba(240,244,255,.5)", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div style={{ flex: 1 }}>
                    <PrimaryButton onClick={handleSubmit} phase={phase} label="Create account" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sign in link */}
          <p style={{ textAlign: "center", fontSize: 12, color: "rgba(240,244,255,.3)", margin: 0 }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "#4F8EF7", fontWeight: 600, textDecoration: "none" }}>
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Success overlay */}
      <AnimatePresence>
        {phase === "success" && <SuccessOverlay name={firstName} />}
      </AnimatePresence>
    </div>
  );

  function clearErr(key: string) {
    if (errors[key]) setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  }
}

/* ── Sub-components ────────────────────────────────────────── */

function RegInput({
  placeholder, type = "text", value, onChange, suffix, autoFocus,
}: {
  placeholder: string; type?: string; value: string;
  onChange: (v: string) => void; suffix?: React.ReactNode; autoFocus?: boolean;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      background: "rgba(79,142,247,0.07)", border: "1px solid rgba(79,142,247,0.22)",
      borderRadius: 8, padding: "10px 14px",
    }}>
      <input
        autoFocus={autoFocus}
        className="reg-input"
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none",
          fontSize: 13, color: "#cbd5e1", fontWeight: 350, caretColor: "#4F8EF7",
        }}
      />
      {suffix}
    </div>
  );
}

function RegSelect({
  value, onChange, options, placeholder,
}: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder: string;
}) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: "100%", appearance: "none", WebkitAppearance: "none",
          background: "rgba(79,142,247,0.07)", border: "1px solid rgba(79,142,247,0.22)",
          borderRadius: 8, padding: "10px 32px 10px 14px",
          fontSize: 13, color: value ? "#cbd5e1" : "rgba(140,180,255,0.45)",
          fontWeight: 350, outline: "none", cursor: "pointer",
        }}
      >
        <option value="" style={{ color: "#3d4451", background: "#071228" }}>{placeholder}</option>
        {options.map(o => (
          <option key={o} value={o} style={{ background: "#071228", color: "#cbd5e1" }}>{o}</option>
        ))}
      </select>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
        style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
        <path d="M2 4l4 4 4-4" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

function PrimaryButton({
  onClick, phase, label, icon,
}: {
  onClick: () => void; phase: Phase; label: string; icon?: React.ReactNode;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={phase !== "idle"}
      style={{
        width: "100%", height: 44, borderRadius: 12, border: "none",
        background: "linear-gradient(135deg,#4F8EF7,#2563eb)",
        boxShadow: "0 4px 24px rgba(99,102,241,.35)",
        color: "#fff", fontSize: 14, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        cursor: phase === "idle" ? "pointer" : "not-allowed", position: "relative", overflow: "hidden",
      }}
      whileHover={{ boxShadow: "0 4px 32px rgba(99,102,241,.55)" }}
      whileTap={{ scale: 0.98 }}
    >
      {phase === "loading" ? <Loader2 size={16} className="animate-spin" /> : <>{label}{icon}</>}
      <motion.span
        style={{
          position: "absolute", inset: 0, borderRadius: 12,
          background: "linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent)",
        }}
        initial={{ x: "-100%" }}
        whileHover={{ x: "100%" }}
        transition={{ duration: 0.6 }}
      />
    </motion.button>
  );
}

function ErrMsg({ msg }: { msg?: string }) {
  return msg
    ? <p style={{ fontSize: 11, color: "#F87171", marginTop: 4, marginLeft: 2 }}>{msg}</p>
    : null;
}

function SuccessOverlay({ name }: { name: string }) {
  return (
    <motion.div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 20,
        background: "rgba(5,13,32,.96)", backdropFilter: "blur(8px)",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        style={{
          width: 72, height: 72, borderRadius: "50%",
          background: "linear-gradient(135deg,#4F8EF7,#2563eb)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
      >
        <Check size={34} color="#fff" strokeWidth={2.5} />
      </motion.div>

      <motion.div
        style={{ textAlign: "center" }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <p style={{ color: "#fff", fontWeight: 700, fontSize: 18, margin: 0 }}>
          Welcome, {name || "there"} — you're in.
        </p>
        <p style={{ color: "rgba(240,244,255,.45)", fontSize: 13, marginTop: 6 }}>
          Setting up your Interview Chair…
        </p>
      </motion.div>
    </motion.div>
  );
}

function Orb({ cls, color, delay, dur }: { cls: string; color: string; delay: number; dur: number }) {
  return (
    <motion.div
      className={`absolute rounded-full pointer-events-none ${cls}`}
      style={{
        background: `radial-gradient(ellipse,rgba(${color},.09) 0%,transparent 70%)`,
        filter: "blur(40px)",
      }}
      animate={{ x: [0, 28, -18, 0], y: [0, -22, 16, 0] }}
      transition={{ duration: dur, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}
