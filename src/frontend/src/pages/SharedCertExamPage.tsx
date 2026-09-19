import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';
import { speak } from '../api/ttsApi';
import { getSharedCertExam, type SharedCertExam } from '../api/certExamApi';
import { MathText } from '../components/MathText';
import { ReportQuestionButton } from '../components/ReportQuestionButton';

// Public, no-login view of a SHARED mock-exam result (Francis, 2026-09-19: "it would be nice for the
// public to view it without logging in ... in this kind of format, the same way we can now listen to
// and view CV analysis"). Copy-trimmed from CertExamSummaryPage.tsx: same score card, domain
// breakdown, answer review and Michelle's spoken feedback — minus everything that is the OWNER's (the
// save/share panel, PDF, "Study on Learn"), and with the feedback spoken in the third person.
//
// Used two ways: at /shared-cert-exam/:token (new links) and — via the `id` prop — at the old
// /cert-exam-summary/:id address, so links people had already posted keep working.
export default function SharedCertExamPage({ id }: { id?: string }) {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const [result, setResult] = useState<SharedCertExam | null>(null);
  const [state, setState] = useState<'loading' | 'done' | 'missing'>('loading');
  const [showReview, setShowReview] = useState(false);
  const [michelleActive, setMichelleActive] = useState(false);
  const cancelMichelleRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const key = id ?? token;
    if (!key) { setState('missing'); return; }
    getSharedCertExam(id ? 'id' : 'token', key)
      .then(r => { if (r) { setResult(r); setState('done'); } else setState('missing'); });
  }, [id, token]);

  useEffect(() => () => { cancelMichelleRef.current?.(); }, []);

  if (state === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text-2)' }}>
        Loading result…
      </div>
    );
  }
  if (state === 'missing' || !result) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text)', padding: 24, textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>This result isn't available</div>
          <p style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 380, margin: '0 auto 18px' }}>
            The link may have been made private, or it may be mistyped. You can still try a mock exam of your own.
          </p>
          <button onClick={() => navigate('/cert-exam/start')} style={{ background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 22px', fontWeight: 800, cursor: 'pointer' }}>
            Try a mock exam
          </button>
        </div>
      </div>
    );
  }

  const { certId, certName, passed, scaledScore, maxScore, gradeLabel, candidateName, blueprintStatus } = result;
  const domainAccuracy = result.domainAccuracy ?? [];
  const answers = result.answers ?? [];
  const isDraft = blueprintStatus === 'ai-draft';
  const who = candidateName?.trim() ? candidateName.trim().split(/\s+/)[0] : 'This candidate';
  const ranked = [...domainAccuracy].filter(d => d.total > 0).sort((a, b) => b.correct / b.total - a.correct / a.total);
  const strongest = ranked[0]?.domain ?? null;
  const weakest = ranked.length > 1 ? ranked[ranked.length - 1].domain : null;

  // Michelle speaks about the result in the third person — the viewer is not the person who sat it.
  function buildScript(): string {
    const score = gradeLabel ? `roughly ${gradeLabel}, ${scaledScore} out of ${maxScore}` : `${scaledScore} out of ${maxScore}`;
    const verdict = passed ? 'That is a pass.' : "That isn't a pass yet — but that is exactly what practice is for.";
    const areas = strongest
      ? ` Their strongest area was ${strongest}${weakest && weakest !== strongest ? `, and ${weakest} is where I would focus next` : ''}.`
      : '';
    return `Here is how ${who} got on with the TheInterviewChair.com mock ${certName} exam. They scored ${score}. ${verdict}${areas} If you would like to try the same exam yourself, you can start right from this page.`;
  }

  function toggleFeedback() {
    if (michelleActive) {
      cancelMichelleRef.current?.();
      cancelMichelleRef.current = null;
      setMichelleActive(false);
      return;
    }
    setMichelleActive(true);
    cancelMichelleRef.current = speak(buildScript(), 'michelle', () => {
      setMichelleActive(false);
      cancelMichelleRef.current = null;
    });
  }

  const tryThisExam = () => navigate(`/cert-exam/${certId}`);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', maxWidth: '600px' }}>

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#34D399', marginBottom: 14 }}>
            TheInterviewChair.com · Mock Exam
          </div>
          {passed ? <CheckCircle2 size={56} color="#34D399" /> : <XCircle size={56} color="#EF4444" />}
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text)', margin: '16px 0 6px', lineHeight: 1.25 }}>
            {passed
              ? `${candidateName?.trim() ? candidateName.trim() : 'A candidate'} passed the TheInterviewChair.com Mock Exam`
              : `${candidateName?.trim() ? candidateName.trim() : 'A candidate'} took the TheInterviewChair.com Mock Exam`}
          </h1>
          <p style={{ fontSize: '15px', fontWeight: 700, color: passed ? '#34D399' : 'var(--text-2)', margin: 0 }}>{certName}</p>
        </div>

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '48px', fontWeight: 900, color: passed ? '#34D399' : '#EF4444', fontVariantNumeric: 'tabular-nums' }}>
            {scaledScore}<span style={{ fontSize: '20px', color: 'var(--text-3)' }}>/{maxScore}</span>
          </div>
          {gradeLabel && (
            <div style={{ fontSize: '20px', fontWeight: 800, color: passed ? '#34D399' : '#EF4444', marginTop: '4px' }}>
              {gradeLabel} <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-3)' }}>(indicative)</span>
            </div>
          )}
          <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '6px' }}>
            {gradeLabel ? 'Mock exam · real grade boundaries change every year, so treat this as a guide' : 'Scaled score · Mock exam'}
          </div>
          {isDraft && (
            <div style={{ fontSize: '11px', color: '#fbbf24', marginTop: '10px', lineHeight: 1.5 }}>
              AI-drafted practice exam — topic areas may differ from the official specification.
            </div>
          )}
          <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '10px', lineHeight: 1.5 }}>
            A practice mock exam on TheInterviewChair.com — not an official result. Practise for any US or UK exam.
          </div>
        </div>

        {domainAccuracy.length > 0 && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '14px' }}>
              Breakdown by domain
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {domainAccuracy.map(d => {
                const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
                return (
                  <div key={d.domain}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-2)', marginBottom: '4px' }}>
                      <span>{d.domain}</span>
                      <span>{d.correct}/{d.total}</span>
                    </div>
                    <div style={{ height: '6px', borderRadius: '3px', background: 'var(--bg3)', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: pct >= 65 ? '#34D399' : '#F59E0B' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {answers.length > 0 && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
            <button
              onClick={() => setShowReview(v => !v)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
                Review the answers ({answers.length})
              </span>
              <span style={{ fontSize: '12px', color: 'var(--blue)', fontWeight: 700 }}>{showReview ? 'Hide' : 'Show'}</span>
            </button>
            {showReview && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginTop: '16px' }}>
                {answers.map((a, qi) => {
                  const right = a.selectedIndex === a.question.correctIndex;
                  return (
                    <div key={qi} style={{ borderTop: qi === 0 ? 'none' : '1px solid var(--border)', paddingTop: qi === 0 ? 0 : '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: right ? '#34D399' : '#EF4444' }}>
                          {right ? 'Correct' : 'Incorrect'} · Q{qi + 1}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>{a.question.domain}</span>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.5, marginBottom: '10px' }}>
                        <MathText text={a.question.questionText} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {a.question.options.map((opt, oi) => {
                          const isCorrect = oi === a.question.correctIndex;
                          const isPicked = oi === a.selectedIndex;
                          return (
                            <div key={oi} style={{
                              fontSize: '13px', padding: '8px 12px', borderRadius: '8px', color: 'var(--text-2)',
                              background: isCorrect ? 'rgba(52,211,153,0.10)' : isPicked ? 'rgba(239,68,68,0.10)' : 'var(--bg3)',
                              border: `1px solid ${isCorrect ? 'rgba(52,211,153,0.5)' : isPicked ? 'rgba(239,68,68,0.5)' : 'var(--border)'}`,
                            }}>
                              <span style={{ color: 'var(--text-3)', marginRight: '8px', fontWeight: 700 }}>{String.fromCharCode(65 + oi)}.</span>
                              <MathText text={opt} />
                              {isCorrect && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#34D399', fontWeight: 700 }}>✓ correct answer</span>}
                              {isPicked && !isCorrect && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#EF4444', fontWeight: 700 }}>their answer</span>}
                            </div>
                          );
                        })}
                      </div>
                      {a.question.explanation && (
                        <div style={{ fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.6, marginTop: '10px' }}>
                          <MathText text={a.question.explanation} />
                        </div>
                      )}
                      {certId && a.question.id && (
                        <div style={{ marginTop: '10px' }}>
                          <ReportQuestionButton examId={certId} questionId={a.question.id} compact />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <button
          onClick={toggleFeedback}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '13px', color: 'var(--text)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', marginBottom: '20px' }}
        >
          {michelleActive ? 'Stop' : "Hear Michelle's feedback"}
        </button>

        <button
          onClick={tryThisExam}
          style={{ width: '100%', background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', color: '#fff', border: 'none', borderRadius: '13px', padding: '15px', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}
        >
          Take the same exam on TheInterviewChair.com →
        </button>
      </motion.div>
    </div>
  );
}
