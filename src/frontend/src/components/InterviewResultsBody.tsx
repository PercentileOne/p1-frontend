import { motion } from 'framer-motion';
import { ScoringDisplay } from './ScoringDisplay';
import type { InterviewQuestion, ScoreResponse } from '../api/explainApi';
import type { TranscriptMeta } from './VoiceInput';

export interface ResultAnswer {
  question: InterviewQuestion;
  answerText: string;
  score: ScoreResponse;
  answeredByVoice?: boolean;
  meta?: TranscriptMeta;
  thinkTimeMs?: number;
}

export interface MCQQuestionResult {
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic?: string;
}

export interface MCQAnswerResult {
  correct: boolean;
  selectedIndex: number;
  questionIndex: number;
}

function avg(answers: ResultAnswer[], key: 'clarity' | 'relevance' | 'depth' | 'confidence') {
  if (!answers.length) return 0;
  return answers.reduce((s, a) => s + (a.score as unknown as Record<string, number>)[key], 0) / answers.length;
}

function overallAvg(answers: ResultAnswer[]) {
  if (!answers.length) return 0;
  return answers.reduce((s, a) => s + a.score.overallScore, 0) / answers.length;
}

function scoreColor(v: number) {
  if (v >= 0.7) return '#34D399';
  if (v >= 0.45) return '#F59E0B';
  return '#EF4444';
}

/**
 * Full-fidelity interview results — score card, MCQ bonus rounds, per-question
 * breakdown. Shared by the candidate's own private summary page and the public
 * shared-link page so both stay identical by construction instead of drifting
 * apart as two hand-maintained copies. Pass `onStudyTopic` only on the private
 * page — the LEARN cross-sell has nothing to route to on a public,
 * unauthenticated view, so omitting it hides that CTA entirely.
 */
export function InterviewResultsBody({
  answers,
  mcqQuestions = [],
  mcqResults = [],
  onStudyTopic,
}: {
  answers: ResultAnswer[];
  mcqQuestions?: MCQQuestionResult[];
  mcqResults?: MCQAnswerResult[];
  onStudyTopic?: (tag: string) => void;
}) {
  const overall = overallAvg(answers);
  const strengths = (['clarity', 'relevance', 'depth', 'confidence'] as const).filter(d => avg(answers, d) >= 0.65);
  const improvements = (['clarity', 'relevance', 'depth', 'confidence'] as const).filter(d => avg(answers, d) < 0.55);
  const mcqBonusPoints = mcqResults.filter(r => r.correct).length * 10;

  return (
    <>
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
                        {isCorrect ? '✓' : isSelected ? '✗' : ['A', 'B', 'C', 'D'][i]}
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
              {!mcqResult.correct && mcqQ.topic && onStudyTopic && (
                <div style={{ background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.15)', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.5 }}>
                    Missed this one on <strong>{mcqQ.topic}</strong>.{' '}
                    <span style={{ color: 'var(--blue)' }}>Use LEARN to study this free.</span>
                  </div>
                  <button
                    onClick={() => onStudyTopic(mcqQ.topic!)}
                    style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '7px', padding: '7px 14px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'inherit' }}
                  >
                    Study {mcqQ.topic} →
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}

      {/* Per-question breakdown */}
      {answers.map((a, i) => {
        const tag = a.question.competencyTags[0];
        const pct = Math.round(a.score.overallScore * 100);
        const showRec = !!onStudyTopic && a.score.overallScore < 0.65 && !!tag;
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

              {showRec && (
                <div style={{ background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.15)', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.5 }}>
                    You scored <strong style={{ color: scoreColor(a.score.overallScore) }}>{pct}%</strong> on <strong>{tag}</strong>. Top candidates score 90%+.{' '}
                    <span style={{ color: 'var(--blue)' }}>Use LEARN to study this free.</span>
                  </div>
                  <button
                    onClick={() => onStudyTopic!(tag)}
                    style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '7px', padding: '7px 14px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'inherit' }}
                  >
                    Study {tag} →
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </>
  );
}
