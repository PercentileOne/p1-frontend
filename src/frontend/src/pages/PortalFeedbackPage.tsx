import { useState } from "react";
import { motion } from "framer-motion";
import { Star, ChevronRight, CheckCircle2 } from "lucide-react";

/* ══════════════════════════════════════════════════════════════
   PORTAL FEEDBACK PAGE — explain.global/feedback
   Public, no auth required. Logged to DB via POST /api/feedback
   ══════════════════════════════════════════════════════════════ */

const API = import.meta.env.VITE_EXPLAIN_API_URL as string;

const HOW_HEARD = [
  "From Francis / team directly",
  "Leaflet / flyer",
  "Word of mouth / friend",
  "Social media",
  "School / college / university",
  "Youth programme / community group",
  "LinkedIn",
  "Other",
];

const RATING_CATEGORIES = [
  { key: "overall",       label: "Overall experience"    },
  { key: "ease_of_use",   label: "Ease of use"           },
  { key: "interview_exp", label: "The AI interview"      },
  { key: "design",        label: "Look and feel"         },
  { key: "would_return",  label: "Would come back / use again" },
];

interface FormState {
  name:         string;
  email:        string;
  occupation:   string;
  age_group:    string;
  how_heard:    string;
  ratings:      Record<string, number>;
  thoughts:     string;
  improvements: string;
  recommend:    string;
}

