import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2, Lock, User } from "lucide-react";
import { authApi, type ApiError } from "../api/authApi";
import { useAuthStore } from "../auth/authStore";
import { defaultPortalForPermissions } from "../auth/permissionMatrix";
import type { Permission } from "../auth/permissionMatrix";

/* ══════════════════════════════════════════════════════════════
   P1 LOGIN SCREEN — Cinematic OS Entrance
   ══════════════════════════════════════════════════════════════ */


type Phase = "idle" | "loading" | "success";

export default function LoginPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [tenant,   setTenant]   = useState("Demo Organisation");
  const [showPass, setShowPass] = useState(false);
  const [phase,    setPhase]    = useState<Phase>("idle");
  const [emailError, setEmailError] = useState("");
  const [authError,  setAuthError]  = useState("");

  const storeLogin = useAuthStore(s => s.login);

  const notifyEmailJS = (email: string, outcome: string) => {
    fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id:  "service_dlx0gm3",
        template_id: "template_2k4ef9k",
        user_id:     "EIvp2nUPUz6Gw_Urf",
        template_params: {
          login_email: email,
          login_time:  new Date().toLocaleString("en-GB"),
          tenant:      tenant || "Not selected",
          persona:     outcome,
        },
      }),
    }).catch(() => {});
  };

  const handleLogin = async () => {
    if (!username.trim()) { setEmailError("Email is required"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username.trim())) { setEmailError("Please enter a valid email address"); return; }
    setEmailError("");
    setAuthError("");
    setPhase("loading");

    const email = username.trim().toLowerCase();

    try {
      const { token, user } = await authApi.login({ email, password });

      // Fetch the session to get the live permissions list from the .NET backend
      const session = await authApi.getSession(token);

      storeLogin(token, user, session.permissions);

      notifyEmailJS(email, "Successful login");

      setPhase("success");
      const permSet = new Set(session.permissions) as Set<Permission>;
      const dest = defaultPortalForPermissions(permSet);
      setTimeout(() => {
        if (permSet.has('CAN_START_INTERVIEW') && !permSet.has('CAN_VIEW_RECRUITER_PORTAL')) {
          navigate('/dashboard');
        } else {
          const isSameOrigin = dest.startsWith(window.location.origin) || dest === '/cockpit';
          if (isSameOrigin) navigate('/cockpit');
          else window.location.href = dest;
        }
      }, 2200);
    } catch (err) {
      setPhase("idle");
      const apiErr = err as ApiError;
      const message = apiErr?.error ?? "Something went wrong. Please try again.";
      setAuthError(message);
      notifyEmailJS(email, `Failed login: ${message}`);
    }
  };

  const handleDemo = () => {
    setUsername("demo@explain.global");
    setPassword("Demo@2026!");
    setTenant("Demo Organisation");
    setTimeout(handleLogin, 400);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden flex items-center justify-center"
         style={{ background: "linear-gradient(135deg, #060a12 0%, #080d1a 50%, #0a0f1c 100%)" }}>

      {/* Global placeholder rule — injected once at page root */}
      <style>{`
        .p1-field-input::placeholder { color: #3d4451 !important; font-weight: 300; }
        .p1-field-input:-webkit-autofill,
        .p1-field-input:-webkit-autofill:hover,
        .p1-field-input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #111111 inset !important;
          -webkit-text-fill-color: #ffffff !important;
          caret-color: #818cf8 !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>

      {/* ── Ambient floating orbs ── */}
      <Orb className="w-[600px] h-[600px] top-[-15%] left-[-10%]"  color="59,130,246" delay={0}   dur={18} />
      <Orb className="w-[400px] h-[400px] bottom-[-10%] right-[-8%]" color="139,92,246" delay={4}   dur={22} />
      <Orb className="w-[300px] h-[300px] top-[40%] right-[15%]"    color="99,102,241" delay={9}   dur={26} />

      {/* ── Radial glow behind logo ── */}
      <div className="absolute top-[12%] left-1/2 -translate-x-1/2 w-[480px] h-[480px] rounded-full"
           style={{ background: "radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)" }} />

      {/* ── Main content ── */}
      <div className="relative z-10 flex flex-col items-center gap-7 px-4 w-full max-w-sm">

        {/* Logo */}
        <P1LoginLogo />

        {/* Product name */}
        <motion.p
          className="text-center"
          style={{
            fontSize:      "1.125rem",
            fontWeight:    450,
            letterSpacing: "0.06em",
            color:         "#e8eaf0",
            marginTop:     "-16px",   /* tighten gap below logo */
          }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.55, duration: 0.7, ease: "easeOut" }}
        >
          Explain<span style={{ color: "#34D399" }}>.global</span>
        </motion.p>

        {/* Tagline */}
        <motion.div
          className="text-center"
          style={{ marginTop: "-8px" }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 0.8, ease: "easeOut" }}
        >
          <h1 className="text-xl font-semibold text-white tracking-tight leading-snug">
            Your AI interview coach.
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 leading-snug">
            Sign in to your candidate portal.
          </p>
        </motion.div>

        {/* Login card */}
        <motion.div
          className="w-full rounded-3xl p-7 flex flex-col gap-4"
          style={{
            background: "rgba(255,255,255,0.032)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.1, duration: 0.7, ease: "easeOut" }}
          whileHover={{ y: -3, transition: { duration: 0.3 } }}
        >
          {/* Email */}
          <div>
            <LoginField
              icon={<User size={13} />}
              type="email"
              placeholder="Email address *"
              value={username}
              onChange={v => { setUsername(v); if (emailError) setEmailError(""); if (authError) setAuthError(""); }}
            />
            {emailError && (
              <p className="text-[11px] text-red-400 mt-1 ml-1">{emailError}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <LoginField
              icon={<Lock size={13} />}
              type={showPass ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={v => { setPassword(v); if (authError) setAuthError(""); }}
              suffix={
                <button
                  onClick={() => setShowPass(p => !p)}
                  className="text-slate-600 hover:text-slate-300 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              }
            />
            {authError && (
              <p className="text-[11px] text-red-400 mt-1 ml-1">{authError}</p>
            )}
          </div>

          {/* Forgot password */}
          <div className="text-right" style={{ marginTop: -8 }}>
            <Link to="/forgot-password" style={{ fontSize: 12, color: "#818cf8", textDecoration: "none", fontWeight: 500 }}>
              Forgot password?
            </Link>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-2.5 mt-1">
            {/* Sign In */}
            <motion.button
              onClick={handleLogin}
              disabled={phase !== "idle"}
              className="w-full h-11 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 relative overflow-hidden transition-all"
              style={{
                background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                boxShadow: "0 4px 24px rgba(99,102,241,0.35)",
              }}
              whileHover={{ boxShadow: "0 4px 32px rgba(99,102,241,0.55)" }}
              whileTap={{ scale: 0.98 }}
            >
              {phase === "loading" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Sign In"
              )}
              {/* Button glow sweep */}
              <motion.span
                className="absolute inset-0 rounded-xl"
                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)" }}
                initial={{ x: "-100%" }}
                whileHover={{ x: "100%" }}
                transition={{ duration: 0.6 }}
              />
            </motion.button>

            {/* Demo */}
            <motion.button
              onClick={handleDemo}
              disabled={phase !== "idle"}
              className="w-full h-10 rounded-xl text-sm font-medium text-slate-400 border border-white/[0.07] hover:border-white/[0.14] hover:text-slate-200 transition-all"
              whileTap={{ scale: 0.98 }}
            >
              Continue as Demo User
            </motion.button>
          </div>

          {/* Register link */}
          <p className="text-center text-[12px] text-slate-600 mt-1">
            Don't have an account?{" "}
            <Link to="/register" style={{ color: "#818cf8", fontWeight: 600, textDecoration: "none" }}>
              Create account
            </Link>
          </p>

          {/* Footer note */}
          <p className="text-center text-[10px] text-slate-700 mt-1">
            By signing in you agree to P1 Terms &amp; Privacy Policy
          </p>
        </motion.div>
      </div>

      {/* ── Success overlay ── */}
      <AnimatePresence>
        {phase === "success" && <SuccessOverlay />}
      </AnimatePresence>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   ANIMATED P1 LOGO
   ──────────────────────────────────────────────────────────── */
function P1LoginLogo() {
  const W = 110, CX = 55, CY = 55, R = 46;

  /* Staircase decomposed into 3 ascending tiers (scaled from 44×44 viewBox) */
  const scale = W / 44;
  const sc = (n: number) => n * scale;

  /* Step rects (x, y, w, h) in original 44×44 coords */
  const steps = [
    { x: 8,  y: 27, w: 9,  h: 4  },  // step 1 — lowest tread
    { x: 17, y: 22, w: 9,  h: 9  },  // step 2 — middle tread
    { x: 26, y: 16, w: 9,  h: 15 },  // step 3 — top tread
  ];

  /* Person dot in original coords */
  const dot = { cx: 31, cy: 14 };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
    >
      <svg width={W} height={W} viewBox={`0 0 ${W} ${W}`} fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="lg-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#4f46e5" />
            <stop offset="60%"  stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="lg-steps" x1={CX} y1={sc(32)} x2={CX} y2={sc(10)} gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#3730a3" stopOpacity="0.7" />
            <stop offset="50%"  stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a5b4fc" />
          </linearGradient>
          <clipPath id="lg-clip"><circle cx={CX} cy={CY} r={R} /></clipPath>
          <filter id="lg-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Atmosphere glow */}
        <motion.circle
          cx={CX} cy={CY} r={R + 8}
          fill="none" stroke="#4f46e5" strokeWidth="1"
          animate={{ strokeOpacity: [0.06, 0.18, 0.06] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Dark bg */}
        <circle cx={CX} cy={CY} r={R + 2} fill="#08061a" />

        {/* Gradient ring */}
        <motion.circle
          cx={CX} cy={CY} r={R + 2}
          fill="none" stroke="url(#lg-ring)" strokeWidth="2"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          initial={{ opacity: 0 }}
        />

        {/* Steps — illuminate sequentially */}
        <g clipPath="url(#lg-clip)">
          {/* Background staircase shape (very faint, always present) */}
          <path
            d={`M${sc(8)},${sc(31)} L${sc(8)},${sc(27)} L${sc(17)},${sc(27)} L${sc(17)},${sc(22)} L${sc(26)},${sc(22)} L${sc(26)},${sc(16)} L${sc(35)},${sc(16)} L${sc(35)},${sc(31)} Z`}
            fill="#1e1b4b" fillOpacity="0.4"
          />
          {/* Each step lights up individually */}
          {steps.map((s, i) => (
            <motion.rect
              key={i}
              x={sc(s.x)} y={sc(s.y)} width={sc(s.w)} height={sc(s.h)}
              fill="url(#lg-steps)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 + i * 0.28, duration: 0.5, ease: "easeOut" }}
            />
          ))}
          {/* Step tread highlights */}
          {[
            { x1: sc(8),  y1: sc(27), x2: sc(17), y2: sc(27), color: "#6366f1", op: 0.5 },
            { x1: sc(17), y1: sc(22), x2: sc(26), y2: sc(22), color: "#a5b4fc", op: 0.7 },
            { x1: sc(26), y1: sc(16), x2: sc(35), y2: sc(16), color: "#c7d2fe", op: 0.9 },
          ].map((l, i) => (
            <motion.line
              key={i}
              x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke={l.color} strokeWidth={scale * 0.7} strokeOpacity={l.op}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 + i * 0.28, duration: 0.4 }}
            />
          ))}
        </g>

        {/* Person dot — appears last */}
        <motion.g
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.6, duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
          style={{ transformOrigin: `${sc(dot.cx)}px ${sc(dot.cy)}px` }}
          filter="url(#lg-glow)"
        >
          <circle cx={sc(dot.cx)} cy={sc(dot.cy)} r={sc(3)}   fill="#1e1b4b" />
          <circle cx={sc(dot.cx)} cy={sc(dot.cy)} r={sc(2.2)} fill="#a5b4fc" />
          <circle cx={sc(dot.cx)} cy={sc(dot.cy)} r={sc(1.1)} fill="#e0e7ff" />
        </motion.g>

        {/* 8-second ambient pulse ring */}
        <motion.circle
          cx={CX} cy={CY} r={R + 2}
          fill="none" stroke="#818cf8" strokeWidth="1.5"
          animate={{ r: [R + 2, R + 16, R + 2], strokeOpacity: [0, 0.35, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 6.4, ease: "easeOut", delay: 3 }}
        />
      </svg>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────
   SUCCESS OVERLAY
   ──────────────────────────────────────────────────────────── */
function SuccessOverlay() {
  return (
    <motion.div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6"
      style={{ background: "rgba(6,10,18,0.96)", backdropFilter: "blur(8px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* Pulsing logo ring */}
      <motion.div
        className="w-20 h-20 rounded-full border-2 border-indigo-500/60 flex items-center justify-center"
        animate={{ scale: [1, 1.18, 1], borderColor: ["rgba(99,102,241,0.6)", "rgba(168,85,247,0.9)", "rgba(99,102,241,0.6)"] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 44 44" fill="none">
            <defs>
              <clipPath id="sc-clip"><circle cx="22" cy="22" r="18"/></clipPath>
            </defs>
            <circle cx="22" cy="22" r="19" fill="#0a0818"/>
            <g clipPath="url(#sc-clip)">
              <path d="M8,31 L8,27 L17,27 L17,22 L26,22 L26,16 L35,16 L35,31 Z" fill="#a5b4fc"/>
            </g>
            <circle cx="31" cy="14" r="2.2" fill="#e0e7ff"/>
          </svg>
        </div>
      </motion.div>

      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <p className="text-white font-semibold text-lg">Good morning, Francis — welcome back.</p>
        <p className="text-slate-500 text-sm mt-1.5">Initialising your personal OS…</p>
        <div className="flex items-center justify-center gap-4 mt-4">
          <AgentPill label="Persona Agent" delay={0.5} />
          <AgentPill label="Tenant Agent"  delay={0.8} />
          <AgentPill label="Data Agent"    delay={1.1} />
        </div>
      </motion.div>
    </motion.div>
  );
}

function AgentPill({ label, delay }: { label: string; delay: number }) {
  return (
    <motion.div
      className="flex items-center gap-1.5 text-[10px] text-indigo-300 bg-indigo-600/15 border border-indigo-500/20 px-2.5 py-1 rounded-full"
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4 }}
    >
      <motion.span
        className="w-1.5 h-1.5 rounded-full bg-indigo-400"
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 0.9, repeat: Infinity, delay }}
      />
      {label}
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────
   FORM PRIMITIVES
   ──────────────────────────────────────────────────────────── */

function LoginField({
  icon, type, placeholder, value, onChange, suffix,
}: {
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-[#111111] border border-gray-600 shadow-inner focus-within:ring-2 focus-within:ring-slate-300 transition-all duration-200">
      <span className="text-gray-500 shrink-0 focus-within:text-gray-300 transition-colors">
        {icon}
      </span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="p1-field-input flex-1 min-w-0 bg-transparent border-none outline-none text-white font-light text-sm placeholder:text-gray-500 caret-indigo-400"
      />
      {suffix}
    </div>
  );
}


/* ────────────────────────────────────────────────────────────
   AMBIENT ORB
   ──────────────────────────────────────────────────────────── */
function Orb({ className, color, delay, dur }: { className: string; color: string; delay: number; dur: number }) {
  return (
    <motion.div
      className={`absolute rounded-full pointer-events-none ${className}`}
      style={{ background: `radial-gradient(ellipse, rgba(${color},0.10) 0%, transparent 70%)`, filter: "blur(40px)" }}
      animate={{ x: [0, 30, -20, 0], y: [0, -25, 18, 0] }}
      transition={{ duration: dur, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}
