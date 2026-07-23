import { useState } from 'react';
import { PackPopup } from './PackPopup';

interface Props {
  jobDescriptionText: string;
  exampleCvText?: string;
  workspaceId?: string;
  label?: string;
}

export const EXPLAIN_CTA = 'Get Interview Pack';
export const EXPLAIN_CTA_LONG = 'Get 20 AI‑generated interview questions tailored to this exact role and your CV — free, no login needed.';

function AIDocIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }} aria-hidden="true">
      {/* Document */}
      <rect x="1.5" y="1" width="9" height="12" rx="1.5" stroke="rgba(255,255,255,0.88)" strokeWidth="1.25" fill="none" />
      <line x1="4" y1="4.5" x2="8.5" y2="4.5" stroke="rgba(255,255,255,0.65)" strokeWidth="1" strokeLinecap="round" />
      <line x1="4" y1="6.5" x2="7" y2="6.5" stroke="rgba(255,255,255,0.65)" strokeWidth="1" strokeLinecap="round" />
      <line x1="4" y1="8.5" x2="8.5" y2="8.5" stroke="rgba(255,255,255,0.65)" strokeWidth="1" strokeLinecap="round" />
      {/* AI spark */}
      <path d="M13 6.5L11.2 10h2.3L11.8 14" stroke="rgba(255,255,255,0.95)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MagicButton({ jobDescriptionText, exampleCvText, workspaceId, label = EXPLAIN_CTA }: Props) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: hovered
            ? 'linear-gradient(135deg, #1e4484 0%, #3b7de8 100%)'
            : 'linear-gradient(135deg, #1a3a6b 0%, #2563eb 100%)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: '10px',
          padding: '11px 20px',
          fontSize: '14px',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: hovered
            ? '0 4px 20px rgba(37,99,235,0.5), 0 1px 4px rgba(0,0,0,0.2)'
            : '0 2px 10px rgba(37,99,235,0.38), 0 1px 3px rgba(0,0,0,0.12)',
          transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
          transition: 'all 0.18s ease',
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
          fontFamily: 'inherit',
        }}
      >
        <AIDocIcon />
        {label}
      </button>

      {open && (
        <PackPopup
          jobDescriptionText={jobDescriptionText}
          exampleCvText={exampleCvText}
          workspaceId={workspaceId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
