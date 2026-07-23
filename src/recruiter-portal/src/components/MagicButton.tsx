import { useState } from 'react';
import { PackPopup } from './PackPopup';

interface Props {
  jobDescriptionText: string;
  exampleCvText?: string;
  workspaceId?: string;
  label?: string;
}

export const EXPLAIN_CTA = '⚡ Get 20 AI-generated interview questions — free';
export const EXPLAIN_CTA_LONG = 'Get 20 AI-generated interview questions tailored to this exact role and your CV — free, no login needed.';

export function MagicButton({ jobDescriptionText, exampleCvText, workspaceId, label = EXPLAIN_CTA }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'linear-gradient(135deg, #4F8EF7 0%, #3b7de8 100%)',
          color: '#fff',
          border: 'none',
          borderRadius: '10px',
          padding: '12px 22px',
          fontSize: '14px',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(79,142,247,0.35)',
          transition: 'transform 0.15s, box-shadow 0.15s',
          letterSpacing: '-0.01em',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(79,142,247,0.45)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = '';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(79,142,247,0.35)';
        }}
      >
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
