import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Download } from 'lucide-react';
import { useAuthStore } from '../auth/authStore';
import { speak } from '../api/ttsApi';
import { getCertExamSession, type CertExamSession, type ExamQuestion } from '../api/certExamApi';
import { CertSaveDecisionPanel } from '../components/CertSaveDecisionPanel';
import { MathText } from '../components/MathText';
import { ReportQuestionButton } from '../components/ReportQuestionButton';
import SharedCertExamPage from './SharedCertExamPage';

interface IncomingState {
  certId?: string;
  certName?: string;
  passed?: boolean;
  scaledScore?: number;
  maxScore?: number;
  gradeLabel?: string;
  blueprintStatus?: string;
  answers?: { question: ExamQuestion; selectedIndex: number }[];
  domainAccuracy?: { domain: string; correct: number; total: number }[];
  isShared?: boolean;
  decided?: boolean;
}

// Copy-trimmed from InterviewSummaryPage.tsx's structure — downloadPdf pattern, goToLearn
// weak-area linking, and Michelle's spoken debrief all reuse the exact same proven shapes, just
// with pass/fail framing instead of a percentage rubric.
export default function CertExamSummaryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const incoming = (location.state as IncomingState | null) ?? {};
  const authUser = useAuthStore(s => s.user);
  const authToken = useAuthStore(s => s.token);

  const [session, setSession] = useState<IncomingState | null>(
    incoming.certName ? incoming : null,
  );
  // Signed in, but this result isn't theirs (e.g. they opened a link someone shared) — show the public view.
  const [notOwner, setNotOwner] = useState(false);

  // Reload/revisit fallback — route state is empty (e.g. a hard refresh), so hydrate from the
  // backend instead. Same "route state first, fetch as fallback" shape InterviewSummaryPage uses.
  useEffect(() => {
    if (session || !id || !authUser?.id || !authToken) return;
    getCertExamSession(authToken, authUser.id, id)
      .then((s: CertExamSession) => setSession({
        certId: s.certId, certName: s.certName, passed: s.passed, scaledScore: s.scaledScore,
        maxScore: s.maxScore, gradeLabel: s.sessionData.gradeLabel, blueprintStatus: s.sessionData.blueprintStatus,
        answers: s.sessionData.answers, domainAccuracy: s.sessionData.domainAccuracy,
        isShared: s.isShared, decided: s.decided,
      }))
      .catch(() => setNotOwner(true));
  }, [session, id, authUser, authToken]);

  const passed = session?.passed ?? false;
  const scaledScore = session?.scaledScore ?? 0;
  const maxScore = session?.maxScore ?? 1000;
  const gradeLabel = session?.gradeLabel;
  const isDraft = session?.blueprintStatus === 'ai-draft';
  const domainAccuracy = session?.domainAccuracy ?? [];
  const weakestDomain = [...domainAccuracy]
    .filter(d => d.total > 0)
    .sort((a, b) => a.correct / a.total - b.correct / b.total)[0]?.domain ?? null;

  // ── Michelle's verbal debrief ──────────────────────────────────────────────
  const [showReview, setShowReview] = useState(false);
  const [michelleActive, setMichelleActive] = useState(false);
  const cancelMichelleRef = useRef<(() => void) | null>(null);

  const buildDebriefScript = useCallback(() => {
    const name = authUser?.firstName ?? 'there';
    if (passed) {
      return `Congratulations ${name} — you passed! ${gradeLabel ? `That is roughly ${gradeLabel}, and ${scaledScore} out of ${maxScore}.` : `You scored ${scaledScore} out of ${maxScore}, well done.`} ${weakestDomain ? `Your strongest area was clear, though ${weakestDomain} is still worth a quick review before the real exam.` : "That's a genuinely strong result."} Good luck with the real thing.`;
    }
    return `Hi ${name}, it's Michelle here. ${gradeLabel ? `That comes out at roughly ${gradeLabel}, ${scaledScore} out of ${maxScore}` : `You scored ${scaledScore} out of ${maxScore} on this attempt`} — not quite there yet, but that's exactly what practice is for. ${weakestDomain ? `Your weakest area was ${weakestDomain} — our Learn platform has a lesson ready on that right now.` : 'A bit more study and you will get there.'} Take a look, then come back and try again.`;
  }, [authUser, passed, scaledScore, maxScore, weakestDomain, gradeLabel]);

  function toggleDebrief() {
    if (michelleActive) {
      cancelMichelleRef.current?.();
      cancelMichelleRef.current = null;
      setMichelleActive(false);
      return;
    }
    setMichelleActive(true);
    cancelMichelleRef.current = speak(buildDebriefScript(), 'michelle', () => {
      setMichelleActive(false);
      cancelMichelleRef.current = null;
    });
  }

  useEffect(() => () => { cancelMichelleRef.current?.(); }, []);

  // Learn is its own destination, not rendered inline here — same navigation InterviewSummaryPage
  // uses for its own weak-area links, works unchanged for a cert domain name.
  function goToLearn(topic?: string | null) {
    navigate('/dashboard?tab=learn', { state: { studyTopic: topic ?? weakestDomain ?? undefined } });
  }

  const downloadCertificate = () => {
    const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Mock Exam Result — TheInterviewChair.com</title>
<style>
  @page { margin: 30mm; }
  body { font-family: -apple-system,'Segoe UI',Arial,sans-serif; color:#1a1a2e; text-align:center; }
  .brand { font-size:12px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#4F8EF7; margin-bottom:24px; }
  h1 { font-size:26px; font-weight:800; color:#1B3A6B; margin:0 0 8px; }
  .status { font-size:40px; font-weight:900; color:${passed ? '#059669' : '#EF4444'}; margin:24px 0; }
  .score { font-size:20px; color:#444; margin-bottom:24px; }
  .meta { font-size:12px; color:#888; margin-top:32px; }
  .disclaimer { font-size:10px; color:#aaa; margin-top:40px; border-top:1px solid #eee; padding-top:12px; }
</style></head><body>
<div class="brand">TheInterviewChair.com · Mock Exam Result</div>
<h1>${session?.certName ?? ''}</h1>
<div class="status">${passed ? 'PASSED' : 'NOT YET'}</div>
<div class="score">${scaledScore} / ${maxScore}</div>
<div class="meta">${date}${authUser?.name ? ` · ${authUser.name}` : ''}</div>
<div class="disclaimer">This is a practice mock exam result, not an official certification. For interview and exam preparation only.</div>
</body></html>`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  };

  if (!session && notOwner) return <SharedCertExamPage id={id} />;

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text-2)' }}>
        Loading your result…
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', maxWidth: '600px' }}>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          {passed ? <CheckCircle2 size={56} color="#34D399" /> : <XCircle size={56} color="#EF4444" />}
          <h1 style={{ fontSize: '26px', fontWeight: 900, color: 'var(--text)', margin: '16px 0 6px' }}>
            {passed ? 'You passed!' : 'Not quite there yet'}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-2)' }}>{session.certName}</p>
        </div>

        <CertSaveDecisionPanel
          passed={passed}
          scaledScore={scaledScore}
          maxScore={maxScore}
          certName={session.certName ?? ''}
          candidateId={authUser?.id}
          examSessionId={id}
          alreadyShared={session.isShared ?? false}
          onDiscarded={() => setTimeout(() => navigate('/cert-exam/start'), 1800)}
        />

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '48px', fontWeight: 900, color: passed ? '#34D399' : '#EF4444', fontVariantNumeric: 'tabular-nums' }}>
            {scaledScore}<span style={{ fontSize: '20px', color: 'var(--text-3)' }}>/{maxScore}</span>
          </div>
          {gradeLabel && (
            <div style={{ fontSize: '20px', fontWeight: 800, color: passed ? '#34D399' : '#EF4444', marginTop: '4px' }}>{gradeLabel} <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-3)' }}>(indicative)</span></div>
          )}
          <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '6px' }}>
            {gradeLabel ? 'Mock exam · real grade boundaries change every year, so treat this as a guide' : 'Scaled score · Mock exam'}
          </div>
          {isDraft && (
            <div style={{ fontSize: '11px', color: '#fbbf24', marginTop: '10px', lineHeight: 1.5 }}>
              AI-drafted practice exam — topic areas may differ from the official specification.
            </div>
          )}
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
                    {pct < 65 && (
                      <button onClick={() => goToLearn(d.domain)} style={{ marginTop: '6px', background: 'none', border: 'none', color: 'var(--blue)', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                        Study {d.domain} →
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(session.answers?.length ?? 0) > 0 && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
            <button
              onClick={() => setShowReview(v => !v)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
                Review your answers ({session.answers!.length})
              </span>
              <span style={{ fontSize: '12px', color: 'var(--blue)', fontWeight: 700 }}>{showReview ? 'Hide' : 'Show'}</span>
            </button>
            {showReview && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginTop: '16px' }}>
                {session.answers!.map((a, qi) => {
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
                              {isPicked && !isCorrect && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#EF4444', fontWeight: 700 }}>your answer</span>}
                            </div>
                          );
                        })}
                      </div>
                      {a.question.explanation && (
                        <div style={{ fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.6, marginTop: '10px' }}>
                          <MathText text={a.question.explanation} />
                        </div>
                      )}
                      {session.certId && a.question.id && (
                        <div style={{ marginTop: '10px' }}>
                          <ReportQuestionButton examId={session.certId} questionId={a.question.id} compact />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
          <button onClick={toggleDebrief} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '13px', color: 'var(--text)', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
            {michelleActive ? 'Stop' : "Hear Michelle's feedback"}
          </button>
          <button onClick={downloadCertificate} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '13px', color: 'var(--text)', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
            <Download size={14} /> PDF
          </button>
        </div>

        {/* General "go study this on Learn" — distinct from the per-domain weak-area links above,
            which only appear when a domain scored under 65%. This one's always here, keyed to the
            exam itself, whether you passed or not (Francis, 2026-09-23). */}
        <button
          onClick={() => goToLearn(session.certName)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '12px', padding: '13px', color: '#A5B4FC', fontSize: '13px', fontWeight: 700, cursor: 'pointer', marginBottom: '20px' }}
        >
          📚 Study {session.certName} on Learn
        </button>

        <button onClick={() => navigate('/cert-exam/start')} style={{ width: '100%', background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', color: '#fff', border: 'none', borderRadius: '13px', padding: '15px', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}>
          Try another exam
        </button>
      </motion.div>
    </div>
  );
}