const EMPTY: FormState = {
  name: "", email: "", occupation: "", age_group: "", how_heard: "",
  ratings: {}, thoughts: "", improvements: "", recommend: "",
};

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => {
        const filled = n <= (hovered || value);
        return (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(n)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 2, lineHeight: 1 }}
          >
            <Star
              size={24}
              fill={filled ? "#F59E0B" : "none"}
              stroke={filled ? "#F59E0B" : "rgba(255,255,255,0.2)"}
              strokeWidth={1.5}
            />
          </button>
        );
      })}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {label}{required && <span style={{ color: "#F87171", marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 10, padding: "12px 14px",
  fontSize: 14, color: "#fff", outline: "none",
  fontFamily: "inherit", transition: "border-color 0.2s",
};

export default function PortalFeedbackPage() {
  const [form,    setForm]    = useState<FormState>(EMPTY);
  const [phase,   setPhase]   = useState<"form" | "submitting" | "done" | "error">("form");
  const [touched, setTouched] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function setRating(key: string, value: number) {
    setForm(f => ({ ...f, ratings: { ...f.ratings, [key]: value } }));
  }

  function validate() {
    return form.name.trim().length > 0 &&
      Object.keys(form.ratings).length === RATING_CATEGORIES.length &&
      form.thoughts.trim().length > 10;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!validate()) return;

    setPhase("submitting");
    try {
      const res = await fetch(`${API}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:         form.name.trim(),
          email:        form.email.trim() || null,
          occupation:   form.occupation.trim() || null,
          age_group:    form.age_group || null,
          how_heard:    form.how_heard || null,
          ratings:      form.ratings,
          thoughts:     form.thoughts.trim(),
          improvements: form.improvements.trim() || null,
          recommend:    form.recommend || null,
          submitted_at: new Date().toISOString(),
          source:       "explain.global/feedback",
        }),
      });
      if (!res.ok) throw new Error();
      setPhase("done");
    } catch {
      setPhase("error");
    }
  }

  if (phase === "done") {
    return (
      <div style={{ minHeight: "100vh", background: "#09090f", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: "center", maxWidth: 480 }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            <CheckCircle2 size={36} color="#34D399" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", marginBottom: 12, letterSpacing: "-0.02em" }}>Thank you so much.</h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: 32 }}>
            Your feedback means everything to us. We read every single response and use it to make the platform better for everyone.
          </p>
          <a href="/" style={{ display: "inline-block", padding: "12px 28px", background: "linear-gradient(135deg,#34D399,#059669)", color: "#fff", borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
            Back to Explain.global
          </a>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#09090f", color: "#fff", fontFamily: '-apple-system,"Segoe UI",sans-serif' }}>

      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "18px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#34D399,#047857)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "#fff" }}>P1</div>
        <span style={{ fontSize: 15, fontWeight: 900, color: "#fff", letterSpacing: "-0.01em" }}>Explain<span style={{ color: "#34D399" }}>.global</span></span>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#34D399", marginBottom: 14 }}>
            ✦ Share Your Experience
          </div>
          <h1 style={{ fontSize: "clamp(28px,5vw,40px)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: 16 }}>
            Help us build something<br /><span style={{ color: "#34D399" }}>genuinely great.</span>
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.75, maxWidth: 520 }}>
            We're building Explain.global from the ground up — and your honest feedback shapes what comes next. It takes about 3 minutes.
          </p>
        </motion.div>

        <form onSubmit={handleSubmit}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            style={{ display: "flex", flexDirection: "column", gap: 28 }}>

            {/* Section: About you */}
            <Section title="About you">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Your name" required>
                  <input
                    value={form.name} onChange={e => set("name", e.target.value)}
                    placeholder="Jordan Smith" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "rgba(52,211,153,0.5)"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.10)"}
                  />
                  {touched && !form.name.trim() && <span style={{ fontSize: 11, color: "#F87171" }}>Please enter your name</span>}
                </Field>
                <Field label="Email (optional)">
                  <input
                    type="email" value={form.email} onChange={e => set("email", e.target.value)}
                    placeholder="you@email.com" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "rgba(52,211,153,0.5)"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.10)"}
                  />
                </Field>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="What do you do?">
                  <input
                    value={form.occupation} onChange={e => set("occupation", e.target.value)}
                    placeholder="e.g. Student, Developer, Barista..." style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "rgba(52,211,153,0.5)"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.10)"}
                  />
                </Field>
                <Field label="Age group">
                  <select value={form.age_group} onChange={e => set("age_group", e.target.value)}
                    style={{ ...inputStyle, cursor: "pointer" }}>
                    <option value="">Prefer not to say</option>
                    {["Under 18", "18–24", "25–34", "35–44", "45–54", "55+"].map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="How did you hear about us?">
                <select value={form.how_heard} onChange={e => set("how_heard", e.target.value)}
                  style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="">Select...</option>
                  {HOW_HEARD.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </Field>
            </Section>

            {/* Section: Star ratings */}
            <Section title="Rate your experience">
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {RATING_CATEGORIES.map(cat => (
                  <div key={cat.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{cat.label}</span>
                    <StarRating value={form.ratings[cat.key] ?? 0} onChange={v => setRating(cat.key, v)} />
                  </div>
                ))}
                {touched && Object.keys(form.ratings).length < RATING_CATEGORIES.length && (
                  <span style={{ fontSize: 11, color: "#F87171" }}>Please rate all categories</span>
                )}
              </div>
            </Section>

            {/* Section: Written feedback */}
            <Section title="Your thoughts">
              <Field label="What did you think of the platform?" required>
                <textarea
                  value={form.thoughts} onChange={e => set("thoughts", e.target.value)}
                  placeholder="Tell us what you liked, what surprised you, what felt good or confusing..."
                  rows={4}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                  onFocus={e => e.target.style.borderColor = "rgba(52,211,153,0.5)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.10)"}
                />
                {touched && form.thoughts.trim().length <= 10 && (
                  <span style={{ fontSize: 11, color: "#F87171" }}>Please share a few thoughts</span>
                )}
              </Field>
              <Field label="What would you improve or add?">
                <textarea
                  value={form.improvements} onChange={e => set("improvements", e.target.value)}
                  placeholder="Any features you wished existed, things that confused you, or ideas you'd love to see..."
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                  onFocus={e => e.target.style.borderColor = "rgba(52,211,153,0.5)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.10)"}
                />
              </Field>
            </Section>

            {/* Section: Recommend */}
            <Section title="One last thing">
              <Field label="Would you recommend Explain.global to a friend?">
                <div style={{ display: "flex", gap: 10 }}>
                  {["Definitely yes", "Probably yes", "Not sure", "Probably not"].map(opt => (
                    <button
                      key={opt} type="button"
                      onClick={() => set("recommend", opt)}
                      style={{
                        flex: 1, padding: "10px 8px", borderRadius: 10, cursor: "pointer",
                        border: `1px solid ${form.recommend === opt ? "rgba(52,211,153,0.5)" : "rgba(255,255,255,0.08)"}`,
                        background: form.recommend === opt ? "rgba(52,211,153,0.1)" : "rgba(255,255,255,0.03)",
                        color: form.recommend === opt ? "#34D399" : "rgba(255,255,255,0.5)",
                        fontSize: 12, fontWeight: 700, fontFamily: "inherit", transition: "all 0.15s",
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </Field>
            </Section>

            {/* Submit */}
            <div>
              {phase === "error" && (
                <div style={{ marginBottom: 16, padding: "12px 16px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 10, fontSize: 13, color: "#F87171" }}>
                  Something went wrong. Please try again or email us at francis@percentile.one
                </div>
              )}
              <button
                type="submit"
                disabled={phase === "submitting"}
                style={{
                  width: "100%", padding: "14px 24px",
                  background: "linear-gradient(135deg,#34D399,#059669)",
                  color: "#fff", border: "none", borderRadius: 12,
                  fontSize: 15, fontWeight: 800, cursor: phase === "submitting" ? "not-allowed" : "pointer",
                  fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: "0 4px 20px rgba(52,211,153,0.25)", opacity: phase === "submitting" ? 0.7 : 1,
                  transition: "opacity 0.2s",
                }}
              >
                {phase === "submitting" ? "Sending…" : <>Submit Feedback <ChevronRight size={16} /></>}
              </button>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center", marginTop: 12 }}>
                Your feedback is private and used only to improve the platform.
              </p>
            </div>

          </motion.div>
        </form>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "24px 22px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>{title}</div>
      {children}
    </div>
  );
}
