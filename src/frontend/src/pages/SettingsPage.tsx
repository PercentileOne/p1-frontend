import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Calendar, Activity, Watch, Code2, PlayCircle, FileText, CreditCard,
  Sparkles, ExternalLink, Mail,
} from "lucide-react";
import BackToCockpit from "../components/BackToCockpit";
import SettingsSection from "../components/settings/SettingsSection";
import SettingsRow from "../components/settings/SettingsRow";
import ToggleSwitch from "../components/settings/ToggleSwitch";
import TextInput from "../components/settings/TextInput";
import SelectDropdown from "../components/settings/SelectDropdown";
import AvatarUploader from "../components/settings/AvatarUploader";
import DangerButton from "../components/settings/DangerButton";
import Button from "../components/settings/Button";
import ComingSoonCard from "../components/settings/ComingSoonCard";

/* ══════════════════════════════════════════════════════════════
   SETTINGS PAGE — /settings
   Full premium-OS-panel UI: two-column layout, raised 3D cards,
   real interactive controls (local state — no persistence yet).
   ══════════════════════════════════════════════════════════════ */

const PROFILE_IMG = "/images/francis.jpg";
const EASE = [0.4, 0, 0.2, 1] as const;

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200 flex flex-col">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#13151c] border-b border-white/[0.06] px-6 py-3 flex items-center gap-3">
        <BackToCockpit />
        <h1 className="text-[16px] font-bold text-white">Settings</h1>
      </div>

      {/* Scroll area with soft top fade */}
      <div className="relative flex-1 overflow-y-auto">
        <div
          className="sticky top-0 left-0 right-0 h-6 z-10 pointer-events-none"
          style={{ background: "linear-gradient(180deg, #0f1117 0%, transparent 100%)" }}
        />
        <div className="max-w-5xl mx-auto w-full px-6 pb-12 -mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-6 items-start">

            {/* LEFT COLUMN — 70% */}
            <div className="flex flex-col gap-6">
              <ProfileSection />
              <PersonalisationSection />
              <NotificationsSection />
              <PrivacySection />
            </div>

            {/* RIGHT COLUMN — 30% */}
            <div className="flex flex-col gap-6">
              <IntegrationsSection />
              <BillingSection />
              <AboutSection />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   1. PROFILE
   ──────────────────────────────────────────────────────────── */
function ProfileSection() {
  const [name, setName] = useState("Francis Cobbinah");
  const [profession, setProfession] = useState("Founder");
  const [university, setUniversity] = useState("University of Essex");
  const [bio, setBio] = useState("Building Percentile.One — the world's first Life Management OS.");

  return (
    <SettingsSection title="Profile" subtitle="Manage your public identity across P1.">
      <div className="flex items-center gap-4 pb-3 border-b border-white/[0.1]">
        <AvatarUploader src={PROFILE_IMG} initials="FC" />
        <div className="text-[11px] text-slate-500 leading-relaxed">
          Square image recommended.<br />Visible on your profile and story.
        </div>
      </div>

      <SettingsRow label="Name">
        <div className="w-56"><TextInput value={name} onChange={setName} /></div>
      </SettingsRow>
      <SettingsRow label="Email" description="Used for sign-in and notifications">
        <div className="w-56"><TextInput value="francis@percentile.one" disabled /></div>
      </SettingsRow>
      <SettingsRow label="Profession">
        <div className="w-56"><TextInput value={profession} onChange={setProfession} /></div>
      </SettingsRow>
      <SettingsRow label="University" last>
        <div className="w-56"><TextInput value={university} onChange={setUniversity} /></div>
      </SettingsRow>

      <div className="pt-1">
        <p className="text-[12.5px] font-medium text-slate-200 mb-2">Short bio</p>
        <TextInput value={bio} onChange={setBio} multiline rows={3} />
      </div>
    </SettingsSection>
  );
}

/* ────────────────────────────────────────────────────────────
   2. PERSONALISATION
   ──────────────────────────────────────────────────────────── */
function PersonalisationSection() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState("Dark");
  const [accent, setAccent] = useState("Indigo");
  const [density, setDensity] = useState("Standard");
  const [defaultIsWork, setDefaultIsWork] = useState(false);

  return (
    <SettingsSection title="Personalisation" subtitle="Control how P1 looks, feels, and adapts to you.">
      <SettingsRow label="Theme" description="Light, dark, or follow system">
        <SelectDropdown value={theme} options={["Light", "Dark", "Auto"]} onChange={setTheme} />
      </SettingsRow>
      <SettingsRow label="Accent colour">
        <SelectDropdown value={accent} options={["Indigo", "Violet", "Emerald", "Amber", "Rose"]} onChange={setAccent} />
      </SettingsRow>
      <SettingsRow label="Dashboard density" description="Spacing of cards and panels">
        <SelectDropdown value={density} options={["Compact", "Standard", "Comfortable"]} onChange={setDensity} />
      </SettingsRow>
      <SettingsRow label="Default mode on login" description={defaultIsWork ? "My Work" : "My Life"}>
        <ToggleSwitch checked={defaultIsWork} onChange={setDefaultIsWork} />
      </SettingsRow>
      <SettingsRow label="Interests" description="Used to personalise your home, feed, and agent" last>
        <Button label="Edit Interests" onClick={() => navigate("/interests")} />
      </SettingsRow>
    </SettingsSection>
  );
}

