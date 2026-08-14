import { useState } from 'react';
import { MOCK_JOBS } from '../data/mockJobs';
import { JobCard } from '../components/JobCard';
import type { Job } from '../data/mockJobs';

const SECTORS = ['All', ...Array.from(new Set(MOCK_JOBS.map(j => j.sector)))];
const TYPES = ['All Types', 'Permanent', 'Contract', 'Interim'];

export default function Jobs() {
  const [sector, setSector] = useState('All');
  const [type, setType] = useState('All Types');
  const [search, setSearch] = useState('');

  const filtered = MOCK_JOBS.filter(j => {
    if (sector !== 'All' && j.sector !== sector) return false;
    if (type !== 'All Types' && j.type !== type) return false;
    if (search) {
      const q = search.toLowerCase();
      return j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.tags.some(t => t.toLowerCase().includes(q));
    }
    return true;
  });

  function handlePrepare(job: Job) {
    if (job.id === 'j1') {
      window.open('https://recruiter.explain.global/demo/vallum-job-paid', '_blank');
    } else {
      window.open('https://recruiter.explain.global/demo/vallum-job-paid', '_blank');
    }
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px' }}>
      {/* Page header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#7b5cf5', letterSpacing: '0.06em', marginBottom: 8 }}>✦ JOB BOARD</div>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: '#fff', marginBottom: 12 }}>Find your next role</h1>
        <p style={{ fontSize: 15, color: '#8080b0' }}>
          Every listing comes with an AI-powered Interview Pack. One click to prepare.
        </p>
      </div>

      {/* Magic Button */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(120,80,255,0.15), rgba(60,100,255,0.1))',
        border: '1.5px solid rgba(120,80,255,0.35)',
        borderRadius: 14, padding: '24px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
        marginBottom: 40,
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#e0dcff', marginBottom: 4 }}>
            ✦ Magic Button — Get your Interview Pack in 60 seconds
          </div>
          <div style={{ fontSize: 13, color: '#8080b0' }}>
            Paste a job spec. Upload your CV. Instant AI-tailored pack — 20 questions, company intel, STAR models.
          </div>
        </div>
        <button
          onClick={() => window.open('https://recruiter.explain.global/demo/vallum-job-paid', '_blank')}
          style={{
            background: 'linear-gradient(135deg, #7b5cf5, #5b8ff7)',
            color: '#fff', border: 'none',
            borderRadius: 10, padding: '12px 22px',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            flexShrink: 0,
          }}>
          Try the Magic Button →
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search roles, companies, skills..."
          style={{
            flex: 1, minWidth: 220,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, padding: '9px 14px',
            color: '#e0dcff', fontSize: 13,
            outline: 'none',
          }}
        />
        <FilterSelect value={sector} onChange={setSector} options={SECTORS} />
        <FilterSelect value={type} onChange={setType} options={TYPES} />
      </div>

      {/* Results count */}
      <div style={{ fontSize: 13, color: '#6060a0', marginBottom: 20 }}>
        {filtered.length} role{filtered.length !== 1 ? 's' : ''} found
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {filtered.map(job => (
            <JobCard key={job.id} job={job} onPrepare={handlePrepare} />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#6060a0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>No roles match your filters</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Try adjusting the sector or search term</div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 8, padding: '9px 12px',
        color: '#c0c0e0', fontSize: 13, cursor: 'pointer',
        outline: 'none',
      }}
    >
      {options.map(o => <option key={o} value={o} style={{ background: '#0d0c1e' }}>{o}</option>)}
    </select>
  );
}
