import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShareModal } from '../components/ShareModal';

type VisibilityState = 'private' | 'shared' | 'public';
type InterviewType = 'video' | 'text';

interface SkillScores {
  clarity: number;
  depth: number;
  confidence: number;
  delivery: number;
}

interface InterviewRecord {
  id: string;
  type: InterviewType;
  role: string;
  company: string;
  date: string;
  duration: number; // minutes
  questionCount: number;
  score: number; // 0–100
  previousScore?: number;
  skills: SkillScores;
  visibility: VisibilityState;
  featured: boolean;
  hasRecording: boolean;
}

const MOCK_INTERVIEWS: InterviewRecord[] = [
  {
    id: 'iv-001',
    type: 'video',
    role: 'Senior Fullstack Engineer',
    company: 'Barclays',
    date: '2026-07-28T14:30:00Z',
    duration: 22,
    questionCount: 10,
    score: 84,
    previousScore: 71,
    skills: { clarity: 88, depth: 82, confidence: 79, delivery: 87 },
    visibility: 'shared',
    featured: true,
    hasRecording: true,
  },
  {
    id: 'iv-002',
    type: 'video',
    role: 'Product Manager – Payments',
    company: 'Monzo',
    date: '2026-07-25T10:15:00Z',
    duration: 18,
    questionCount: 10,
    score: 71,
    previousScore: 65,
    skills: { clarity: 74, depth: 68, confidence: 70, delivery: 72 },
    visibility: 'private',
    featured: false,
    hasRecording: true,
  },
  {
    id: 'iv-003',
    type: 'text',
    role: 'Head of Engineering',
    company: 'HSBC Digital',
    date: '2026-07-22T09:00:00Z',
    duration: 14,
    questionCount: 10,
    score: 91,
    skills: { clarity: 94, depth: 90, confidence: 88, delivery: 92 },
    visibility: 'public',
    featured: true,
    hasRecording: false,
  },
  {
    id: 'iv-004',
    type: 'text',
    role: 'Lead React Developer',
    company: 'Lloyds Banking Group',
    date: '2026-07-18T16:45:00Z',
    duration: 12,
    questionCount: 10,
    score: 58,
    previousScore: 63,
    skills: { clarity: 60, depth: 55, confidence: 54, delivery: 63 },
    visibility: 'private',
    featured: false,
    hasRecording: false,
  },
  {
    id: 'iv-005',
    type: 'video',
    role: 'Engineering Manager',
    company: 'Revolut',
    date: '2026-07-14T11:30:00Z',
    duration: 25,
    questionCount: 10,
    score: 76,
    previousScore: 76,
    skills: { clarity: 78, depth: 75, confidence: 74, delivery: 77 },
    visibility: 'private',
    featured: false,
    hasRecording: false,
  },
];

const VISIBILITY_CONFIG: Record<VisibilityState, { icon: string; label: string; next: VisibilityState; color: string; bg: string; border: string }> = {
  private: { icon: '🔒', label: 'Private', next: 'shared', color: 'rgba(255,255,255,0.35)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.10)' },
  shared:  { icon: '🔗', label: 'Link only', next: 'public', color: '#60A5FA', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.25)' },
  public:  { icon: '🌐', label: 'Public', next: 'private', color: '#34D399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.25)' },
};

function scoreColor(s: number) {
  if (s >= 80) return '#34D399';
  if (s >= 70) return '#60A5FA';
  if (s >= 50) return '#F59E0B';
  return '#EF4444';
}

