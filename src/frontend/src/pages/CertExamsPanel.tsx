import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap } from 'lucide-react';
import { CERTIFICATION_BANK } from '../data/certificationBank';

// Thin landing panel for the "Certifications & Exams" nav tab — a picker/history view will grow
// here over time (past attempts, retake buttons); v1 is just the entry point into CertExamStart.
export default function CertExamsPanel() {
  const navigate = useNavigate();
  const enabledCount = CERTIFICATION_BANK.filter(c => c.enabled).length;
  const comingSoonCount = CERTIFICATION_BANK.length - enabledCount;

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
          {enabledCount} exam{enabledCount === 1 ? '' : 's'} ready now, {comingSoonCount} more on the way
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', maxWidth: 420, margin: '0 auto' }}>
          Professional certifications and GCSE/A-Level exams are being added over time. Pick a
          ready exam to take a mock run, or check back soon for more.
        </p>
      </div>
    </motion.div>
  );
}
