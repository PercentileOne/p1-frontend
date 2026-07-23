import { useState } from 'react';
import { motion } from 'framer-motion';

interface PackSummary {
  packId: string;
  title: string;
  questionCount: number;
  createdAt: string;
  status: 'ready' | 'pending';
}

const MOCK_HISTORY: PackSummary[] = [
  { packId: 'pack-001', title: 'Senior Software Engineer – FinTech Platform', questionCount: 8, createdAt: '2026-07-21T10:32:00Z', status: 'ready' },
  { packId: 'pack-002', title: 'Head of Engineering – Digital Transformation', questionCount: 10, createdAt: '2026-07-20T14:15:00Z', status: 'ready' },
  { packId: 'pack-003', title: 'Product Manager – Payments', questionCount: 7, createdAt: '2026-07-18T09:02:00Z', status: 'ready' },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PackHistory() {
  const [search, setSearch] = useState('');

  const filtered = MOCK_HISTORY.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>Pack History</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-2)', margin: 0 }}>All interview packs generated in this workspace.</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search packs…"
          style={{
            width: '100%', maxWidth: '360px', background: 'var(--bg3)', border: '1px solid var(--border)',
            borderRadius: '9px', padding: '10px 14px', color: 'var(--text)', fontSize: '13px', outline: 'none',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.length === 0 && (
          <div style={{ color: 'var(--text-3)', fontSize: '14px', padding: '32px 0', textAlign: 'center' }}>No packs found.</div>
        )}
        {filtered.map((pack, i) => (
          <motion.div
            key={pack.packId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>{pack.title}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{pack.questionCount} questions · Created {formatDate(pack.createdAt)}</div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => window.open(`/candidate/practice/${pack.packId}`, '_blank')}
                style={{ background: 'var(--bg3)', color: 'var(--green)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Interview Room
              </button>
              <button
                style={{ background: 'var(--bg3)', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Download
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
