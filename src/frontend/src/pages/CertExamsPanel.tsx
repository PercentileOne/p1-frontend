import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap } from 'lucide-react';

// Thin landing panel for the "Certifications & Exams" nav tab — a picker/history view will grow
// here over time (past attempts, retake buttons); v1 is just the entry point into CertExamStart.
// No longer reads a fixed local count (the catalog is now a live, growable database via
// P1.ExamCatalogAgent — see examCatalogApi.ts) — the picker itself is where category/coverage
// is actually shown via getExamCategories().
export default function CertExamsPanel() {
  const navigate = useNavigate();

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>Certifications & Exams</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
            Fully multiple-choice mock exams, scored like the real thing — with Michelle briefing you first.
          </p>
        </div>
        <button
          onClick={() => navigate('/cert-exam/start')}
          style={{ background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 24px', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}
        >
          Start a mock exam →
        </button>
      </div>

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
        <GraduationCap size={40} color="#4F8EF7" style={{ marginBottom: 12 }} />
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
          A growing library of certifications and exams
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', maxWidth: 420, margin: '0 auto' }}>
          Search for the one you're preparing for — if we don't have it yet, let us know from the
          picker and we'll add it.
        </p>
      </div>
    </motion.div>
  );
}
