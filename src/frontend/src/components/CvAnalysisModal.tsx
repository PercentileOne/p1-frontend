import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, TrendingUp, AlertTriangle, Mic, Flame, Share2, Check } from 'lucide-react';
import { FileUpload } from './FileUpload';
import { ChairSpinner } from './ChairSpinner';
import { CvAnalysisVoiceOverlay } from './CvAnalysisVoiceOverlay';
import { analyzeCv, matchRolesToCareers, saveCvAnalysisHistory, shareCvAnalysisHistory, type CvAnalysisResult, type CvRoleMatch } from '../api/cvAnalysisApi';
import { generateHotTopicsWithReasons, type HotTopicWithReason } from '../api/aiScoring';
import { useAuthStore } from '../auth/authStore';

interface Props {
  onClose: () => void;
  // 'candidate' = a recruiter analysing someone ELSE's CV — third-person, hiring-fit framing
  // throughout, both in the AI prompt (see Endpoint.cs) and the copy in this component.
  audience?: 'self' | 'candidate';
  // Only wired up by the candidate portal (CandidateDashboard.tsx navigates to Learn with the
  // topic pre-filled, same pattern as the "Most Studied Topics" modal already uses). Left
  // undefined for the recruiter portal — this is a self-directed "go study this" nudge, it
  // doesn't make sense when the audience is evaluating someone ELSE's CV.
  onStudyTopic?: (topic: string) => void;
}

type Step = 'upload' | 'analyzing' | 'results' | 'error';

const ACCENT = '#34D399';

function levelColor(level: number) {
  if (level >= 7) return '#34D399';
  if (level >= 4) return '#F59E0B';
  return '#EF4444';
}

function fmtK(n: number) {
  return n >= 1000 ? `£${Math.round(n / 1000)}k` : `£${n}`;
}

// Grounds the hot-topic bar in the candidate's OWN detected skills rather than an arbitrary
// colour — green if a matching skill is already strong (level >= 7), amber if there's some
// exposure, red if the topic isn't reflected in their CV at all (a genuine gap worth studying).
// Deliberately simple substring matching, not fuzzy/AI matching — a topic that doesn't literally
// overlap with anything in their skills list defaulting to "worth studying" is the safer error
// to make here, not the reverse.
function topicColor(topic: string, skills: CvAnalysisResult['skills']): string {
  const norm = topic.toLowerCase();
  const match = skills.find(s => {
    const sName = s.name.toLowerCase();
    return sName.includes(norm) || norm.includes(sName);
  });
  if (!match) return '#EF4444';
  return match.level >= 7 ? '#34D399' : '#F59E0B';
}

// Client-side, not another AI call — the gap topics are already known once hotTopics/skills are
// in hand, so this is plain string assembly rather than a second Model Router round trip.
// Appended to narrativeScript (not just shown as its own text block) so Amina actually SAYS it
// in the voice walkthrough — Francis's own ask, live-tested 2026-09-18: "xyz and yyt are very
// much in demand... we noticed they're not factored into your CV... course waiting on Learn."
// Follow-up the same day: a flat list of jargon with no context isn't useful on its own — each
// item now carries a "reason" (shown in the UI list), and the spoken line uses his own suggested
// framing ("sought after by hiring managers right now for your type of role") rather than just
// naming the gaps.
function buildHotTopicGapSentence(hotTopics: HotTopicWithReason[], role: string, skills: CvAnalysisResult['skills']): string {
  const gaps = hotTopics.filter(t => topicColor(t.name, skills) === '#EF4444');
  if (gaps.length === 0) return '';
  const names = gaps.map(g => g.name);
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  const plural = names.length > 1;
  return ` One more thing — ${plural ? 'these skills are' : 'this skill is'} sought after by hiring managers right now for ${role} roles, so it'd be good to get more familiar with ${plural ? 'them' : 'it'}: ${list}. We've got a course waiting for you on our Learn platform whenever you're ready.`;
}

