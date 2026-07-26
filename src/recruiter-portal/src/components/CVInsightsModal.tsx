import { useState, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, ChevronDown, ChevronUp } from 'lucide-react';
import type { CvParseResponse } from '../api/explainApi';
import { explainApi } from '../api/explainApi';
import { MOCK_CV_DATA } from '../data/mockCvData';

type RichCv = CvParseResponse & { hobbies?: string[]; languages?: string[] };

interface Props {
  candidateId: number;
  candidateName: string;
  candidateRole: string;
  candidateInitials: string;
  onClose: () => void;
}

const TABS = ['Snapshot', 'Experience', 'Skills', 'Achievements', 'Education'] as const;
type Tab = typeof TABS[number];

// ── Chip ───────────────────────────────────────────────────────────────────────
function Chip({ label, color = '#4F8EF7', dim }: { label: string; color?: string; dim?: boolean }) {
  return (
    <span style={{
      display: 'inline-block',
      fontSize: 11, fontWeight: 600,
      color: dim ? 'var(--text-3)' : color,
      background: dim ? 'rgba(255,255,255,0.05)' : `${color}18`,
      border: `1px solid ${dim ? 'var(--border)' : `${color}30`}`,
      borderRadius: 20, padding: '3px 10px',
    }}>
      {label}
    </span>
  );
}

