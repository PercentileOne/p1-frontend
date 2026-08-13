import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChairSpinner } from '../components/ChairSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import { ScoringDisplay } from '../components/ScoringDisplay';
import { ShareModal } from '../components/ShareModal';
import { SaveDecisionPanel } from '../components/SaveDecisionPanel';
import type { InterviewQuestion, ScoreResponse } from '../api/explainApi';
import type { TranscriptMeta } from '../components/VoiceInput';
import type { CVContext, JobSpecContext } from '../utils/contextBuilder';
import type { FeedbackOutcome } from '../utils/clientSession';
import { buildCandidateFeedbackUrl, type CandidateFeedbackSession } from '../utils/clientSession';
import { getRoleImprovementAreas } from '../utils/clientSession';
import { speak } from '../api/ttsApi';

interface SessionAnswer {
  question: InterviewQuestion;
  answerText: string;
  meta?: TranscriptMeta;
  score: ScoreResponse;
  answeredByVoice: boolean;
  thinkTimeMs?: number;
}

interface LearnLesson {
  subject: string;
  concept: string;
  keyPoints: string[];
  example: string;
  practiceQuestion: string;
  tip: string;
}

function avg(answers: SessionAnswer[], key: 'clarity' | 'relevance' | 'depth' | 'confidence') {
  if (!answers.length) return 0;
  return answers.reduce((s, a) => s + (a.score as unknown as Record<string, number>)[key], 0) / answers.length;
}

function overallAvg(answers: SessionAnswer[]) {
  if (!answers.length) return 0;
  return answers.reduce((s, a) => s + a.score.overallScore, 0) / answers.length;
}

function scoreColor(v: number) {
  if (v >= 0.7) return '#34D399';
  if (v >= 0.45) return '#F59E0B';
  return '#EF4444';
}

// ── Mini TalkToLearn engine ────────────────────────────────────────────────────

const AI_CHAT_URL = `${import.meta.env.VITE_EXPLAIN_API_URL ?? 'https://explain-api.azurewebsites.net'}/api/ai/chat`;

