import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ScoringDisplay } from '../components/ScoringDisplay';
import type { InterviewQuestion, ScoreResponse } from '../api/explainApi';
import type { TranscriptMeta } from '../components/VoiceInput';

interface SessionAnswer {
  question: InterviewQuestion;
  answerText: string;
  meta?: TranscriptMeta;
  score: ScoreResponse;
  answeredByVoice: boolean;
  thinkTimeMs?: number;
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

type Tab = 'interview' | 'learn' | 'coming-soon';

export default function InterviewSummary() {
  const location = useLocation();
  const navigate = useNavigate();
  const answers: SessionAnswer[] = location.state?.answers ?? [];
  const [activeTab, setActiveTab] = useState<Tab>('interview');
  const [learnEmail, setLearnEmail] = useState('');
  const [learnEmailSent, setLearnEmailSent] = useState(false);

  const overall = overallAvg(answers);
  const strengths = (['clarity', 'relevance', 'depth', 'confidence'] as const).filter(d => avg(answers, d) >= 0.65);
  const improvements = (['clarity', 'relevance', 'depth', 'confidence'] as const).filter(d => avg(answers, d) < 0.55);

  // Find weakest competency for the learn cross-sell
  const weakestTag = answers.length > 0
    ? answers
        .flatMap(a => a.question.competencyTags)
        .reduce<Record<string, number>>((acc, tag) => { acc[tag] = (acc[tag] ?? 0) + 1; return acc; }, {})
    : {};
  const topTag = Object.entries(weakestTag).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const showLearnBanner = overall < 0.70 && topTag;

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
  <div class="meta">${date} · ${answers.length} questions</div>
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

      <div style={{ maxWidth: '840px', margin: '0 auto', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* ── INTERVIEW TAB ── */}
        {activeTab === 'interview' && (
          <>
            {/* Cross-sell banner */}
            {showLearnBanner && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                style={{ background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--blue)' }}>Tip:</strong> Based on your scores, brushing up on <strong style={{ color: 'var(--text)' }}>{topTag}</strong> could make a big difference.
                  Visit the <strong>Learn tab</strong> for free prep material.
                </div>
                <button onClick={() => setActiveTab('learn')}
                  style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Go to Learn →
                </button>
              </motion.div>
            )}

            {/* Overall score card */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', display: 'flex', gap: '32px', alignItems: 'center' }}>
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: '56px', fontWeight: 900, color: scoreColor(overall), letterSpacing: '-0.04em', lineHeight: 1 }}>{Math.round(overall * 100)}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '4px' }}>Overall Score</div>
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

            {/* Per-question breakdown */}
            {answers.map((a, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
                <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: '4px', padding: '2px 8px', color: 'var(--blue)' }}>Q{i + 1}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-3)', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', padding: '2px 8px' }}>{a.question.questionType}</span>
                    {a.answeredByVoice && <span style={{ fontSize: '11px', color: '#34D399', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: '4px', padding: '2px 8px' }}>🎤 Voice</span>}
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
                </div>
              </motion.div>
            ))}

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
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '36px 32px', textAlign: 'center', maxWidth: '540px', margin: '0 auto' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>📚</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', marginBottom: '10px' }}>Free Learning Modules</div>
              <div style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.65, marginBottom: '24px' }}>
                {topTag
                  ? <>Based on your session, we recommend starting with <strong style={{ color: 'var(--text)' }}>{topTag}</strong> — one of your lower-scoring areas. Our bite-sized modules help you master exactly what interviewers are looking for.</>
                  : <>Sharpen the skills interviewers test most. Our bite-sized modules cover communication, leadership, technical problem-solving, and more.</>
                }
              </div>

              {!learnEmailSent ? (
                <>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '10px' }}>Get notified when Learn launches:</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="email"
                      value={learnEmail}
                      onChange={e => setLearnEmail(e.target.value)}
                      placeholder="your@email.com"
                      style={{
                        flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '9px',
                        padding: '12px 16px', color: 'var(--text)', fontSize: '14px', outline: 'none', fontFamily: 'inherit',
                      }}
                    />
                    <button
                      onClick={() => { if (learnEmail.includes('@')) setLearnEmailSent(true); }}
                      disabled={!learnEmail.includes('@')}
                      style={{
                        background: learnEmail.includes('@') ? 'var(--blue)' : 'rgba(79,142,247,0.3)',
                        color: '#fff', border: 'none', borderRadius: '9px', padding: '12px 20px',
                        fontSize: '13px', fontWeight: 700, cursor: learnEmail.includes('@') ? 'pointer' : 'default',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Notify Me
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '10px', padding: '14px 18px', fontSize: '14px', color: '#34D399', fontWeight: 600 }}>
                  ✓ You're on the list — we'll email you when Learn launches.
                </div>
              )}

              <div style={{ marginTop: '28px', padding: '16px', background: 'var(--bg3)', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '8px' }}>Planned subjects</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {['Communication', 'Leadership', 'Stakeholder Management', 'Technical Interviews', 'System Design', 'Behavioural Frameworks', 'Salary Negotiation'].map(s => (
                    <span key={s} style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '20px', padding: '3px 10px', color: 'var(--text-3)' }}>{s}</span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── COMING SOON TAB ── */}
        {activeTab === 'coming-soon' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚡</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>More coming soon</div>
            <div style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.65, maxWidth: '400px', margin: '0 auto 28px' }}>
              We're building visa interview prep, court preparation, driving theory, and more — because Explain isn't just for job interviews.
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {['Visa Interviews', 'Driving Theory', 'Citizenship Tests', 'Court Preparation', 'Academic Admissions', 'Assessment Centres'].map(s => (
                <span key={s} style={{ fontSize: '12px', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '20px', padding: '5px 14px', color: '#a78bfa', fontWeight: 600 }}>{s}</span>
              ))}
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