// ── Section heading ────────────────────────────────────────────────────────────
function SectionHead({ children }: { children: ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
      textTransform: 'uppercase', color: 'var(--text-3)',
      marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

// ── Experience card ────────────────────────────────────────────────────────────
function ExperienceCard({ entry }: { entry: RichCv['experience'][0] }) {
  const [open, setOpen] = useState(false);
  const initials = entry.company.split(' ').map(w => w[0]).slice(0, 2).join('');

  return (
    <div style={{
      background: 'var(--bg3)', border: '1px solid var(--border)',
      borderRadius: 12, overflow: 'hidden', marginBottom: 10,
    }}>
      {/* Header row — always visible */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '14px 18px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 14,
        }}
      >
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg,rgba(79,142,247,0.25),rgba(167,139,250,0.2))',
          border: '1px solid rgba(79,142,247,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 800, color: '#4F8EF7',
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{entry.role}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{entry.company} · {entry.period}</div>
        </div>
        <div style={{ flexShrink: 0, color: 'var(--text-3)' }}>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--border)' }}>
              {entry.responsibilities.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <SectionHead>Responsibilities</SectionHead>
                  <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {entry.responsibilities.map((r, i) => (
                      <li key={i} style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              {entry.achievements.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <SectionHead>Achievements</SectionHead>
                  <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {entry.achievements.map((a, i) => (
                      <li key={i} style={{ fontSize: 12, color: '#34D399', lineHeight: 1.6 }}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
              {entry.technologies.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <SectionHead>Technologies</SectionHead>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {entry.technologies.map(t => <Chip key={t} label={t} />)}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Achievement card ───────────────────────────────────────────────────────────
function AchievementCard({ text, index }: { text: string; index: number }) {
  const colors = ['#34D399', '#4F8EF7', '#F59E0B', '#A78BFA', '#F472B6'];
  const color = colors[index % colors.length];
  return (
    <div style={{
      background: `${color}08`,
      border: `1px solid ${color}25`,
      borderLeft: `3px solid ${color}`,
      borderRadius: '0 10px 10px 0',
      padding: '12px 16px',
      marginBottom: 10,
    }}>
      <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{text}</div>
    </div>
  );
}

// ── Main modal ─────────────────────────────────────────────────────────────────
export function CVInsightsModal({ candidateId, candidateName, candidateRole, candidateInitials, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('Snapshot');
  const [parsed, setParsed] = useState<RichCv | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [showParsePanel, setShowParsePanel] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const data: RichCv | null = parsed ?? MOCK_CV_DATA[candidateId] ?? null;

  const handleFile = async (file: File) => {
    const text = await file.text();
    parseCV(text);
  };

  const parseCV = async (text: string) => {
    if (!text.trim()) return;
    setParsing(true);
    setParseError('');
    try {
      const result = await explainApi.cvParse({ cvText: text });
      setParsed(result as RichCv);
      setShowParsePanel(false);
    } catch {
      setParseError('Could not parse CV — check your connection and try again.');
    } finally {
      setParsing(false);
    }
  };

  const seniority = data?.seniority ?? '—';
  const years = data?.yearsOfExperience;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.65)',
        zIndex: 200,
        display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end',
      }}
    >
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        style={{
          width: 'min(680px, 90vw)',
          background: 'var(--bg)',
          borderLeft: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          height: '100%', overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg,#4F8EF7,#7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 800, color: '#fff',
          }}>
            {candidateInitials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>
                {data ? `${data.firstName} ${data.lastName}` : candidateName}
              </div>
              {seniority !== '—' && (
                <span style={{ fontSize: 10, fontWeight: 700, color: '#4F8EF7', background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: 20, padding: '2px 9px' }}>
                  {seniority}
                </span>
              )}
              {years != null && (
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{years} yrs experience</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>{candidateRole}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => setShowParsePanel(p => !p)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 12px', borderRadius: 8, cursor: 'pointer',
                background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.25)',
                color: '#4F8EF7', fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
              }}
            >
              <Upload size={12} /> Parse live CV
            </button>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 4 }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Parse panel ── */}
        <AnimatePresence>
          {showParsePanel && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden', flexShrink: 0 }}
            >
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Upload or paste a CV to parse with AI
                </div>
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: '2px dashed rgba(79,142,247,0.3)', borderRadius: 10,
                    padding: '16px', textAlign: 'center', cursor: 'pointer',
                    marginBottom: 10,
                  }}
                >
                  <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    {parsing ? 'Parsing…' : 'Drop PDF / Word / TXT here, or click to browse'}
                  </div>
                </div>
                <textarea
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  placeholder="…or paste CV text here"
                  rows={4}
                  style={{
                    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: 10, color: 'var(--text)', fontSize: 12,
                    resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                    marginBottom: 8,
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={() => parseCV(pasteText)}
                    disabled={parsing || pasteText.trim().length < 30}
                    style={{
                      background: pasteText.trim().length >= 30 ? 'var(--blue)' : 'rgba(79,142,247,0.25)',
                      color: '#fff', border: 'none', borderRadius: 8,
                      padding: '8px 18px', fontSize: 12, fontWeight: 700,
                      cursor: pasteText.trim().length >= 30 ? 'pointer' : 'default',
                      fontFamily: 'inherit',
                    }}
                  >
                    {parsing ? 'Parsing…' : 'Parse CV →'}
                  </button>
                  {parseError && <span style={{ fontSize: 12, color: '#EF4444' }}>{parseError}</span>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Tab nav ── */}
        <div style={{
          display: 'flex', gap: 2, padding: '12px 24px 0',
          borderBottom: '1px solid var(--border)', flexShrink: 0, overflowX: 'auto',
        }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px', border: 'none', background: 'none',
                cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 13, fontWeight: activeTab === tab ? 700 : 500,
                color: activeTab === tab ? '#4F8EF7' : 'var(--text-3)',
                borderBottom: `2px solid ${activeTab === tab ? '#4F8EF7' : 'transparent'}`,
                whiteSpace: 'nowrap', transition: 'all 0.15s',
                marginBottom: -1,
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {!data ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)', fontSize: 13 }}>
              No CV data available. Use "Parse live CV" above to upload a real CV.
            </div>
          ) : (

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >

                {/* ── SNAPSHOT ── */}
                {activeTab === 'Snapshot' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                    {/* Stats row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                      {[
                        { label: 'Experience', value: data.yearsOfExperience != null ? `${data.yearsOfExperience} yrs` : '—' },
                        { label: 'Seniority', value: data.seniority },
                        { label: 'Industries', value: data.industries.length.toString() },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px', textAlign: 'center' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Summary */}
                    {data.summary && (
                      <div>
                        <SectionHead>Professional Summary</SectionHead>
                        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.75, margin: 0 }}>{data.summary}</p>
                      </div>
                    )}

                    {/* Companies */}
                    {data.companies.length > 0 && (
                      <div>
                        <SectionHead>Companies</SectionHead>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {data.companies.map(c => (
                            <div key={c} style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              background: 'var(--bg2)', border: '1px solid var(--border)',
                              borderRadius: 8, padding: '7px 12px',
                            }}>
                              <div style={{
                                width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                                background: 'linear-gradient(135deg,rgba(79,142,247,0.2),rgba(167,139,250,0.15))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 9, fontWeight: 800, color: '#4F8EF7',
                              }}>
                                {c.split(' ').map(w => w[0]).slice(0, 2).join('')}
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>{c}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Top skills */}
                    {data.skills.length > 0 && (
                      <div>
                        <SectionHead>Top Skills</SectionHead>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {data.skills.slice(0, 12).map(s => <Chip key={s} label={s} />)}
                          {data.skills.length > 12 && <Chip label={`+${data.skills.length - 12} more`} dim />}
                        </div>
                      </div>
                    )}

                    {/* Industries */}
                    {data.industries.length > 0 && (
                      <div>
                        <SectionHead>Industries</SectionHead>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {data.industries.map(i => <Chip key={i} label={i} color="#A78BFA" />)}
                        </div>
                      </div>
                    )}

                    {/* Languages */}
                    {data.languages && data.languages.length > 0 && (
                      <div>
                        <SectionHead>Languages</SectionHead>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {data.languages.map(l => <Chip key={l} label={l} color="#34D399" />)}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── EXPERIENCE ── */}
                {activeTab === 'Experience' && (
                  <div>
                    {data.experience.length === 0
                      ? <div style={{ color: 'var(--text-3)', fontSize: 13 }}>No experience entries parsed.</div>
                      : data.experience.map((e, i) => <ExperienceCard key={i} entry={e} />)
                    }
                  </div>
                )}

                {/* ── SKILLS ── */}
                {activeTab === 'Skills' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {data.skills.length > 0 && (
                      <div>
                        <SectionHead>All Skills</SectionHead>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                          {data.skills.map(s => <Chip key={s} label={s} />)}
                        </div>
                      </div>
                    )}
                    {data.keywords.length > 0 && (
                      <div>
                        <SectionHead>Keywords</SectionHead>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                          {data.keywords.map(k => <Chip key={k} label={k} color="#F59E0B" />)}
                        </div>
                      </div>
                    )}
                    {data.industries.length > 0 && (
                      <div>
                        <SectionHead>Industries</SectionHead>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                          {data.industries.map(i => <Chip key={i} label={i} color="#A78BFA" />)}
                        </div>
                      </div>
                    )}
                    {data.roles.length > 0 && (
                      <div>
                        <SectionHead>Roles Held</SectionHead>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                          {data.roles.map(r => <Chip key={r} label={r} color="#34D399" />)}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── ACHIEVEMENTS ── */}
                {activeTab === 'Achievements' && (
                  <div>
                    {data.achievements.length === 0
                      ? <div style={{ color: 'var(--text-3)', fontSize: 13 }}>No achievements extracted.</div>
                      : (
                        <>
                          <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
                            {data.achievements.length} notable achievement{data.achievements.length !== 1 ? 's' : ''} extracted from this CV.
                          </div>
                          {data.achievements.map((a, i) => <AchievementCard key={i} text={a} index={i} />)}
                        </>
                      )
                    }
                  </div>
                )}

                {/* ── EDUCATION ── */}
                {activeTab === 'Education' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {data.education.length > 0 && (
                      <div>
                        <SectionHead>Education</SectionHead>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {data.education.map((e, i) => (
                            <div key={i} style={{
                              background: 'var(--bg2)', border: '1px solid var(--border)',
                              borderRadius: 10, padding: '12px 16px',
                              fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6,
                            }}>
                              {e}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {data.certifications.length > 0 && (
                      <div>
                        <SectionHead>Certifications</SectionHead>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {data.certifications.map((c, i) => (
                            <div key={i} style={{
                              background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.15)',
                              borderRadius: 10, padding: '10px 16px',
                              fontSize: 13, color: '#4F8EF7', fontWeight: 600,
                            }}>
                              🏅 {c}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {data.hobbies && data.hobbies.length > 0 && (
                      <div>
                        <SectionHead>Interests &amp; Hobbies</SectionHead>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                          {data.hobbies.map(h => <Chip key={h} label={h} color="#F472B6" />)}
                        </div>
                      </div>
                    )}
                    {data.languages && data.languages.length > 0 && (
                      <div>
                        <SectionHead>Languages</SectionHead>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                          {data.languages.map(l => <Chip key={l} label={l} color="#34D399" />)}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* ── Footer actions ── */}
        <div style={{
          padding: '14px 24px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap',
        }}>
          <button style={{
            flex: 1, padding: '10px', borderRadius: 8, fontFamily: 'inherit',
            background: 'var(--blue)', border: 'none', color: '#fff',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>
            + Generate Interview Pack
          </button>
          <button style={{
            flex: 1, padding: '10px', borderRadius: 8, fontFamily: 'inherit',
            background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-2)',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>
            Shortlist Candidate
          </button>
          <button style={{
            padding: '10px 16px', borderRadius: 8, fontFamily: 'inherit',
            background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-3)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            Download CV
          </button>
        </div>
      </motion.div>
    </div>
  );
}