async function generateLesson(subject: string): Promise<LearnLesson> {
  const res = await fetch(AI_CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an expert interview coach creating a concise, practical lesson.
Return ONLY valid JSON — no markdown, no preamble.`,
        },
        {
          role: 'user',
          content: `Create a short, practical lesson on: "${subject}"

The lesson is for someone preparing for a job interview. Keep it focused, actionable, and easy to remember.

Return JSON:
{
  "subject": "${subject}",
  "concept": "One clear sentence defining what this is and why it matters in interviews",
  "keyPoints": ["3-4 short, punchy bullet points the candidate must know"],
  "example": "A concrete, vivid example showing this skill or concept in action (2-3 sentences)",
  "practiceQuestion": "One interview question the candidate should practice, directly testing this topic",
  "tip": "One insider tip that top candidates use when answering questions on this topic"
}`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = await res.json() as { choices: { message: { content: string } }[] };
  return JSON.parse(data.choices[0].message.content) as LearnLesson;
}

// ── Learn Tab component ────────────────────────────────────────────────────────

const SUGGESTED_TOPICS = [
  'STAR method', 'System Design basics', 'Stakeholder management',
  'Salary negotiation', 'Leadership under pressure', 'Behavioural interviews',
  'Technical communication', 'Problem-solving frameworks',
];

function LearnTab({
  recommendedTopic,
}: {
  recommendedTopic: string | null;
}) {
  const [subject, setSubject] = useState(recommendedTopic ?? '');
  const [lesson, setLesson] = useState<LearnLesson | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [learnEmail, setLearnEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const canUseAI = true;

  const learn = async () => {
    if (!subject.trim() || !canUseAI) return;
    setLoading(true);
    setError('');
    setLesson(null);
    try {
      const l = await generateLesson(subject.trim());
      setLesson(l);
    } catch {
      setError('Could not generate lesson. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      {/* Header card */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px 28px 24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' }}>
          <div style={{ fontSize: '32px', flexShrink: 0 }}>📚</div>
          <div>
            <div style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text)', marginBottom: '6px' }}>Learn any topic — instantly</div>
            <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.6 }}>
              {recommendedTopic
                ? <>Based on your session, we recommend starting with <strong style={{ color: 'var(--text)' }}>{recommendedTopic}</strong>. Enter it below or pick any topic.</>
                : 'Enter any subject and get a personalised lesson built for interview preparation.'}
            </div>
          </div>
        </div>

        {/* Input */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && learn()}
            placeholder="e.g. C# async/await, STAR method, System Design, Stakeholder management…"
            style={{
              flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px',
              padding: '12px 16px', color: 'var(--text)', fontSize: '14px', outline: 'none', fontFamily: 'inherit',
            }}
          />
          <button
            onClick={learn}
            disabled={!subject.trim() || loading || !canUseAI}
            style={{
              background: subject.trim() && !loading && canUseAI ? 'var(--blue)' : 'rgba(79,142,247,0.3)',
              color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 22px',
              fontSize: '13px', fontWeight: 700, cursor: subject.trim() && !loading && canUseAI ? 'pointer' : 'default',
              whiteSpace: 'nowrap', fontFamily: 'inherit',
            }}
          >
            {loading ? 'Building…' : 'Learn →'}
          </button>
        </div>

        {/* Suggested topics */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {SUGGESTED_TOPICS.map(t => (
            <button
              key={t}
              onClick={() => setSubject(t)}
              style={{
                fontSize: '11px', fontWeight: 600, background: subject === t ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${subject === t ? 'rgba(79,142,247,0.3)' : 'var(--border)'}`,
                color: subject === t ? 'var(--blue)' : 'var(--text-3)',
                borderRadius: '20px', padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {error && <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--red)' }}>{error}</div>}

        {!canUseAI && (
          <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--amber)', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', padding: '10px 14px' }}>
            AI key not configured — Learn requires an OpenAI key.
          </div>
        )}
      </div>

      {/* Loading */}
      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '32px', textAlign: 'center' }}>
            <ChairSpinner label={`Generating your lesson on ${subject}…`} size={100} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lesson */}
      <AnimatePresence>
        {lesson && !loading && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Concept */}
            <div style={{ background: 'linear-gradient(135deg, rgba(79,142,247,0.1) 0%, rgba(167,139,250,0.08) 100%)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: '14px', padding: '22px 24px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: '10px' }}>What is it?</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.6 }}>{lesson.concept}</div>
            </div>

            {/* Key points */}
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '22px 24px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '14px' }}>Key points to remember</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {lesson.keyPoints.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(79,142,247,0.15)', border: '1px solid rgba(79,142,247,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: 'var(--blue)', flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.55, paddingTop: '2px' }}>{p}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Example */}
            <div style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '14px', padding: '22px 24px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#34D399', marginBottom: '10px' }}>Real example</div>
              <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.65, fontStyle: 'italic' }}>{lesson.example}</div>
            </div>

            {/* Practice question */}
            <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '14px', padding: '22px 24px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: '10px' }}>Practice this question</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.55 }}>{lesson.practiceQuestion}</div>
            </div>

            {/* Insider tip */}
            <div style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '14px', padding: '18px 22px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '20px', flexShrink: 0 }}>💡</div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: '6px' }}>Insider tip</div>
                <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.6 }}>{lesson.tip}</div>
              </div>
            </div>

            {/* Learn another */}
            <div style={{ textAlign: 'center', paddingTop: '4px' }}>
              <button
                onClick={() => { setLesson(null); setSubject(''); }}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '9px', padding: '10px 24px', fontSize: '13px', color: 'var(--text-3)', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                ← Learn another topic
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Waitlist — shown when AI not configured */}
      {!canUseAI && !lesson && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '14px' }}>Get notified when Learn fully launches:</div>
          {!emailSent ? (
            <div style={{ display: 'flex', gap: '8px', maxWidth: '400px', margin: '0 auto' }}>
              <input type="email" value={learnEmail} onChange={e => setLearnEmail(e.target.value)}
                placeholder="your@email.com"
                style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '9px', padding: '11px 14px', color: 'var(--text)', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }} />
              <button onClick={() => { if (learnEmail.includes('@')) setEmailSent(true); }}
                disabled={!learnEmail.includes('@')}
                style={{ background: learnEmail.includes('@') ? 'var(--blue)' : 'rgba(79,142,247,0.3)', color: '#fff', border: 'none', borderRadius: '9px', padding: '11px 18px', fontSize: '13px', fontWeight: 700, cursor: learnEmail.includes('@') ? 'pointer' : 'default', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                Notify Me
              </button>
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: '#34D399', fontWeight: 600 }}>✓ You're on the list!</div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ── Send Feedback to Candidate Tab ────────────────────────────────────────────

