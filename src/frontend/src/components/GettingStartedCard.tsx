import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { listQuestionBank } from '../api/questionBankApi';
import { listCertExams } from '../api/certExamApi';
import { profileApi } from '../api/profileApi';
import { HELP_VISITED_KEY } from '../help/articles';

// "Getting started" checklist on the candidate Dashboard (Francis, 2026-10-01). A tour nobody finishes is the wrong help — this gets a new
// candidate to the moments where the product proves itself. Steps tick themselves from what the candidate has really done (their own saved
// interviews / saved answers / mock exams / profile), so it is never a chore to maintain. Failures are silent: a step that can't be checked
// simply stays open.

const DISMISS_KEY = 'tic.gettingstarted.dismissed';
// The Learn page keeps a candidate's generated courses in this browser (see LearnPanel's STORAGE_KEY) — there is no server list to ask.
const LEARN_COURSES_KEY = 'im_learn_courses_v1';
const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

interface Step { key: string; label: string; hint: string; nav: string; done: boolean }

function readFlag(key: string): boolean { try { return localStorage.getItem(key) === '1'; } catch { return false; } }

function hasLearnCourse(): boolean {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(LEARN_COURSES_KEY) ?? '[]');
    return Array.isArray(parsed) && parsed.length > 0;
  } catch { return false; }
}

export function GettingStartedCard({ token, onNavigate }: { token: string | null; onNavigate: (label: string) => void }) {
  const [dismissed, setDismissed] = useState(() => readFlag(DISMISS_KEY));
  const [done, setDone] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    if (!token || dismissed) return;
    let cancelled = false;
    Promise.allSettled([
      fetch(`${API_BASE}/api/interviews`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => (res.ok ? (res.json() as Promise<unknown[]>) : Promise.reject(new Error(String(res.status))))),
      listQuestionBank(token),
      listCertExams(token),
      profileApi.getProfile(token),
    ]).then(([interviews, bank, exams, profile]) => {
      if (cancelled) return;
      const hasItems = (r: PromiseSettledResult<unknown[]>) => r.status === 'fulfilled' && Array.isArray(r.value) && r.value.length > 0;
      setDone({
        interview: hasItems(interviews),
        answer: hasItems(bank),
        exam: hasItems(exams),
        learn: hasLearnCourse(),
        profile: profile.status === 'fulfilled' && !!(profile.value.bio?.trim() || profile.value.dreamRoleTitle?.trim()),
        help: readFlag(HELP_VISITED_KEY),
      });
    });
    return () => { cancelled = true; };
  }, [token, dismissed]);

  if (dismissed || !done) return null;

  const steps: Step[] = [
    { key: 'interview', label: 'Do a practice interview and save it', hint: 'Finish one, choose "Save this interview", and it appears under Job Interviews.', nav: 'Job Interviews', done: done.interview },
    { key: 'answer', label: 'Save a model answer to your Question Bank', hint: 'In an interview, use "Tell Me The Answer", then "Save & Continue".', nav: 'Question Bank', done: done.answer },
    { key: 'learn', label: 'Build a Learn course', hint: 'Type any topic and get a complete course.', nav: 'Learn', done: done.learn },
    { key: 'exam', label: 'Try a mock exam', hint: 'Practice for a certification or test you are preparing for.', nav: 'Certifications & Exams', done: done.exam },
    { key: 'profile', label: 'Tell people about yourself', hint: 'Add a short bio or your dream role to your profile.', nav: 'My Profile', done: done.profile },
    { key: 'help', label: 'Look around the Help Centre', hint: 'Short answers, one task at a time.', nav: 'Help', done: done.help },
  ];
  const count = steps.filter(s => s.done).length;
  const allDone = count === steps.length;

  function dismiss() { try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ } setDismissed(true); }

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid rgba(52,211,153,0.28)', borderRadius: 14, padding: '18px 22px', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text)' }}>{allDone ? "You're all set 🎉" : 'Getting started'}</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>{allDone ? 'You have tried everything this portal is built around. Hide this whenever you like.' : `${count} of ${steps.length} done — a few quick wins that show what this portal is for.`}</div>
        </div>
        <button onClick={dismiss} aria-label="Hide getting started" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2, display: 'flex' }}><X size={16} /></button>
      </div>

      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)', marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(count / steps.length) * 100}%`, background: 'linear-gradient(90deg,#34D399,#047857)', borderRadius: 3, transition: 'width 0.3s' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map(s => (
          <button
            key={s.key}
            onClick={() => onNavigate(s.nav)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', width: '100%', padding: '10px 12px', borderRadius: 10, fontFamily: 'inherit', cursor: 'pointer',
              border: '1px solid var(--border)', background: s.done ? 'rgba(52,211,153,0.06)' : 'transparent' }}
          >
            <span style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `2px solid ${s.done ? '#34D399' : 'var(--border)'}`, background: s.done ? '#34D399' : 'transparent' }}>
              {s.done && <Check size={13} color="#04120c" strokeWidth={3} />}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: s.done ? 'var(--text-3)' : 'var(--text)', textDecoration: s.done ? 'line-through' : 'none' }}>{s.label}</span>
              {!s.done && <span style={{ display: 'block', fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{s.hint}</span>}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