function scoreLabel(s: number) {
  if (s >= 80) return 'Excellent';
  if (s >= 70) return 'Strong';
  if (s >= 50) return 'Good';
  return 'Developing';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function SkillBar({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
      <div style={{ fontSize: '10px', color: 'var(--text-3)', width: '62px', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.07)', borderRadius: '2px', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ height: '100%', background: scoreColor(value), borderRadius: '2px' }}
        />
      </div>
      <div style={{ fontSize: '11px', fontWeight: 700, color: scoreColor(value), width: '26px', textAlign: 'right', flexShrink: 0 }}>{value}</div>
    </div>
  );
}

function DeltaBadge({ current, previous }: { current: number; previous?: number }) {
  if (previous === undefined) return null;
  const delta = current - previous;
  if (delta === 0) return <span style={{ fontSize: '10px', color: 'var(--text-3)', marginLeft: '4px' }}>—</span>;
  const up = delta > 0;
  return (
    <span style={{
      fontSize: '10px', fontWeight: 700,
      color: up ? '#34D399' : '#EF4444',
      background: up ? 'rgba(52,211,153,0.12)' : 'rgba(239,68,68,0.12)',
      border: `1px solid ${up ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)'}`,
      borderRadius: '5px', padding: '1px 5px', marginLeft: '4px',
    }}>
      {up ? '▲' : '▼'} {Math.abs(delta)}
    </span>
  );
}

type FilterTab = 'all' | 'video' | 'text';

export default function InterviewHistory() {
  const [interviews, setInterviews] = useState<InterviewRecord[]>(MOCK_INTERVIEWS);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [shareTarget, setShareTarget] = useState<InterviewRecord | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = interviews.filter(iv => {
    if (filter === 'video') return iv.type === 'video';
    if (filter === 'text') return iv.type === 'text';
    return true;
  });

  const featured = filtered.filter(iv => iv.featured);
  const rest = filtered.filter(iv => !iv.featured);

  const cycleVisibility = (id: string) => {
    setInterviews(prev => prev.map(iv =>
      iv.id === id ? { ...iv, visibility: VISIBILITY_CONFIG[iv.visibility].next } : iv
    ));
  };

  const toggleFeatured = (id: string) => {
    const featuredCount = interviews.filter(iv => iv.featured).length;
    setInterviews(prev => prev.map(iv => {
      if (iv.id !== id) return iv;
      if (!iv.featured && featuredCount >= 3) return iv; // cap at 3
      return { ...iv, featured: !iv.featured };
    }));
  };

  const deleteInterview = (id: string) => {
    setInterviews(prev => prev.filter(iv => iv.id !== id));
    setDeleteConfirm(null);
  };

  const featuredCount = interviews.filter(iv => iv.featured).length;

  return (
    <div style={{ padding: '32px', maxWidth: '960px' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>My Interviews</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-2)', margin: 0 }}>
          Your full interview history — review scores, manage visibility, and share your best sessions.
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '24px' }}>
        {([
          { key: 'all',   label: 'All',        count: interviews.length },
          { key: 'video', label: '🎥 Video',   count: interviews.filter(iv => iv.type === 'video').length },
          { key: 'text',  label: '📝 Text',    count: interviews.filter(iv => iv.type === 'text').length },
        ] as { key: FilterTab; label: string; count: number }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              background: filter === tab.key ? 'rgba(79,142,247,0.15)' : 'var(--bg2)',
              border: `1px solid ${filter === tab.key ? 'rgba(79,142,247,0.4)' : 'var(--border)'}`,
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: filter === tab.key ? 700 : 500,
              color: filter === tab.key ? '#4F8EF7' : 'var(--text-2)',
              cursor: 'pointer',
              display: 'flex',
              gap: '6px',
              alignItems: 'center',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
            <span style={{ fontSize: '11px', background: filter === tab.key ? 'rgba(79,142,247,0.2)' : 'rgba(255,255,255,0.07)', borderRadius: '5px', padding: '1px 6px', fontWeight: 700 }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Featured section */}
      <AnimatePresence>
        {featured.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(251,191,36,0.7)' }}>⭐ Featured</span>
              <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Pinned to top of your public profile · {featuredCount}/3</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {featured.map((iv, i) => (
                <InterviewRow
                  key={iv.id}
                  iv={iv}
                  index={i}
                  onShare={() => setShareTarget(iv)}
                  onDelete={() => setDeleteConfirm(iv.id)}
                  onCycleVisibility={() => cycleVisibility(iv.id)}
                  onToggleFeatured={() => toggleFeatured(iv.id)}
                  featuredCount={featuredCount}
                  highlighted
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* All other interviews */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {rest.length === 0 && featured.length === 0 && (
          <div style={{ color: 'var(--text-3)', fontSize: '14px', padding: '48px 0', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
            <div style={{ fontWeight: 700, color: 'var(--text-2)', marginBottom: '6px' }}>No interviews yet</div>
            <div style={{ fontSize: '13px' }}>Complete an interview to see your history here.</div>
          </div>
        )}
        {rest.map((iv, i) => (
          <InterviewRow
            key={iv.id}
            iv={iv}
            index={i}
            onShare={() => setShareTarget(iv)}
            onDelete={() => setDeleteConfirm(iv.id)}
            onCycleVisibility={() => cycleVisibility(iv.id)}
            onToggleFeatured={() => toggleFeatured(iv.id)}
            featuredCount={featuredCount}
          />
        ))}
      </div>

      {/* Delete confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, backdropFilter: 'blur(4px)' }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                background: 'var(--bg2)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '16px', padding: '28px', width: '320px', zIndex: 101,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🗑️</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>Delete interview?</div>
              <div style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '24px' }}>
                This cannot be undone. Your scores and transcript will be permanently removed.
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px', color: 'var(--text-2)', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteInterview(deleteConfirm)}
                  style={{ flex: 1, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '10px', padding: '10px', color: '#EF4444', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Share modal */}
      {shareTarget && (
        <ShareModal
          role={shareTarget.role}
          company={shareTarget.company}
          score={shareTarget.score}
          shareUrl={`https://candidate.explain.global/shared/${shareTarget.id}`}
          onClose={() => setShareTarget(null)}
        />
      )}
    </div>
  );
}

function InterviewRow({
  iv, index, onShare, onDelete, onCycleVisibility, onToggleFeatured, featuredCount, highlighted,
}: {
  iv: InterviewRecord;
  index: number;
  onShare: () => void;
  onDelete: () => void;
  onCycleVisibility: () => void;
  onToggleFeatured: () => void;
  featuredCount: number;
  highlighted?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const vis = VISIBILITY_CONFIG[iv.visibility];
  const canFeature = iv.featured || featuredCount < 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      style={{
        background: highlighted ? 'rgba(251,191,36,0.04)' : 'var(--bg2)',
        border: `1px solid ${highlighted ? 'rgba(251,191,36,0.18)' : 'var(--border)'}`,
        borderLeft: `3px solid ${iv.type === 'video' ? '#4F8EF7' : '#a78bfa'}`,
        borderRadius: '14px',
        overflow: 'hidden',
      }}
    >
      {/* Main row */}
      <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>

        {/* Type badge */}
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
          background: iv.type === 'video' ? 'rgba(79,142,247,0.12)' : 'rgba(167,139,250,0.12)',
          border: `1px solid ${iv.type === 'video' ? 'rgba(79,142,247,0.25)' : 'rgba(167,139,250,0.25)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px',
        }}>
          {iv.type === 'video' ? '🎥' : '📝'}
        </div>

        {/* Role / company / meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '3px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{iv.role}</span>
            {iv.featured && <span style={{ fontSize: '11px' }}>⭐</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{iv.company}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>·</span>
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{formatDate(iv.date)} at {formatTime(iv.date)}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>·</span>
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{iv.duration} min · {iv.questionCount}Q</span>
            {iv.hasRecording && (
              <>
                <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>·</span>
                <span style={{ fontSize: '11px', color: '#60A5FA', fontWeight: 600 }}>🎙 Recording saved</span>
              </>
            )}
          </div>
        </div>

        {/* Score */}
        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '110px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', marginBottom: '3px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1px' }}>
              <span style={{ fontSize: '28px', fontWeight: 900, color: scoreColor(iv.score), fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {iv.score}
              </span>
              <span style={{ fontSize: '14px', color: 'var(--text-3)', fontWeight: 700 }}>%</span>
            </div>
            <DeltaBadge current={iv.score} previous={iv.previousScore} />
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: scoreColor(iv.score), textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {scoreLabel(iv.score)}
          </div>
        </div>

        {/* Expand chevron */}
        <div style={{ color: 'var(--text-3)', fontSize: '12px', flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px 20px', display: 'grid', gridTemplateColumns: '1fr auto', gap: '20px', alignItems: 'start' }}>

              {/* Skill bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '4px' }}>
                  Skill Breakdown
                </div>
                <SkillBar label="Clarity" value={iv.skills.clarity} />
                <SkillBar label="Depth" value={iv.skills.depth} />
                <SkillBar label="Confidence" value={iv.skills.confidence} />
                <SkillBar label="Delivery" value={iv.skills.delivery} />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'stretch', minWidth: '160px' }}>

                {/* Visibility toggle */}
                <button
                  onClick={e => { e.stopPropagation(); onCycleVisibility(); }}
                  title={`Currently ${vis.label} — click to change`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: vis.bg, border: `1px solid ${vis.border}`,
                    borderRadius: '8px', padding: '9px 12px',
                    color: vis.color, fontSize: '12px', fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <span>{vis.icon}</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>{vis.label}</span>
                  <span style={{ fontSize: '10px', opacity: 0.6 }}>↻</span>
                </button>

                {/* Feature toggle */}
                <button
                  onClick={e => { e.stopPropagation(); onToggleFeatured(); }}
                  disabled={!canFeature}
                  title={iv.featured ? 'Remove from featured' : featuredCount >= 3 ? 'Remove another to feature this one' : 'Pin to top of profile'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: iv.featured ? 'rgba(251,191,36,0.10)' : 'var(--bg3)',
                    border: `1px solid ${iv.featured ? 'rgba(251,191,36,0.3)' : 'var(--border)'}`,
                    borderRadius: '8px', padding: '9px 12px',
                    color: iv.featured ? 'rgba(251,191,36,0.9)' : canFeature ? 'var(--text-2)' : 'var(--text-3)',
                    fontSize: '12px', fontWeight: 700,
                    cursor: canFeature ? 'pointer' : 'not-allowed',
                    opacity: canFeature ? 1 : 0.5,
                    transition: 'all 0.15s',
                  }}
                >
                  <span>⭐</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>{iv.featured ? 'Featured' : 'Feature this'}</span>
                </button>

                {/* Share */}
                <button
                  onClick={e => { e.stopPropagation(); onShare(); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'rgba(79,142,247,0.10)', border: '1px solid rgba(79,142,247,0.25)',
                    borderRadius: '8px', padding: '9px 12px',
                    color: '#4F8EF7', fontSize: '12px', fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                  <span>Share</span>
                </button>

                {/* Delete */}
                <button
                  onClick={e => { e.stopPropagation(); onDelete(); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)',
                    borderRadius: '8px', padding: '9px 12px',
                    color: 'rgba(239,68,68,0.6)', fontSize: '12px', fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
