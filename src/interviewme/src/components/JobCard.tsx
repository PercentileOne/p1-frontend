import type { Job } from '../data/mockJobs';
import { SECTOR_COLORS } from '../data/mockJobs';

interface Props {
  job: Job;
  onPrepare: (job: Job) => void;
}

export function JobCard({ job, onPrepare }: Props) {
  const sectorColor = SECTOR_COLORS[job.sector] ?? { bg: '#1e1e3a', text: '#9090d0' };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: job.featured
        ? '1.5px solid rgba(120,80,255,0.45)'
        : '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14,
      padding: '20px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      transition: 'transform 0.15s, box-shadow 0.15s',
      position: 'relative',
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(120,80,255,0.15)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = '';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '';
      }}
    >
      {job.featured && (
        <div style={{
          position: 'absolute', top: 12, right: 14,
          background: 'rgba(120,80,255,0.2)',
          color: '#b09fff',
          fontSize: 11, fontWeight: 700,
          padding: '2px 8px', borderRadius: 4,
          letterSpacing: '0.04em',
        }}>★ FEATURED</div>
      )}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: 'rgba(120,80,255,0.15)',
          border: '1px solid rgba(120,80,255,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 800, color: '#b09fff',
          flexShrink: 0,
        }}>
          {job.logo}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f0edff', lineHeight: 1.3, marginBottom: 2 }}>
            {job.title}
          </div>
          <div style={{ fontSize: 13, color: '#8080a8' }}>{job.company}</div>
        </div>
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <MetaChip icon="📍">{job.location}</MetaChip>
        <MetaChip icon="💷">{job.salary}</MetaChip>
        <MetaChip icon="🗂️">{job.type}</MetaChip>
        <div style={{
          fontSize: 11, fontWeight: 600,
          padding: '3px 8px', borderRadius: 4,
          background: sectorColor.bg, color: sectorColor.text,
        }}>
          {job.sector}
        </div>
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {job.tags.map(tag => (
          <span key={tag} style={{
            fontSize: 11, color: '#7070a0',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 4, padding: '2px 7px',
          }}>{tag}</span>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={() => onPrepare(job)}
        style={{
          width: '100%',
          background: 'linear-gradient(135deg, #7b5cf5, #5b8ff7)',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          padding: '12px',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          marginTop: 4,
        }}
      >
        Prepare for this interview →
      </button>
    </div>
  );
}

function MetaChip({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 12, color: '#8080a8', display: 'flex', alignItems: 'center', gap: 4 }}>
      <span>{icon}</span>{children}
    </span>
  );
}