// Full-screen modal, same CareersPanel.tsx detail-card visual language (eyebrow label, bold
// title, primary voice button up top, icon-labeled sections below) — copy-trimmed shell, new
// content. Works identically in the candidate portal, recruiter portal (audience='candidate'),
// and — via the same component, just without an authToken — the public product page.
export function CvAnalysisModal({ onClose, audience = 'self', onStudyTopic }: Props) {
  const authToken = useAuthStore(s => s.token);
  const [step, setStep] = useState<Step>('upload');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<CvAnalysisResult | null>(null);
  const [roleMatches, setRoleMatches] = useState<CvRoleMatch[]>([]);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [hotTopics, setHotTopics] = useState<HotTopicWithReason[]>([]);
  const [hotTopicsRole, setHotTopicsRole] = useState('');
  const [hotTopicsLoading, setHotTopicsLoading] = useState(false);

  // "Copy and/or Share" (Francis, 2026-09-18) — a candidate sharing their OWN CV analysis with a
  // friend or mentor. One combined action (unlike the recruiter portal's separate Save/Share
  // steps — candidates don't browse a history list here, so there's no reason to make them save
  // first): clicking Share saves the record if it isn't already, then immediately mints the link.
  const [sharing, setSharing] = useState(false);
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareError, setShareError] = useState('');

  const isRecruiterView = audience === 'candidate';
  const subjectLabel = isRecruiterView ? "This Candidate's CV" : 'Your CV';
  const rolesHeading = isRecruiterView ? 'Roles This Candidate Is Suited For' : 'Roles You Could Apply For';

  async function handleExtracted(text: string) {
    setStep('analyzing');
    setErrorMsg('');
    try {
      const analysis = await analyzeCv(text, audience, authToken);
      setResult(analysis);
      setStep('results');
      // Fire-and-forget-ish: results render immediately with an empty table, then fill in as
      // real salary matches land — matching cost, giving useful content sooner than waiting on
      // every one of 5-8 searchCareers calls to finish before showing anything at all.
      matchRolesToCareers(analysis.suggestedRoles).then(matches => {
        setRoleMatches(matches);
        setRolesLoaded(true);
        // "What's Hot for [top role]" — candidate-only (see onStudyTopic's own comment), keyed
        // off the highest-salary match since that's what the roles table already leads with.
        // Reuses generateHotTopics exactly as the intake screen's own "What's Hot" button does —
        // job-title-only, no CV context, same "what's trending for this role generally" intent.
        if (!isRecruiterView && matches[0]) {
          const topRole = matches[0].career!.title;
          setHotTopicsRole(topRole);
          setHotTopicsLoading(true);
          generateHotTopicsWithReasons(topRole).then(setHotTopics).catch(() => setHotTopics([])).finally(() => setHotTopicsLoading(false));
        }
      }).catch(() => { setRoleMatches([]); setRolesLoaded(true); });
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Something went wrong analysing this CV — please try again.');
      setStep('error');
    }
  }

  async function handleShare() {
    if (!result || !authToken) return;
    setSharing(true);
    setShareError('');
    try {
      const recordId = savedRecordId ?? (await saveCvAnalysisHistory(result, roleMatches, authToken)).id;
      setSavedRecordId(recordId);
      const { shareUrl: url } = await shareCvAnalysisHistory(recordId, authToken);
      setShareUrl(url);
    } catch (e) {
      setShareError(e instanceof Error ? e.message : 'Failed to create a share link — please try again.');
    } finally {
      setSharing(false);
    }
  }

  async function copyShareUrl() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
      >
        {/* No onClick here — an accidental click outside used to silently discard the whole
            analysis (Francis, 2026-09-18: "it needs to be a proper modal"). Closing now only
            happens via the explicit X button. */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: -12 }}
          style={{
            position: 'relative', zIndex: 1, width: '100%', maxWidth: 680, maxHeight: '85vh',
            background: '#0a0818', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 20,
            boxShadow: '0 0 100px rgba(52,211,153,0.16), 0 30px 90px rgba(0,0,0,0.55)',
            overflowY: 'auto', display: 'flex', flexDirection: 'column',
          }}
        >
          <div style={{ padding: '24px 24px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, background: '#0a0818', zIndex: 1, borderRadius: '20px 20px 0 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: ACCENT, letterSpacing: '0.06em', marginBottom: 4, textTransform: 'uppercase' }}>
                  CV Analyzer {isRecruiterView && '· Candidate Evaluation'}
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0 }}>
                  {isRecruiterView ? "What roles fit this candidate?" : "What roles could you apply for?"}
                </h2>
              </div>
              <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, color: '#9090b0', cursor: 'pointer', padding: '7px 9px', display: 'flex' }}>
                <X size={15} />
              </button>
            </div>
            {step === 'upload' && (
              <p style={{ fontSize: 12, color: '#8080b0', lineHeight: 1.7, marginTop: 10, marginBottom: 0 }}>
                {isRecruiterView
                  ? "Upload a candidate's CV — we'll break down their strengths, weaknesses, and which real roles (with real salary bands) they're genuinely suited for."
                  : "Upload your CV — we'll tell you which real roles fit, what they pay (highest first), and talk you through your strengths and weaknesses out loud."}
              </p>
            )}
            {result && step === 'results' && (
              <button
                onClick={() => setShowVoice(true)}
                style={{
                  marginTop: 14, width: '100%',
                  background: 'linear-gradient(135deg, rgba(52,211,153,0.18), rgba(52,211,153,0.10))',
                  border: '1px solid rgba(52,211,153,0.4)', borderRadius: 10,
                  padding: '10px 16px', fontSize: 12.5, fontWeight: 700, color: ACCENT,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <Mic size={14} /> {isRecruiterView ? 'Talk Me Through This CV' : 'Talk Me Through My CV'}
              </button>
            )}
          </div>

          <div style={{ padding: '24px' }}>
            {step === 'upload' && (
              <FileUpload label={isRecruiterView ? 'Candidate CV' : 'CV'} onExtracted={(text) => handleExtracted(text)} />
            )}

            {step === 'analyzing' && (
              <div style={{ padding: '20px 0' }}>
                <ChairSpinner label="Reading between the lines…" size={110} />
              </div>
            )}

            {step === 'error' && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '18px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <AlertTriangle size={16} color="#EF4444" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 13, color: '#e0dcff', lineHeight: 1.6 }}>{errorMsg}</div>
              </div>
            )}

            {step === 'results' && result && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Skills bar chart */}
                <section>
                  <SectionHeading icon={<TrendingUp size={13} />}>Skills Breakdown</SectionHeading>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {result.skills.map(s => (
                      <div key={s.name}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#c0bcd0', marginBottom: 4 }}>
                          <span style={{ fontWeight: 600 }}>{s.name}</span>
                          <span style={{ color: '#8080b0' }}>{s.yearsNote ?? ''}</span>
                        </div>
                        <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                          <motion.div
                            initial={{ width: 0 }} animate={{ width: `${s.level * 10}%` }} transition={{ duration: 0.6 }}
                            style={{ height: '100%', background: levelColor(s.level), borderRadius: 4 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Roles table */}
                <section>
                  <SectionHeading icon={<Sparkles size={13} />}>{rolesHeading}</SectionHeading>
                  {!rolesLoaded ? (
                    <div style={{ fontSize: 12, color: '#8080b0', padding: '8px 0' }}>Matching against real roles…</div>
                  ) : roleMatches.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#8080b0', padding: '8px 0', lineHeight: 1.6 }}>
                      {isRecruiterView ? "This candidate's" : 'Your'} background is senior or specialised enough that we couldn't find a close match in our current roles database — that's a gap in our database coverage, not a reflection on the CV. The skills and strengths analysis above is still accurate.
                    </div>
                  ) : (
                    <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
                      {roleMatches.map((m, i) => (
                        <div key={m.title} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '12px 14px', fontSize: 13,
                          borderBottom: i < roleMatches.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                          background: i % 2 === 1 ? 'rgba(255,255,255,0.02)' : 'transparent',
                        }}>
                          <span style={{ fontWeight: 600, color: '#fff' }}>{m.career!.title}</span>
                          <span style={{ color: ACCENT, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                            {fmtK(m.career!.salary.uk.starting)} – {fmtK(m.career!.salary.uk.expert)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* What's Hot for the top suggested role — candidate-only nudge into Learn.
                    Explicit loading line while this (third, chained) AI call is in flight — see
                    the recruiter portal's CvAnalysisResultsView.tsx for the full reasoning. */}
                {!isRecruiterView && hotTopicsLoading && hotTopics.length === 0 && (
                  <section>
                    <SectionHeading icon={<Flame size={13} />}>What's Hot for {hotTopicsRole}</SectionHeading>
                    <div style={{ fontSize: 12, color: '#8080b0', padding: '8px 0' }}>Checking what's trending for this role…</div>
                  </section>
                )}
                {!isRecruiterView && hotTopics.length > 0 && (
                  <section>
                    <SectionHeading icon={<Flame size={13} />}>What's Hot for {hotTopicsRole}</SectionHeading>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {hotTopics.map(topic => (
                        <div key={topic.name} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 10,
                          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px',
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: topicColor(topic.name, result.skills), flexShrink: 0, marginTop: 5 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{topic.name}</div>
                            <div style={{ fontSize: 11.5, color: '#8080b0', marginTop: 2, lineHeight: 1.4 }}>{topic.reason}</div>
                          </div>
                          {onStudyTopic && (
                            <button
                              onClick={() => onStudyTopic(topic.name)}
                              style={{
                                background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)',
                                borderRadius: 7, padding: '5px 10px', fontSize: 11, fontWeight: 700, color: ACCENT,
                                cursor: 'pointer', flexShrink: 0,
                              }}
                            >
                              Study on Learn →
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Strengths / weaknesses / inconsistencies */}
                <NarrativeList title="Strengths" items={result.strengths} color="#34D399" />
                <NarrativeList title="Weaknesses" items={result.weaknesses} color="#F59E0B" />
                {result.inconsistencies.length > 0 && (
                  <NarrativeList title="Inconsistencies Worth Addressing" items={result.inconsistencies} color="#EF4444" />
                )}

                {/* Share this analysis — a friend or mentor can open it without an account */}
                {!isRecruiterView && (
                  <section style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20 }}>
                    {!shareUrl ? (
                      <button
                        onClick={handleShare}
                        disabled={sharing}
                        style={{
                          width: '100%', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 10,
                          padding: '11px 16px', fontSize: 12.5, fontWeight: 700, color: '#A78BFA',
                          cursor: sharing ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          opacity: sharing ? 0.6 : 1,
                        }}
                      >
                        <Share2 size={14} /> {sharing ? 'Creating link…' : 'Share this analysis'}
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 8px 8px 14px' }}>
                        <span style={{ flex: 1, fontSize: 12, color: '#c0bcd0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shareUrl}</span>
                        <button
                          onClick={copyShareUrl}
                          style={{
                            background: shareCopied ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.06)',
                            border: 'none', borderRadius: 6, padding: '7px 12px',
                            fontSize: 11.5, fontWeight: 700, color: shareCopied ? ACCENT : '#c0bcd0', cursor: 'pointer', flexShrink: 0,
                            display: 'flex', alignItems: 'center', gap: 5,
                          }}
                        >
                          {shareCopied ? <><Check size={12} /> Copied</> : 'Copy'}
                        </button>
                      </div>
                    )}
                    {shareError && <div style={{ fontSize: 11, color: '#EF4444', marginTop: 8 }}>{shareError}</div>}
                  </section>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {showVoice && result && (
          <CvAnalysisVoiceOverlay
            narrativeScript={result.narrativeScript + (isRecruiterView ? '' : buildHotTopicGapSentence(hotTopics, hotTopicsRole, result.skills))}
            title={subjectLabel}
            onClose={() => setShowVoice(false)}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function SectionHeading({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8080b0', marginBottom: 12 }}>
      {icon} {children}
    </div>
  );
}

function NarrativeList({ title, items, color }: { title: string; items: string[]; color: string }) {
  if (items.length === 0) return null;
  return (
    <section>
      <SectionHeading icon={<span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />}>{title}</SectionHeading>
      <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((item, i) => (
          <li key={i} style={{ fontSize: 13, color: '#e0dcff', lineHeight: 1.6 }}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