/* ────────────────────────────────────────────────────────────
   3. NOTIFICATIONS
   ──────────────────────────────────────────────────────────── */
function NotificationsSection() {
  const [daily, setDaily] = useState(true);
  const [weekly, setWeekly] = useState(true);
  const [goals, setGoals] = useState(true);
  const [habits, setHabits] = useState(false);
  const [agent, setAgent] = useState(true);

  return (
    <SettingsSection title="Notifications" subtitle="Choose what P1 should notify you about.">
      <SettingsRow label="Daily Insight" description="Your personalised insight each morning">
        <ToggleSwitch checked={daily} onChange={setDaily} />
      </SettingsRow>
      <SettingsRow label="Weekly Summary" description="A recap of your week every Sunday">
        <ToggleSwitch checked={weekly} onChange={setWeekly} />
      </SettingsRow>
      <SettingsRow label="Goal reminders" description="Nudges when a goal needs attention">
        <ToggleSwitch checked={goals} onChange={setGoals} />
      </SettingsRow>
      <SettingsRow label="Habit reminders" description="Daily nudges for tracked habits">
        <ToggleSwitch checked={habits} onChange={setHabits} />
      </SettingsRow>
      <SettingsRow label="Agent suggestions" description="Proactive picks from your P1 agent" last>
        <ToggleSwitch checked={agent} onChange={setAgent} />
      </SettingsRow>
    </SettingsSection>
  );
}

/* ────────────────────────────────────────────────────────────
   4. DATA & PRIVACY
   ──────────────────────────────────────────────────────────── */
function PrivacySection() {
  return (
    <SettingsSection title="Data & Privacy" subtitle="Manage your data, devices, and account.">
      <SettingsRow label="Export my data" description="Download a copy of everything you've stored in P1">
        <Button label="Export" />
      </SettingsRow>
      <SettingsRow label="Manage connected devices" description="See where you're signed in">
        <Button label="Manage" />
      </SettingsRow>
      <SettingsRow label="Manage integrations" description="Control third-party access to your data">
        <Button label="Manage" />
      </SettingsRow>
      <SettingsRow label="Delete my account" description="Permanently remove your account and all data" last>
        <DangerButton label="Delete my account" />
      </SettingsRow>
    </SettingsSection>
  );
}

/* ────────────────────────────────────────────────────────────
   5. INTEGRATIONS (future)
   ──────────────────────────────────────────────────────────── */
function IntegrationsSection() {
  const integrations = [
    { icon: <Calendar size={14} />, label: "Google Calendar" },
    { icon: <Calendar size={14} />, label: "Outlook Calendar" },
    { icon: <Activity size={14} />, label: "Apple Health" },
    { icon: <Watch size={14} />, label: "Strava" },
    { icon: <FileText size={14} />, label: "Notion" },
    { icon: <Code2 size={14} />, label: "GitHub" },
    { icon: <PlayCircle size={14} />, label: "YouTube" },
  ];

  return (
    <SettingsSection title="Integrations" subtitle="Connect the tools you already use." badge="Future">
      <div className="flex flex-col gap-2">
        {integrations.map(i => <ComingSoonCard key={i.label} icon={i.icon} label={i.label} />)}
      </div>
    </SettingsSection>
  );
}

/* ────────────────────────────────────────────────────────────
   6. BILLING (future)
   ──────────────────────────────────────────────────────────── */
function BillingSection() {
  return (
    <SettingsSection title="Billing" subtitle="Plan, payment, and invoices." badge="Future">
      <div className="flex flex-col gap-2">
        <ComingSoonCard icon={<Sparkles size={14} />} label="Subscription status" />
        <ComingSoonCard icon={<CreditCard size={14} />} label="Payment method" />
        <ComingSoonCard icon={<FileText size={14} />} label="Invoices" />
        <ComingSoonCard icon={<Sparkles size={14} />} label="Upgrade to Pro" />
      </div>
    </SettingsSection>
  );
}

/* ────────────────────────────────────────────────────────────
   7. ABOUT
   ──────────────────────────────────────────────────────────── */
function AboutSection() {
  return (
    <SettingsSection title="About">
      <SettingsRow label="Version">
        <span className="text-[11.5px] font-semibold text-slate-300">P1 Cockpit v1.0</span>
      </SettingsRow>
      <SettingsRow label="Release notes">
        <a className="flex items-center gap-1 text-[11.5px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer">
          View <ExternalLink size={11} />
        </a>
      </SettingsRow>
      <SettingsRow label="Contact support" last>
        <a className="flex items-center gap-1 text-[11.5px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer">
          <Mail size={11} /> Email us
        </a>
      </SettingsRow>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.15, ease: EASE }}
        className="mt-2 rounded-xl px-4 py-4 text-center"
        style={{
          background: "linear-gradient(150deg, rgba(99,102,241,0.1) 0%, rgba(99,102,241,0.02) 100%)",
          border: "1px solid rgba(99,102,241,0.18)",
        }}
      >
        <p className="text-[12px] font-bold text-indigo-300 mb-1.5 tracking-wide">Percentile.One</p>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          The world&rsquo;s first Life Management OS &mdash; built to help you organise your mind, master your habits, and design the life you were meant to live.
        </p>
      </motion.div>
    </SettingsSection>
  );
}
