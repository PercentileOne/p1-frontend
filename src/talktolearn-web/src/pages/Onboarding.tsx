import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const TITLES = ['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Prof', 'Rev']

const JOB_ROLES = [
  'Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full-Stack Developer',
  'DevOps / Platform Engineer', 'Data Engineer', 'Data Scientist', 'ML Engineer',
  'Solutions Architect', 'Cloud Engineer', 'Product Manager', 'UX / UI Designer',
  'NHS Clinical Staff', 'NHS Manager', 'Healthcare Professional',
  'Student', 'Graduate', 'Career Changer', 'Founder / Entrepreneur', 'Other',
]

const INTERESTS: Record<string, string[]> = {
  'Software & Architecture': ['Software Architecture', 'System Design', 'Clean Architecture', 'TDD', 'DDD', 'CQRS', 'Microservices'],
  'Languages & Frameworks': ['C#', '.NET', 'Python', 'TypeScript', 'React', 'Node.js', 'Go', 'Rust'],
  'Cloud & DevOps': ['Azure', 'AWS', 'Kubernetes', 'Docker', 'Terraform', 'CI/CD'],
  'Data & AI': ['Machine Learning', 'LLMs', 'Prompt Engineering', 'SQL', 'NoSQL', 'AI Agents'],
  'Cloud Certifications': ['AZ-900', 'AZ-104', 'AZ-204', 'AWS Solutions Architect', 'Google Cloud ACE'],
  'Business & Leadership': ['Product Management', 'Agile', 'OKRs', 'Leadership', 'Strategy'],
  'Healthcare': ['Clinical Communication', 'Patient Safety', 'NHS Leadership', 'OSCE Preparation'],
}

const ROLE_DEFAULTS: Record<string, string[]> = {
  'Software Engineer':      ['Software Architecture', 'System Design', 'Clean Architecture', 'TDD'],
  'Solutions Architect':    ['System Design', 'Microservices', 'DDD', 'Azure', 'AWS'],
  'Cloud Engineer':         ['Azure', 'AWS', 'Kubernetes', 'Terraform', 'CI/CD'],
  'Data Scientist':         ['Machine Learning', 'Python', 'SQL', 'LLMs'],
  'Product Manager':        ['Product Management', 'Agile', 'OKRs', 'Strategy'],
  'Student':                ['Software Architecture', 'System Design', 'AWS Solutions Architect', 'Python'],
  'NHS Clinical Staff':     ['Clinical Communication', 'Patient Safety', 'OSCE Preparation'],
  'Founder / Entrepreneur': ['Strategy', 'Leadership', 'Product Management', 'OKRs'],
}

const STEPS = ['Welcome', 'Your Name', 'Your Role', 'Your Interests']

export default function OnboardingPage() {
  const navigate              = useNavigate()
  const [step, setStep]       = useState(0)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [title, setTitle]     = useState('')
  const [firstName, setFirst] = useState('')
  const [lastName, setLast]   = useState('')
  const [jobRole, setRole]    = useState('')
  const [interests, setInterests] = useState<string[]>([])

  const toggleInterest = (i: string) =>
    setInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])

  const handleRoleSelect = (role: string) => {
    setRole(role)
    setInterests(ROLE_DEFAULTS[role] ?? [])
  }

  const canNext = () => {
    if (step === 1) return firstName.trim().length > 0 && lastName.trim().length > 0
    if (step === 2) return jobRole !== ''
    return true
  }

  const handleFinish = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: `${firstName} ${lastName}`.trim(),
          title: title || undefined,
          jobRole: jobRole || undefined,
          interests,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      navigate('/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(79,142,247,0.12) 0%, #0A0F1C 70%)' }}>
      <div className="w-full max-w-lg">

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1 h-1 rounded-full overflow-hidden bg-white/10">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: i <= step ? '100%' : '0%', background: '#4F8EF7' }} />
            </div>
          ))}
        </div>

        <div className="p-8 rounded-2xl border border-white/10 bg-white/[0.03]">

          {step === 0 && (
            <div className="text-center">
              <div className="text-5xl mb-4">🎙️</div>
              <h1 className="text-2xl font-extrabold mb-3">Welcome to TalkToLearn</h1>
              <p className="text-white/50 text-sm leading-relaxed mb-6">
                Let's set up your profile so TalkToLearn can personalise your lessons.
                Takes about 60 seconds.
              </p>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-xl font-extrabold mb-1">What's your name?</h2>
              <p className="text-white/40 text-sm mb-5">How you'll appear on your profile and talks.</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {TITLES.map(t => (
                  <button key={t} onClick={() => setTitle(title === t ? '' : t)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${title === t ? 'bg-[#4F8EF7]/20 border-[#4F8EF7] text-[#4F8EF7]' : 'border-white/10 text-white/50 hover:border-white/30'}`}>
                    {t}
                  </button>
                ))}
              </div>
              <input type="text" value={firstName} onChange={e => setFirst(e.target.value)}
                placeholder="First name"
                className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm outline-none focus:border-[#4F8EF7] transition-colors mb-3" />
              <input type="text" value={lastName} onChange={e => setLast(e.target.value)}
                placeholder="Last name"
                className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm outline-none focus:border-[#4F8EF7] transition-colors" />
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-xl font-extrabold mb-1">What best describes you?</h2>
              <p className="text-white/40 text-sm mb-5">We'll suggest relevant lessons for your role.</p>
              <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto pr-1">
                {JOB_ROLES.map(role => (
                  <button key={role} onClick={() => handleRoleSelect(role)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium border transition-all ${jobRole === role ? 'bg-[#4F8EF7]/15 border-[#4F8EF7] text-white' : 'border-white/10 text-white/60 hover:border-white/30 hover:text-white'}`}>
                    {role}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-xl font-extrabold mb-1">What do you want to learn?</h2>
              <p className="text-white/40 text-sm mb-4">
                Suggested from your role. <span className="text-[#4F8EF7]">{interests.length} selected</span>
              </p>
              <div className="max-h-96 overflow-y-auto pr-1 space-y-4">
                {Object.entries(INTERESTS).map(([cat, items]) => (
                  <div key={cat}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">{cat}</p>
                    <div className="flex flex-wrap gap-2">
                      {items.map(item => (
                        <button key={item} onClick={() => toggleInterest(item)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${interests.includes(item) ? 'bg-[#4F8EF7]/20 border-[#4F8EF7] text-[#4F8EF7]' : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white'}`}>
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-red-400 text-xs mt-4">{error}</p>}

          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)}
                className="flex-1 py-3 rounded-xl font-bold text-sm border border-white/10 text-white/60 hover:bg-white/[0.05] transition-all">
                Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-white disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#1E4DD8,#4F8EF7)', boxShadow: '0 4px 18px rgba(30,77,216,0.4)' }}>
                Continue
              </button>
            ) : (
              <button onClick={handleFinish} disabled={saving}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-white disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#1E4DD8,#4F8EF7)', boxShadow: '0 4px 18px rgba(30,77,216,0.4)' }}>
                {saving ? 'Saving…' : "Let's Go! 🚀"}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-white/20 text-xs mt-4">
          Step {step + 1} of {STEPS.length} — {STEPS[step]}
        </p>
      </div>
    </div>
  )
}