const OUTCOME_OPTIONS: { value: FeedbackOutcome; label: string; sub: string; color: string; bg: string }[] = [
  { value: 'pass',      label: 'Pass',             sub: 'Candidate is being progressed',                        color: '#34D399', bg: 'rgba(52,211,153,0.08)' },
  { value: 'door-open', label: 'Leave Door Open',  sub: 'Not progressing now, may reconsider',                 color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
  { value: 'fail',      label: 'Not Progressing',  sub: 'Candidate will not be moved forward at this time',    color: '#F87171', bg: 'rgba(248,113,113,0.08)' },
];

function SendFeedbackTab({ cvCtx, jobCtx }: { cvCtx?: CVContext; jobCtx?: JobSpecContext }) {
  const [outcome, setOutcome]             = useState<FeedbackOutcome | null>(null);
  const [feedbackText, setFeedbackText]   = useState('');
  const [recruiterNotes, setRecruiterNotes] = useState('');
  const [recruiterName, setRecruiterName] = useState('');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [candidateUrl, setCandidateUrl]   = useState('');
  const [copied, setCopied]               = useState(false);

  const areaGroups = getRoleImprovementAreas(jobCtx?.title ?? '', jobCtx?.industry);

  function toggleArea(area: string) {
    setSelectedAreas(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]);
  }

  function generate() {
    if (!outcome || !feedbackText.trim()) return;
    const session: CandidateFeedbackSession = {
      version: 1,
      candidateName: cvCtx ? `${cvCtx.firstName} ${cvCtx.lastName ?? ''}`.trim() : 'Candidate',
      role: jobCtx?.title ?? 'the role',
      company: jobCtx?.company,
      outcome,
      feedbackText: feedbackText.trim(),
      improvementAreas: selectedAreas,
      recruiterName: recruiterName.trim() || undefined,
      recruiterNotes: recruiterNotes.trim() || undefined,
      generatedAt: Date.now(),
    };
    setCandidateUrl(buildCandidateFeedbackUrl(session));
    setCopied(false);
  }

  async function copy() {
    await navigator.clipboard.writeText(candidateUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const canGenerate = !!outcome && feedbackText.trim().length > 20;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      <div>
        <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>Send feedback to candidate</div>
        <div style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.6 }}>
          Paste in the client's feedback, select the outcome and improvement areas, then generate a private link for the candidate. The link includes personalised LEARN module recommendations.
        </div>
      </div>

      {/* Outcome */}
      <div>
        <Label text="1. Outcome" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {OUTCOME_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setOutcome(opt.value)}
              style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 16px', borderRadius: '10px', background: outcome === opt.value ? opt.bg : 'var(--bg2)', border: `1px solid ${outcome === opt.value ? opt.color + '50' : 'var(--border)'}`, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: outcome === opt.value ? opt.color : 'var(--border)', border: `2px solid ${outcome === opt.value ? opt.color : 'var(--border)'}`, transition: 'all 0.15s', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: outcome === opt.value ? opt.color : 'var(--text)', marginBottom: '1px' }}>{opt.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{opt.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Feedback text */}
      <div>
        <Label text="2. Paste client feedback" />
        <textarea
          value={feedbackText}
          onChange={e => setFeedbackText(e.target.value)}
          placeholder="Paste the AI-generated feedback from the client portal here, or write your own…"
          rows={6}
          style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px', color: 'var(--text)', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.65, outline: 'none' }}
        />
      </div>

      {/* Improvement areas */}
      <div>
        <Label text="3. Improvement areas (optional)" />
        <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '12px', lineHeight: 1.5 }}>
          Select the areas the client flagged. The candidate will see LEARN modules matched to these.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {areaGroups.map((group, gi) => (
            <div key={gi} style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
              {group.map(area => (
                <button key={area} onClick={() => toggleArea(area)}
                  style={{ padding: '6px 13px', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', background: selectedAreas.includes(area) ? 'rgba(79,142,247,0.12)' : 'var(--bg2)', border: `1px solid ${selectedAreas.includes(area) ? 'rgba(79,142,247,0.35)' : 'var(--border)'}`, color: selectedAreas.includes(area) ? '#4F8EF7' : 'var(--text-3)' }}>
                  {selectedAreas.includes(area) ? '✓ ' : ''}{area}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Recruiter fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div>
          <Label text="Your name (optional)" />
          <input value={recruiterName} onChange={e => setRecruiterName(e.target.value)} placeholder="e.g. Sarah at Percentile.One"
            style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '9px', padding: '11px 13px', color: 'var(--text)', fontSize: '13px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
        </div>
        <div>
          <Label text="Recruiter notes to candidate (optional)" />
          <input value={recruiterNotes} onChange={e => setRecruiterNotes(e.target.value)} placeholder="e.g. Keep an eye out for a similar role…"
            style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '9px', padding: '11px 13px', color: 'var(--text)', fontSize: '13px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
        </div>
      </div>

      {/* Generate */}
      <button onClick={generate} disabled={!canGenerate}
        style={{ background: canGenerate ? 'var(--blue)' : 'rgba(79,142,247,0.3)', color: '#fff', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '14px', fontWeight: 700, cursor: canGenerate ? 'pointer' : 'default', transition: 'background 0.2s' }}>
        Generate candidate feedback link →
      </button>

      {/* Result */}
      {candidateUrl && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Candidate Feedback Link
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-3)', fontFamily: 'monospace', wordBreak: 'break-all', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '7px', padding: '10px 12px' }}>
            {candidateUrl.slice(0, 90)}{candidateUrl.length > 90 ? '…' : ''}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={copy}
              style={{ flex: 1, padding: '11px', borderRadius: '9px', fontSize: '13px', fontWeight: 700, background: copied ? 'rgba(52,211,153,0.12)' : 'var(--blue)', border: copied ? '1px solid rgba(52,211,153,0.3)' : 'none', color: copied ? '#34D399' : '#fff', cursor: 'pointer', transition: 'all 0.2s' }}>
              {copied ? '✓ Copied' : 'Copy link'}
            </button>
            <a href={candidateUrl} target="_blank" rel="noreferrer"
              style={{ padding: '11px 18px', borderRadius: '9px', fontSize: '13px', fontWeight: 700, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              Preview ↗
            </a>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.55 }}>
            Send this link directly to the candidate. It includes their feedback, LEARN recommendations
            {outcome === 'door-open' ? ', and a Re-Interview Prep guide.' : '.'}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function Label({ text }: { text: string }) {
  return <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>{text}</div>;
}

// ── Interview Replay Player ────────────────────────────────────────────────────

interface Chapter {
  questionIndex: number;
  questionText: string;
  competency: string;
  offsetSeconds: number;
  isMcq?: boolean;
  mcqOrdinal?: number;
}

function InterviewReplayPlayer({ url, chapters }: { url: string; chapters: Chapter[] }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [activeChapter, setActiveChapter] = useState(0);
  const [isFs, setIsFs] = useState(false);
  useEffect(() => {
    const onFsChange = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);
  const toggleFs = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  };

  // Blob is revoked by the parent page on unmount — don't revoke here or it breaks on tab switch

  const jumpTo = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
      setPlaying(true);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else { videoRef.current.play(); setPlaying(true); }
  };

  const onTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTime(t);
    // Update active chapter
    let active = 0;
    for (let i = 0; i < chapters.length; i++) {
      if (t >= chapters[i].offsetSeconds) active = i;
    }
    setActiveChapter(active);
  };

  const fmt = (s: number) => isFinite(s) && s >= 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '--:--';
  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div ref={containerRef} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
      {/* Video */}
      <div style={{ position: 'relative', background: '#000', aspectRatio: '16/9' }}>
        <video
          ref={videoRef}
          src={url}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={() => { const d = videoRef.current?.duration; if (d && isFinite(d)) setDuration(d); }}
          onDurationChange={() => { const d = videoRef.current?.duration; if (d && isFinite(d)) setDuration(d); }}
          onEnded={() => setPlaying(false)}
          playsInline
          disablePictureInPicture
          controlsList="nodownload nofullscreen noremoteplayback"
        />
        {/* Fullscreen button — bottom right of video */}
        <button onClick={toggleFs} title={isFs ? 'Exit fullscreen' : 'Fullscreen'}
          style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '7px', padding: '6px 8px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', backdropFilter: 'blur(4px)', transition: 'all 0.2s', zIndex: 10 }}>
          {isFs ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/>
            </svg>
          )}
        </button>
        {/* Play overlay when paused */}
        {!playing && (
          <button
            onClick={togglePlay}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              background: 'rgba(0,0,0,0.35)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'rgba(79,142,247,0.9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 32px rgba(79,142,247,0.5)',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>
            </div>
          </button>
        )}
      </div>

      {/* Controls */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        {/* Progress bar */}
        <div
          style={{ height: '4px', background: 'var(--bg3)', borderRadius: '2px', cursor: 'pointer', marginBottom: '10px', position: 'relative' }}
          onClick={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            if (videoRef.current) videoRef.current.currentTime = pct * duration;
          }}
        >
          <div style={{ width: `${progress * 100}%`, height: '100%', background: 'var(--blue)', borderRadius: '2px', transition: 'width 0.1s linear' }} />
          {/* Chapter tick marks */}
          {chapters.map((c, i) => (
            <div key={i} style={{
              position: 'absolute', top: '-2px', left: `${(c.offsetSeconds / duration) * 100}%`,
              width: '2px', height: '8px', borderRadius: '1px', transform: 'translateX(-50%)',
              background: c.isMcq ? '#f59e0b' : '#a78bfa',
            }} />
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={togglePlay} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', padding: 0, display: 'flex', alignItems: 'center' }}>
            {playing
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            }
          </button>
          <span style={{ fontSize: '12px', color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>{fmt(currentTime)} / {fmt(duration)}</span>
        </div>
      </div>

      {/* Chapter markers */}
      {chapters.length > 0 && (
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '4px' }}>
            Jump to question
          </div>
          {chapters.map((c, i) => {
            const isMcq = c.isMcq;
            const isActive = activeChapter === i;
            const activeBg = isMcq ? 'rgba(245,158,11,0.10)' : 'rgba(79,142,247,0.10)';
            const activeBorder = isMcq ? '1px solid rgba(245,158,11,0.30)' : '1px solid rgba(79,142,247,0.25)';
            const badgeColor = isMcq ? '#f59e0b' : (isActive ? 'var(--blue)' : '#a78bfa');
            const badgeBg = isMcq ? 'rgba(245,158,11,0.12)' : (isActive ? 'rgba(79,142,247,0.12)' : 'rgba(167,139,250,0.08)');
            const dotColor = isMcq ? '#f59e0b' : 'var(--blue)';
            return (
              <button
                key={i}
                onClick={() => jumpTo(c.offsetSeconds)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  background: isActive ? activeBg : 'transparent',
                  border: isActive ? activeBorder : '1px solid transparent',
                  borderRadius: '8px', padding: '8px 10px', cursor: 'pointer',
                  textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 700, color: isActive ? (isMcq ? '#f59e0b' : 'var(--blue)') : 'var(--text-3)', minWidth: '38px', fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(c.offsetSeconds)}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: badgeColor, background: badgeBg, borderRadius: '4px', padding: '2px 7px', flexShrink: 0 }}>
                  {isMcq ? `MCQ-${c.mcqOrdinal}` : `Q${c.questionIndex + 1}`}
                </span>
                <span style={{ fontSize: '12px', color: isActive ? 'var(--text)' : 'var(--text-2)', lineHeight: 1.4, flex: 1 }}>
                  {c.questionText}
                </span>
                {isActive && (
                  <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}
                    style={{ width: '6px', height: '6px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

type Tab = 'interview' | 'learn' | 'feedback' | 'coming-soon';

export default function InterviewSummary() {
  const location = useLocation();
  const navigate = useNavigate();
  const answers: SessionAnswer[] = location.state?.answers ?? [];
  const cvCtx: CVContext | undefined = location.state?.cvCtx;
  const jobCtx: JobSpecContext | undefined = location.state?.jobCtx;
  const mcqQuestions: Array<{ questionText: string; options: string[]; correctIndex: number; explanation: string }> = location.state?.mcqQuestions ?? [];
  const mcqResults: Array<{ correct: boolean; selectedIndex: number; questionIndex: number }> = location.state?.mcqResults ?? [];
  const mcqBonusPoints: number = location.state?.mcqBonusPoints ?? 0;
  const playbackUrl: string | null = location.state?.playbackUrl ?? null;
  const chapters: { questionIndex: number; questionText: string; competency: string; offsetSeconds: number }[] = location.state?.chapters ?? [];
  const interviewId: string | undefined = location.state?.interviewId;
  const candidateId: string | undefined = location.state?.candidateId;
  // Revoke blob URL only when the whole summary page unmounts
  useEffect(() => { return () => { if (playbackUrl) URL.revokeObjectURL(playbackUrl); }; }, []);
  const [activeTab, setActiveTab] = useState<Tab>('interview');
  const [showShare, setShowShare] = useState(false);
  const [savedShareToken, setSavedShareToken] = useState<string | null>(null);
  const [savedShareUrl, setSavedShareUrl] = useState<string | null>(null);

  const overall = overallAvg(answers);
  const strengths = (['clarity', 'relevance', 'depth', 'confidence'] as const).filter(d => avg(answers, d) >= 0.65);
  const improvements = (['clarity', 'relevance', 'depth', 'confidence'] as const).filter(d => avg(answers, d) < 0.55);

  // Find the weakest competency tag across all questions
  const tagScores: Record<string, { total: number; count: number }> = {};
  for (const a of answers) {
    for (const tag of a.question.competencyTags) {
      if (!tagScores[tag]) tagScores[tag] = { total: 0, count: 0 };
      tagScores[tag].total += a.score.overallScore;
      tagScores[tag].count += 1;
    }
  }
  const weakestTag = Object.entries(tagScores)
    .map(([tag, { total, count }]) => ({ tag, avg: total / count }))
    .sort((a, b) => a.avg - b.avg)[0]?.tag ?? null;

  const showLearnBanner = overall < 0.70 && weakestTag;

  // ── Mike's verbal debrief ────────────────────────────────────────────────────
  const mikeSpokeRef = useRef(false);
  const [mikeActive, setMikeActive] = useState(false);

  const buildMikeScript = useCallback(() => {
    const name = cvCtx?.firstName ?? 'there';
    const pct = Math.round(overall * 100);
    const strongLabel = strengths[0] ?? null;
    const weakLabel = improvements[0] ?? null;
    const learnTopic = weakestTag ?? weakLabel ?? 'your interview technique';

    let opening = `Hi ${name}, it's Mike here — I've just had a word with Sarah and James, and they wanted me to share some feedback with you.`;

    let scoreComment = '';
    if (pct >= 85) scoreComment = `First of all, brilliant session — you scored ${pct} percent overall. That's genuinely impressive.`;
    else if (pct >= 65) scoreComment = `You scored ${pct} percent overall — a solid performance, and there's real potential here.`;
    else scoreComment = `You scored ${pct} percent overall. It's a start, and with a bit of focused practice, you'll see that number climb quickly.`;

    let strengthComment = strongLabel
      ? `Sarah particularly noticed your ${strongLabel} — she said it came across really well.`
      : '';

    let improvementComment = '';
    if (weakLabel) {
      improvementComment = pct < 100
        ? `One area to focus on is ${weakLabel} — if you can sharpen that up, it'll make a real difference.`
        : '';
    }

    let learnPitch = pct < 100
      ? `The good news is, our Learn platform has a lesson on ${learnTopic} ready to go right now — just head over to the Learn tab and hit Generate. It'll walk you through exactly what you need. I'd really recommend it.`
      : `You nailed it across the board — honestly, you should be very proud of that session.`;

    const closing = `Good luck ${name}, and remember — every session makes you sharper. Speak soon.`;

    return [opening, scoreComment, strengthComment, improvementComment, learnPitch, closing]
      .filter(Boolean).join(' ');
  }, [cvCtx, overall, strengths, improvements, weakestTag]);

  useEffect(() => {
    if (mikeSpokeRef.current) return;
    mikeSpokeRef.current = true;
    if (!answers.length) return;
    const delay = setTimeout(() => {
      setMikeActive(true);
      const script = buildMikeScript();
      speak(script, 'mike', () => setMikeActive(false));
    }, 1400);
    return () => clearTimeout(delay);
  }, []);

  // Build per-question LEARN recommendation (only for low-scoring answers)
  const learnRecsPerQuestion = answers.map(a => {
    if (a.score.overallScore >= 0.65 || !a.question.competencyTags.length) return null;
    const tag = a.question.competencyTags[0];
    const pct = Math.round(a.score.overallScore * 100);
    return { tag, pct };
  });


  const downloadPdf = () => {
    const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const questionsHtml = answers.map((a, i) => `
      <div class="section">
        <div class="q-num">Q${i + 1} · ${a.question.questionType} · ${a.question.difficulty}</div>
        <div class="q-text">${a.question.questionText}</div>
        <div class="label">Your Answer ${a.answeredByVoice ? '(Voice)' : '(Typed)'}</div>
        <div class="answer">${a.answerText || '(No answer recorded)'}</div>
        ${a.thinkTimeMs ? `<div class="label">Think time</div><div class="answer">${Math.round(a.thinkTimeMs / 1000)}s before answering</div>` : ''}
        <div class="label">Scores</div>
        <div class="scores">
          Relevance: ${Math.round(a.score.relevance * 100)}% &nbsp;|&nbsp;
          Clarity: ${Math.round(a.score.clarity * 100)}% &nbsp;|&nbsp;
          Depth: ${Math.round(a.score.depth * 100)}% &nbsp;|&nbsp;
          Confidence: ${Math.round(a.score.confidence * 100)}% &nbsp;|&nbsp;
          <strong>Overall: ${Math.round(a.score.overallScore * 100)}%</strong>
        </div>
        ${a.score.feedback.filter(f => f.severity !== 'low').map(f => `<div class="feedback">• ${f.message}</div>`).join('')}
      </div>
    `).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Interview Summary — Explain AI</title>
<style>
  @page { margin: 24mm 20mm; }
  body { font-family: -apple-system,'Segoe UI',Arial,sans-serif; color:#1a1a2e; font-size:13px; line-height:1.6; }
  .header { border-bottom:2px solid #1B3A6B; padding-bottom:14px; margin-bottom:28px; }
  .brand { font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#4F8EF7; margin-bottom:6px; }
  h1 { font-size:22px; font-weight:800; color:#1B3A6B; margin:0 0 4px; }
  .meta { font-size:11px; color:#888; }
  .overall { font-size:36px; font-weight:900; color:#1B3A6B; margin:16px 0 4px; }
  .section { border:1px solid #e0e0e0; border-radius:8px; padding:16px 18px; margin-bottom:20px; page-break-inside:avoid; }
  .q-num { font-size:10px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#888; margin-bottom:6px; }
  .q-text { font-size:14px; font-weight:700; color:#1a1a2e; margin-bottom:12px; }
  .label { font-size:10px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#999; margin:10px 0 4px; }
  .answer { font-size:12px; color:#444; line-height:1.65; background:#f8f9fa; padding:10px; border-radius:6px; }
  .scores { font-size:12px; color:#444; }
  .feedback { font-size:12px; color:#666; margin-top:6px; }
  .footer { margin-top:32px; padding-top:12px; border-top:1px solid #eee; font-size:10px; color:#aaa; text-align:center; }
</style></head><body>
<div class="header">
  <div class="brand">Explain AI · Interview Summary</div>
  <h1>Interview Practice Session</h1>
  <div class="meta">${date} · ${answers.length} questions${cvCtx?.firstName ? ` · ${cvCtx.firstName} ${cvCtx.lastName ?? ''}`.trim() : ''}${jobCtx?.title ? ` · ${jobCtx.title}` : ''}</div>
  <div class="overall">${Math.round(overall * 100)}<span style="font-size:16px;color:#888">/100</span></div>
  <div class="meta">Overall average score</div>
</div>
${questionsHtml}
<div class="footer">Generated by Explain AI · explain.global · For interview preparation only</div>
</body></html>`;

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: 'interview', label: '🎤 Interview Room' },
    { id: 'learn', label: '📚 Learn' },
    { id: 'coming-soon', label: '⚡ Coming Soon' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: '-apple-system,"Segoe UI",sans-serif', paddingBottom: '60px' }}>

      {/* Header */}
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: '4px' }}>Explain · Interview Summary</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>Session Complete</div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setShowShare(true)} disabled={!savedShareToken} title={savedShareToken ? undefined : 'Save your interview first'} style={{ background: savedShareToken ? 'linear-gradient(135deg, #a78bfa, #4F8EF7)' : 'rgba(167,139,250,0.2)', color: savedShareToken ? '#fff' : 'rgba(255,255,255,0.3)', border: 'none', borderRadius: '9px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, cursor: savedShareToken ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: '7px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Share
          </button>
          <button onClick={downloadPdf} style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '9px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
            Download PDF
          </button>
          <button onClick={() => navigate('/interview-room/demo')} style={{ background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '9px', padding: '10px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            Try Again
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '0 28px' }}>
        <div style={{ display: 'flex', gap: '0', maxWidth: '840px', margin: '0 auto' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '14px 20px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: 700, fontFamily: 'inherit',
                color: activeTab === tab.id ? 'var(--blue)' : 'var(--text-3)',
                borderBottom: activeTab === tab.id ? '2px solid var(--blue)' : '2px solid transparent',
                marginBottom: '-1px', transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Mike Debrief Banner ── */}
      <AnimatePresence>
        {mikeActive && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
            style={{
              background: 'linear-gradient(135deg, rgba(52,211,153,0.08), rgba(79,142,247,0.06))',
              borderBottom: '1px solid rgba(52,211,153,0.2)',
              padding: '16px 28px',
            }}
          >
            <div style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '14px' }}>
              {/* Mike avatar with pulse ring */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #34d399, #4F8EF7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px', fontWeight: 800, color: '#fff', position: 'relative', zIndex: 1,
                }}>M</div>
                <div style={{
                  position: 'absolute', inset: -4, borderRadius: '50%',
                  border: '2px solid rgba(52,211,153,0.5)',
                  animation: 'mike-pulse 1.4s ease-in-out infinite',
                }} />
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#34d399', marginBottom: '2px' }}>Mike · Your Agent</div>
                <div style={{ fontSize: '13px', color: 'var(--text-2)' }}>Listening to your debrief…</div>
              </div>
              {/* Speaking bars */}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '3px', alignItems: 'flex-end', height: '20px' }}>
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} style={{
                    width: 3, borderRadius: 2, background: '#34d399',
                    height: '40%', animation: `mike-bar 0.9s ease-in-out ${i * 0.15}s infinite alternate`,
                  }} />
                ))}
              </div>
            </div>
            <style>{`
              @keyframes mike-pulse { 0%,100%{transform:scale(1);opacity:0.6} 50%{transform:scale(1.25);opacity:0} }
              @keyframes mike-bar { from{height:20%} to{height:90%} }
            `}</style>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ maxWidth: '840px', margin: '0 auto', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* ── INTERVIEW TAB ── */}
        {activeTab === 'interview' && (
          <>
            {/* ── Save / QR / Share decision flow ── */}
            <SaveDecisionPanel
              score={Math.round(overall * 100)}
              role={jobCtx?.title}
              company={jobCtx?.company}
              candidateId={candidateId}
              interviewId={interviewId}
              onSaved={(token, url) => {
                setSavedShareToken(token);
                setSavedShareUrl(url);
              }}
            />

            {/* Instant replay player */}
            {playbackUrl && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '10px' }}>
                  🎬 Your Interview Replay
                </div>
                <InterviewReplayPlayer url={playbackUrl} chapters={chapters} />
              </motion.div>
            )}

            {/* Cross-sell banner */}
            {showLearnBanner && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                style={{ background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--blue)' }}>📚 LEARN:</strong> Your lowest-scoring area was <strong style={{ color: 'var(--text)' }}>{weakestTag}</strong> ({Math.round(tagScores[weakestTag!]!.total / tagScores[weakestTag!]!.count * 100)}%). Top candidates score 90%+. Use <strong>Learn</strong> to study this free.
                </div>
                <button onClick={() => setActiveTab('learn')}
                  style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Study Now →
                </button>
              </motion.div>
            )}

            {/* Overall score card */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', display: 'flex', gap: '32px', alignItems: 'center' }}>
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: '56px', fontWeight: 900, color: scoreColor(overall), letterSpacing: '-0.04em', lineHeight: 1 }}>{Math.round(overall * 100)}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '4px' }}>Overall Score</div>
                {mcqBonusPoints > 0 && (
                  <div style={{ fontSize: '12px', color: '#34D399', fontWeight: 700, marginTop: '4px' }}>+{mcqBonusPoints} MCQ bonus</div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                {strengths.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#34D399', marginBottom: '6px' }}>Strengths</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {strengths.map(s => <span key={s} style={{ fontSize: '12px', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '6px', padding: '3px 10px', color: '#34D399', fontWeight: 600, textTransform: 'capitalize' }}>{s}</span>)}
                    </div>
                  </div>
                )}
                {improvements.length > 0 && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: '6px' }}>Focus Areas</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {improvements.map(s => <span key={s} style={{ fontSize: '12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '6px', padding: '3px 10px', color: 'var(--amber)', fontWeight: 600, textTransform: 'capitalize' }}>{s}</span>)}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* MCQ Bonus Round cards — one per fired MCQ */}
            {mcqQuestions.map((mcqQ, mcqIdx) => {
              const mcqResult = mcqResults[mcqIdx];
              if (!mcqResult) return null;
              const bonusPts = mcqResult.correct ? 10 : 0;
              return (
                <motion.div key={mcqIdx} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + mcqIdx * 0.08 }}
                  style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.08) 0%, rgba(124,58,237,0.06) 100%)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: '16px', overflow: 'hidden' }}>
                  <div style={{ padding: '16px 22px', borderBottom: '1px solid rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '18px' }}>⚡</span>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#a78bfa' }}>Bonus Round {mcqQuestions.length > 1 ? mcqIdx + 1 : ''}</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>Multiple Choice Question</div>
                      </div>
                    </div>
                    {mcqResult.correct
                      ? <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '10px', padding: '6px 14px' }}>
                          <span style={{ fontSize: '15px' }}>🏆</span>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: '#34D399' }}>+{bonusPts} pts</span>
                        </div>
                      : <div style={{ fontSize: '12px', color: 'var(--text-3)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '8px', padding: '5px 12px' }}>No bonus</div>
                    }
                  </div>
                  <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.5 }}>{mcqQ.questionText}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {mcqQ.options.map((opt, i) => {
                        const isCorrect = i === mcqQ.correctIndex;
                        const isSelected = i === mcqResult.selectedIndex;
                        const bg = isCorrect ? 'rgba(52,211,153,0.10)' : isSelected && !isCorrect ? 'rgba(239,68,68,0.08)' : 'transparent';
                        const border = isCorrect ? '1px solid rgba(52,211,153,0.35)' : isSelected && !isCorrect ? '1px solid rgba(239,68,68,0.3)' : '1px solid var(--border)';
                        const labelColor = isCorrect ? '#34D399' : isSelected && !isCorrect ? '#EF4444' : 'var(--text-3)';
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px', background: bg, border }}>
                            <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: isCorrect ? 'rgba(52,211,153,0.15)' : isSelected && !isCorrect ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: labelColor, flexShrink: 0 }}>
                              {isCorrect ? '✓' : isSelected ? '✗' : ['A','B','C','D'][i]}
                            </div>
                            <span style={{ fontSize: '13px', color: isCorrect ? '#f1f5f9' : isSelected && !isCorrect ? 'rgba(240,244,255,0.5)' : 'var(--text-2)', flex: 1 }}>{opt}</span>
                            {isSelected && <span style={{ fontSize: '11px', fontWeight: 700, color: labelColor }}>{mcqResult.correct ? 'Your answer ✓' : 'Your answer'}</span>}
                            {isCorrect && !mcqResult.correct && <span style={{ fontSize: '11px', fontWeight: 700, color: '#34D399' }}>Correct answer</span>}
                          </div>
                        );
                      })}
                    </div>
                    {!mcqResult.correct && (
                      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '6px' }}>Why the correct answer</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.6 }}>{mcqQ.explanation}</div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* Per-question breakdown */}
            {answers.map((a, i) => {
              const rec = learnRecsPerQuestion[i];
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
                  <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: '4px', padding: '2px 8px', color: 'var(--blue)' }}>Q{i + 1}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-3)', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', padding: '2px 8px' }}>{a.question.questionType}</span>
                      {a.answeredByVoice && <span style={{ fontSize: '11px', color: '#34D399', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: '4px', padding: '2px 8px' }}>🎤 Voice</span>}
                      {!a.answerText && <span style={{ fontSize: '11px', color: 'var(--red)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '4px', padding: '2px 8px' }}>Passed</span>}
                      {a.thinkTimeMs !== undefined && (
                        <span style={{ fontSize: '11px', color: a.thinkTimeMs > 30000 ? 'var(--amber)' : 'var(--text-3)', background: 'rgba(0,0,0,0.15)', borderRadius: '4px', padding: '2px 8px' }}>
                          Think time: {Math.round(a.thinkTimeMs / 1000)}s
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{a.question.questionText}</div>
                  </div>
                  <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '8px' }}>Your Answer</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.65, background: 'var(--bg3)', borderRadius: '8px', padding: '12px 14px' }}>
                        {a.answerText || <em style={{ color: 'var(--text-3)' }}>No answer recorded</em>}
                      </div>
                      {a.meta && (
                        <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Pace: <strong style={{ color: 'var(--text-2)' }}>{a.meta.paceWPM} WPM</strong></span>
                          {a.meta.fillerWords.length > 0 && <span style={{ fontSize: '11px', color: 'var(--amber)' }}>Fillers: {a.meta.fillerWords.join(', ')}</span>}
                        </div>
                      )}
                    </div>
                    <ScoringDisplay score={a.score} compact />

                    {/* Per-question LEARN recommendation */}
                    {rec && (
                      <div style={{ background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.15)', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.5 }}>
                          You scored <strong style={{ color: scoreColor(a.score.overallScore) }}>{rec.pct}%</strong> on <strong>{rec.tag}</strong>. Top candidates score 90%+.{' '}
                          <span style={{ color: 'var(--blue)' }}>Use LEARN to study this free.</span>
                        </div>
                        <button
                          onClick={() => { setActiveTab('learn'); }}
                          style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '7px', padding: '7px 14px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'inherit' }}
                        >
                          Study {rec.tag} →
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {answers.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '48px 0' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎤</div>
                <div>No answers recorded in this session.</div>
                <button onClick={() => navigate('/interview-room/demo')} style={{ marginTop: '20px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '9px', padding: '12px 28px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                  Start an Interview
                </button>
              </div>
            )}
          </>
        )}

        {/* ── LEARN TAB ── */}
        {activeTab === 'learn' && (
          <LearnTab
            recommendedTopic={weakestTag}
          />
        )}

        {/* ── FEEDBACK TAB ── */}
        {activeTab === 'feedback' && (
          <SendFeedbackTab cvCtx={cvCtx} jobCtx={jobCtx} />
        )}

        {/* ── COMING SOON TAB ── */}
        {activeTab === 'coming-soon' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px 32px', textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚡</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', marginBottom: '10px' }}>More coming soon</div>
              <div style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.65, maxWidth: '420px', margin: '0 auto 28px' }}>
                We're building visa interview prep, court preparation, driving theory, and more — because Explain isn't just for job interviews.
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {['Visa Interviews', 'Driving Theory', 'Citizenship Tests', 'Court Preparation', 'Academic Admissions', 'Assessment Centres'].map(s => (
                  <span key={s} style={{ fontSize: '12px', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '20px', padding: '5px 14px', color: '#a78bfa', fontWeight: 600 }}>{s}</span>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>Product Roadmap</div>
              {[
                { q: 'Q3 2025', items: ['AI video interviewer (D-ID integration)', 'ElevenLabs voice upgrades', 'Interview pack sharing'] },
                { q: 'Q4 2025', items: ['Visa interview module', 'Academic admissions prep', 'Team practice sessions'] },
                { q: '2026', items: ['Mobile app (iOS + Android)', 'Employer dashboard', 'Industry-specific packs'] },
              ].map(r => (
                <div key={r.q} style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--blue)', background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: '6px', padding: '3px 10px', whiteSpace: 'nowrap', height: 'fit-content', marginTop: '2px' }}>{r.q}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {r.items.map(item => (
                      <div key={item} style={{ fontSize: '13px', color: 'var(--text-2)' }}>• {item}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </div>

      {/* Share modal */}
      {showShare && (
        <ShareModal
          role={jobCtx?.title}
          company={jobCtx?.company}
          score={Math.round(overall * 100)}
          shareUrl={savedShareUrl ?? `https://candidate.explain.global/shared/${savedShareToken}`}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
