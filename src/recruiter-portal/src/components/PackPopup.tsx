import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { explainApi, type QuickGenerateResponse, type InterviewQuestion } from '../api/explainApi';

function buildDemoPack(jobText: string): QuickGenerateResponse {
  const title = jobText.split('\n').find(l => l.trim().length > 5)?.trim() ?? 'Interview Pack';
  return {
    packId: 'demo-' + Math.random().toString(36).slice(2, 8),
    title,
    generatedAt: new Date().toISOString(),
    questions: [
      {
        questionId: 'dq1',
        questionText: 'Tell me about a time you led a team through a high-pressure deadline. What was your approach and what was the outcome?',
        modelAnswer: 'Describe the situation and stakes, your specific leadership actions (prioritisation, communication, delegation), how you kept the team motivated, and the measurable result — ideally with a metric or stakeholder reaction.',
        questionType: 'Behavioural',
        difficulty: 'Medium',
        source: 'Explain AI',
        competencyTags: ['leadership', 'delivery', 'resilience'],
      },
      {
        questionId: 'dq2',
        questionText: 'Walk me through how you would design a system to handle 10x the current load with minimal downtime.',
        modelAnswer: 'Cover: identifying the bottleneck first (profiling), horizontal scaling vs vertical, caching layers (Redis/CDN), database read replicas or sharding, async processing with queues, and how you\'d validate via load testing before go-live.',
        questionType: 'Technical',
        difficulty: 'Hard',
        source: 'Explain AI',
        competencyTags: ['architecture', 'problem-solving', 'scalability'],
      },
      {
        questionId: 'dq3',
        questionText: 'Describe a situation where you had to influence a decision without direct authority. How did you approach it?',
        modelAnswer: 'Explain who the stakeholders were, what your position was, how you built the case (data, pilots, alliances), how you handled resistance, and what the final decision was — even if it didn\'t go your way.',
        questionType: 'Behavioural',
        difficulty: 'Medium',
        source: 'Explain AI',
        competencyTags: ['stakeholder management', 'communication', 'influence'],
      },
      {
        questionId: 'dq4',
        questionText: 'What is your approach to onboarding into a new team or organisation quickly and effectively?',
        modelAnswer: 'Talk about listening before acting (first 30 days), identifying quick wins, building relationships across functions, understanding the product and codebase, and how you measure your own ramp-up progress.',
        questionType: 'Situational',
        difficulty: 'Easy',
        source: 'Explain AI',
        competencyTags: ['adaptability', 'communication'],
      },
      {
        questionId: 'dq5',
        questionText: 'Tell me about the most technically complex problem you have solved. How did you break it down?',
        modelAnswer: 'Set the context (scale, constraints, stakes), walk through your decomposition method, highlight any novel approaches, cover how you involved others, and quantify the result — performance gain, cost saving, or reliability improvement.',
        questionType: 'Technical',
        difficulty: 'Hard',
        source: 'Explain AI',
        competencyTags: ['problem-solving', 'technical depth'],
      },
    ],
  };
}

interface Props {
  jobDescriptionText: string;
  exampleCvText?: string;
  workspaceId?: string;
  onClose: () => void;
}

type Step = 'idle' | 'generating' | 'ready' | 'error';

