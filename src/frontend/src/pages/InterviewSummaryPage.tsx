import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { ScoreResponse, InterviewQuestion } from '../api/explainApi';
import type { CVContext, JobSpecContext } from '../utils/contextBuilder';
import type { MCQQuestion } from '../api/aiScoring';
import { saveWeakTopics } from '../api/learnApi';

interface SessionAnswer {
  question: InterviewQuestion;
  answerText: string;
  score: ScoreResponse;
  answeredByVoice: boolean;
  thinkTimeMs?: number;
}

interface SummaryState {
  answers?: SessionAnswer[];
  cvCtx?: CVContext;
  jobCtx?: JobSpecContext;
  mcqResults?: Array<{ correct: boolean; selectedIndex: number; questionIndex: number }>;
  mcqQuestions?: MCQQuestion[];
  mcqBonusPoints?: number;
  playbackUrl?: string | null;
  chapters?: Array<{ questionIndex: number; questionText: string; competency: string; offsetSeconds: number }>;
}

export default function InterviewSummaryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? {}) as SummaryState;
  const answers = state.answers ?? [];
  const mcqBonusPoints = state.mcqBonusPoints ?? 0;
  const playbackUrl = state.playbackUrl ?? null;

  const avgScore = answers.length
    ? Math.round(answers.reduce((s, a) => s + a.score.overallScore, 0) / answers.length * 100)
    : 0;

  const totalScore = Math.min(100, avgScore + mcqBonusPoints);
  const scoreColor = totalScore >= 70 ? '#34D399' : totalScore >= 50 ? '#F59E0B' : '#EF4444';

  const answered = answers.filter(a => a.answerText.trim()).length;
  const passed = answers.filter(a => !a.answerText.trim()).length;
  const mcqCorrect = (state.mcqResults ?? []).filter(r => r.correct).length;
  const mcqTotal = (state.mcqResults ?? []).length;

  useEffect(() => {
    const lowScoring = answers
      .filter(a => a.answerText.trim() && a.score.overallScore < 0.5)
      .map(a => ({
        subject: a.question.competencyTags?.[0] ?? a.question.questionText.slice(0, 40),
        scorePct: Math.round(a.score.overallScore * 100),
        competency: a.question.competencyTags?.[0] ?? '',
        addedAt: new Date().toISOString(),
      }));
    if (lowScoring.length > 0) saveWeakTopics(lowScoring);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: '-apple-system,"Segoe UI",sans-serif', padding: '32px 24px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: '8px' }}>
            InterviewMe · Interview Complete
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>
            Your Interview Results
          </h1>
        </motion.div>

        {/* Score card */}
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1 }}
          style={{ background: 'var(--bg2)', border: `1px solid ${scoreColor}44`, borderRadius: '20px', padding: '32px', display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '64px', fontWeight: 900, color: scoreColor, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{totalScore}%</div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-3)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Overall Score</div>
          </div>
          <div style={{ flex: 1, display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {[
              { label: 'Answered', value: answered, color: '#34D399' },
              { label: 'Passed', value: passed, color: '#EF4444' },
              { label: 'MCQ Bonus', value: `${mcqBonusPoints} pts`, color: '#a78bfa' },
              ...(mcqTotal > 0 ? [{ label: 'Bonus Q', value: `${mcqCorrect}/${mcqTotal}`, color: '#F59E0B' }] : []),
            ].map((item, i) => (
              <div key={i} style={{ minWidth: '80px' }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: item.color }}>{item.value}</div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>{item.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Playback */}
        {playbackUrl && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Interview Recording</div>
            <video src={playbackUrl} controls style={{ width: '100%', borderRadius: '10px', background: '#000', maxHeight: '360px' }} />
          </motion.div>
        )}

        {/* Answer breakdown */}
        {answers.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '16px' }}>
              Answer Breakdown
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {answers.map((a, i) => {
                const pct = Math.round(a.score.overallScore * 100);
                const sc = pct >= 70 ? '#34D399' : pct >= 50 ? '#F59E0B' : '#EF4444';
                const wasPassed = !a.answerText.trim();
                return (
                  <div key={i} style={{ borderRadius: '12px', border: '1px solid var(--border)', padding: '14px 16px', background: 'var(--bg3)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: wasPassed || !a.answerText ? 0 : '8px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: a.question.source === 'HR' ? '#a78bfa' : 'var(--blue)', background: 'rgba(0,0,0,0.25)', borderRadius: '4px', padding: '2px 7px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                            Q{i + 1} · {a.question.source}
                          </span>
                          {a.answeredByVoice && <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>🎙️</span>}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.5 }}>{a.question.questionText}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: wasPassed ? 'var(--text-3)' : sc, fontVariantNumeric: 'tabular-nums' }}>
                          {wasPassed ? '—' : `${pct}%`}
                        </div>
                      </div>
                    </div>
                    {a.answerText && (
                      <div style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.6, marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)', fontStyle: 'italic' }}>
                        "{a.answerText.slice(0, 280)}{a.answerText.length > 280 ? '…' : ''}"
                      </div>
                    )}
                    {a.score.feedback?.length > 0 && !wasPassed && (
                      <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {a.score.feedback.slice(0, 2).map((fb, fi) => (
                          <span key={fi} style={{ fontSize: '11px', color: fb.severity === 'high' ? '#EF4444' : fb.severity === 'medium' ? '#F59E0B' : 'var(--text-3)', background: fb.severity === 'high' ? 'rgba(239,68,68,0.1)' : fb.severity === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${fb.severity === 'high' ? 'rgba(239,68,68,0.25)' : fb.severity === 'medium' ? 'rgba(245,158,11,0.25)' : 'var(--border)'}`, borderRadius: '6px', padding: '3px 8px' }}>
                            {fb.message}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Action buttons */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/interview', { replace: true })}
            style={{ flex: 1, minWidth: '180px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '12px', padding: '14px 0', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
            ↩ Retake Interview
          </button>
          <button onClick={() => navigate('/dashboard')}
            style={{ flex: 1, minWidth: '180px', background: 'var(--bg2)', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 0', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
            Go to Dashboard
          </button>
        </motion.div>
      </div>
    </div>
  );
}
