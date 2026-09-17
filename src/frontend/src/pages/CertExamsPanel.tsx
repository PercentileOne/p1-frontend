import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, Globe, Lock, Trash2, ChevronUp, ChevronDown, X } from 'lucide-react';
import { useAuthStore } from '../auth/authStore';
import { listCertExams, shareCertExamSession, unshareCertExamSession, deleteCertExamSession, type CertExamSummaryRow } from '../api/certExamApi';

type SortKey = 'createdAt' | 'certName' | 'scaledScore';

const thStyle: React.CSSProperties = {
  padding: '12px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: 'var(--text-3)', textAlign: 'left',
  whiteSpace: 'nowrap', userSelect: 'none',
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
    + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// Landing panel for the "Certifications & Exams" nav tab — the picker CTA plus a real,
// search/sortable history list of the candidate's own past attempts, same style as
// MyInterviewsPage.tsx (search box, sortable column headers, visibility toggle, delete).
// GET /api/cert-exams was already built in Phase 1's backend but never wired to a frontend
// list until now. No bulk-visibility menu or pagination yet — at cert-exam volume today that's
// more chrome than the list needs; add if it ever grows past a page or two.
export default function CertExamsPanel() {
  const navigate = useNavigate();
  const authToken = useAuthStore(s => s.token);
  const candidateId = useAuthStore(s => s.user?.id);

  const [items, setItems] = useState<CertExamSummaryRow[] | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [toggleError, setToggleError] = useState<string | null>(null);

  useEffect(() => {
    if (!authToken) return;
    listCertExams(authToken).then(setItems);
  }, [authToken]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  }

  async function toggleVisibility(item: CertExamSummaryRow) {
    if (!candidateId || !authToken) return;
    const nextPublic = !item.isShared;
    setToggleError(null);
    setTogglingIds(prev => new Set(prev).add(item.id));
    setItems(prev => prev?.map(i => (i.id === item.id ? { ...i, isShared: nextPublic } : i)) ?? null);
    try {
      if (nextPublic) await shareCertExamSession(authToken, candidateId, item.id);
      else await unshareCertExamSession(authToken, candidateId, item.id);
    } catch {
      setItems(prev => prev?.map(i => (i.id === item.id ? { ...i, isShared: !nextPublic } : i)) ?? null);
      setToggleError(`Couldn't update "${item.certName}" — try again.`);
    } finally {
      setTogglingIds(prev => { const next = new Set(prev); next.delete(item.id); return next; });
    }
  }

  function handleDelete(item: CertExamSummaryRow) {
    setItems(prev => prev?.filter(i => i.id !== item.id) ?? null);
    if (candidateId && authToken) {
      void deleteCertExamSession(authToken, candidateId, item.id);
    }
  }

  const filtered = (items ?? [])
    .filter(i => {
      const q = search.toLowerCase();
      if (!q) return true;
      return i.certName.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const av = sortKey === 'scaledScore' ? a.scaledScore : a[sortKey];
      const bv = sortKey === 'scaledScore' ? b.scaledScore : b[sortKey];
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span style={{ opacity: 0.25, marginLeft: 4 }}>↕</span>;
    return sortDir === 'asc'
      ? <ChevronUp size={11} style={{ marginLeft: 3, verticalAlign: 'middle' }} />
      : <ChevronDown size={11} style={{ marginLeft: 3, verticalAlign: 'middle' }} />;
  }

  const sortableTh = (label: string, key: SortKey) => (
    <th key={key} style={{ ...thStyle, cursor: 'pointer' }} onClick={() => toggleSort(key)}>
      {label}<SortIcon k={key} />
    </th>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>Certifications & Exams</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
            {items === null ? 'Fully multiple-choice mock exams, scored like the real thing — with Michelle briefing you first.' : `${items.length} attempt${items.length === 1 ? '' : 's'} · ${items.filter(i => i.passed).length} passed`}
          </p>
        </div>
        <button
          onClick={() => navigate('/cert-exam/start')}
          style={{ background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 24px', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}
        >
          Start a mock exam →
        </button>
      </div>

      {toggleError && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
          {toggleError}
          <button onClick={() => setToggleError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', display: 'flex', padding: 0 }}><X size={13} /></button>
        </div>
      )}

      {items && items.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ position: 'relative', maxWidth: 320 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search certification or exam…"
              style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 36px 9px 14px', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }} />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 2 }}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {!items || items.length === 0 ? (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
          <GraduationCap size={40} color="#4F8EF7" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            {items === null ? 'Loading your past attempts…' : 'A growing library of certifications and exams'}
          </div>
          {items !== null && (
            <p style={{ fontSize: '13px', color: 'var(--text-3)', maxWidth: 420, margin: '0 auto' }}>
              Search for the one you're preparing for — if we don't have it yet, let us know from the
              picker and we'll add it.
            </p>
          )}
        </div>
      ) : (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {sortableTh('Certification', 'certName')}
                {sortableTh('Date', 'createdAt')}
                {sortableTh('Result', 'scaledScore')}
                <th style={thStyle}>Visibility</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => (
                <tr key={item.id}
                  onClick={() => navigate(`/cert-exam-summary/${item.id}`)}
                  style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 1 ? 'rgba(255,255,255,0.025)' : 'transparent', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,142,247,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 1 ? 'rgba(255,255,255,0.025)' : 'transparent')}
                >
                  <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{item.certName}</td>
                  <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-2)' }}>{fmtDate(item.createdAt)}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: item.passed ? '#34D399' : '#EF4444', background: item.passed ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)', padding: '4px 10px', borderRadius: 20 }}>
                      {item.passed ? 'Passed' : 'Not yet'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 8 }}>{item.scaledScore}/{item.maxScore}</span>
                  </td>
                  <td style={{ padding: '14px 16px' }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => toggleVisibility(item)}
                      disabled={togglingIds.has(item.id)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: togglingIds.has(item.id) ? 'default' : 'pointer', padding: 0, fontFamily: 'inherit', opacity: togglingIds.has(item.id) ? 0.5 : 1 }}
                    >
                      {item.isShared ? <Globe size={13} color="#34D399" /> : <Lock size={13} color="var(--text-3)" />}
                      <span style={{ fontSize: 11, fontWeight: 700, color: item.isShared ? '#34D399' : 'var(--text-3)' }}>{item.isShared ? 'Public' : 'Private'}</span>
                    </button>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                    <button title="Delete" onClick={() => handleDelete(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'inline-flex', padding: 2, opacity: 0.6 }}>
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