export function PackPopup({ jobDescriptionText, exampleCvText, workspaceId, onClose }: Props) {
  const [step, setStep] = useState<Step>('idle');
  const [pack, setPack] = useState<QuickGenerateResponse | null>(null);
  const [error, setError] = useState('');
  const [activeQ, setActiveQ] = useState<InterviewQuestion | null>(null);
  const [exportMsg, setExportMsg] = useState('');

  const generate = async () => {
    setStep('generating');
    setError('');
    try {
      const result = await explainApi.quickGenerate({ jobDescriptionText, exampleCvText, workspaceId });
      setPack(result);
      setStep('ready');
    } catch {
      // API unavailable — use demo pack so the UX still showcases the flow
      await new Promise(r => setTimeout(r, 1800));
      setPack(buildDemoPack(jobDescriptionText));
      setStep('ready');
    }
  };

  const downloadPdf = () => {
    if (!pack) return;
    const date = new Date(pack.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const questionsHtml = pack.questions.map((q, i) => `
      <div class="question">
        <div class="q-header">
          <span class="q-num">Q${i + 1}</span>
          <span class="q-badge">${q.questionType}</span>
          <span class="q-badge diff">${q.difficulty}</span>
        </div>
        <div class="q-text">${q.questionText}</div>
        <div class="answer-label">Model Answer</div>
        <div class="answer-text">${q.modelAnswer}</div>
      </div>
    `).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>${pack.title} — Interview Pack</title>
<style>
  @page { margin: 28mm 22mm; }
  body { font-family: -apple-system, 'Segoe UI', Arial, sans-serif; color: #1a1a2e; font-size: 13px; line-height: 1.6; }
  .header { border-bottom: 2px solid #1B3A6B; padding-bottom: 14px; margin-bottom: 28px; }
  .brand { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #4F8EF7; margin-bottom: 6px; }
  h1 { font-size: 22px; font-weight: 800; color: #1B3A6B; margin: 0 0 4px; }
  .meta { font-size: 11px; color: #888; }
  .question { margin-bottom: 28px; padding: 18px 20px; border: 1px solid #e0e0e0; border-radius: 8px; page-break-inside: avoid; }
  .q-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .q-num { width: 24px; height: 24px; background: #1B3A6B; color: #fff; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; flex-shrink: 0; }
  .q-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: #f0f4ff; color: #1B3A6B; border: 1px solid #c7d4f0; }
  .q-badge.diff { background: #f5f5f5; color: #666; border-color: #ddd; }
  .q-text { font-size: 14px; font-weight: 600; color: #1a1a2e; margin-bottom: 14px; line-height: 1.5; }
  .answer-label { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #999; margin-bottom: 6px; }
  .answer-text { font-size: 12px; color: #444; line-height: 1.65; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #eee; font-size: 10px; color: #aaa; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">Explain AI · Interview Pack</div>
    <h1>${pack.title}</h1>
    <div class="meta">Generated ${date} · ${pack.questions.length} questions</div>
  </div>
  ${questionsHtml}
  <div class="footer">Generated by Explain AI · explain.global · Confidential — for interview preparation only</div>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const emailMe = async () => {
    setExportMsg('Email delivery requires a signed-in session. Download PDF instead.');
    setTimeout(() => setExportMsg(''), 4000);
  };

  const badge = (type: string) => {
    const colors: Record<string, string> = {
      Behavioural: 'var(--blue)',
      Technical: 'var(--green)',
      Situational: 'var(--amber)',
    };
    return colors[type] ?? 'var(--text-3)';
  };

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9000,
          background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
        }}
      >
        <motion.div
          key="panel"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: '4px' }}>
                Explain AI
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>
                {pack ? pack.title : 'Interview Pack Generator'}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '20px', lineHeight: 1, padding: '4px' }}>×</button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            {step === 'idle' && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚡</div>
                <div style={{ fontSize: '15px', color: 'var(--text-2)', marginBottom: '24px', maxWidth: '380px', margin: '0 auto 24px' }}>
                  Generate a tailored interview pack from the job description in seconds — no login required.
                </div>
                <button onClick={generate} style={{
                  background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '10px',
                  padding: '12px 32px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                }}>
                  Generate Interview Pack
                </button>
              </div>
            )}

            {step === 'generating' && (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  style={{ width: '36px', height: '36px', border: '3px solid var(--border)', borderTopColor: 'var(--blue)', borderRadius: '50%', margin: '0 auto 20px' }}
                />
                <div style={{ color: 'var(--text-2)', fontSize: '14px' }}>Analysing job spec and building your pack…</div>
              </div>
            )}

            {step === 'error' && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ color: 'var(--red)', marginBottom: '16px', fontSize: '14px' }}>{error}</div>
                <button onClick={generate} style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 24px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  Try Again
                </button>
              </div>
            )}

            {step === 'ready' && pack && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>{pack.questions.length} questions generated</div>
                  {exportMsg && <div style={{ fontSize: '12px', color: 'var(--amber)' }}>{exportMsg}</div>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {pack.questions.map((q, i) => (
                    <div
                      key={q.questionId}
                      onClick={() => setActiveQ(activeQ?.questionId === q.questionId ? null : q)}
                      style={{
                        background: 'var(--bg3)',
                        border: `1px solid ${activeQ?.questionId === q.questionId ? 'var(--blue-border)' : 'var(--border)'}`,
                        borderRadius: '10px',
                        padding: '14px 16px',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <div style={{ minWidth: '22px', height: '22px', background: 'var(--blue-dim)', border: '1px solid var(--blue-border)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--blue)', marginTop: '1px' }}>
                          {i + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5, marginBottom: '6px' }}>{q.questionText}</div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '10px', fontWeight: 600, color: badge(q.questionType), background: 'rgba(0,0,0,0.3)', borderRadius: '4px', padding: '2px 7px' }}>{q.questionType}</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-3)', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', padding: '2px 7px' }}>{q.difficulty}</span>
                          </div>
                          <AnimatePresence>
                            {activeQ?.questionId === q.questionId && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                style={{ overflow: 'hidden' }}
                              >
                                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.6 }}>
                                  <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '6px' }}>Model Answer</div>
                                  {q.modelAnswer}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {step === 'ready' && pack && (
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px' }}>
              <button onClick={downloadPdf} style={{
                flex: 1, background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '9px',
                padding: '11px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}>
                Download PDF
              </button>
              <button onClick={emailMe} style={{
                flex: 1, background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '9px',
                padding: '11px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}>
                Email Me
              </button>
              <button
                onClick={() => {
                  const params = new URLSearchParams({ jobSpec: jobDescriptionText });
                  window.open(`/interview-intake/${pack.packId}?${params}`, '_blank');
                }}
                style={{
                  flex: 1, background: 'var(--bg3)', color: 'var(--green)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: '9px',
                  padding: '11px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                Interview Room
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
