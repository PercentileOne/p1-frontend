import { useState } from 'react';
import type { ComponentType } from 'react';
import { LogOut, MoreHorizontal, X } from 'lucide-react';

// The phone's replacement for the dashboard's 220 px sidebar (Francis, 2026-10-11): four everyday places along the bottom, thumb height, and "More" for the rest.
// It only renders the choices; the dashboard still owns which tab is open.

type IconType = ComponentType<{ size?: number; strokeWidth?: number }>;

interface Props {
  /** The four tabs along the bottom, in order, with the short name shown under each icon. */
  main: { label: string; short: string; Icon: IconType }[];
  /** Everything else, shown in the More sheet. */
  more: { label: string; Icon: IconType; group?: string }[];
  active: string;
  onNavigate: (label: string) => void;
  userName: string;
  needsPlan: boolean;
  onAccount: () => void;
  onSignOut: () => void;
}

export function PhoneTabBar({ main, more, active, onNavigate, userName, needsPlan, onAccount, onSignOut }: Props) {
  const [sheet, setSheet] = useState(false);
  const inMore = !main.some(m => m.label === active);
  const go = (label: string) => { setSheet(false); onNavigate(label); };
  const tab = (on: boolean): React.CSSProperties => ({
    flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 56,
    background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 10.5, fontWeight: on ? 800 : 600,
    color: on ? '#34D399' : 'var(--text-3)',
  });
  return (
    <>
      {sheet && (
        <div onClick={() => setSheet(false)} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.55)' }}>
          <div onClick={e => e.stopPropagation()} role="dialog" aria-label="More" style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '82%', overflowY: 'auto', background: 'var(--bg2)', borderTop: '1px solid var(--border)',
            borderRadius: '18px 18px 0 0', padding: '16px 16px calc(20px + env(safe-area-inset-bottom))',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>More</div>
              <button onClick={() => setSheet(false)} aria-label="Close" style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 6, display: 'flex' }}><X size={20} /></button>
            </div>
            {Array.from(new Set(more.map(m => m.group ?? ''))).map(group => (
              <div key={group || 'all'} style={{ marginBottom: 12 }}>
                {group && <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--text-3)', margin: '4px 2px 8px' }}>{group}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                  {more.filter(m => (m.group ?? '') === group).map(({ label, Icon }) => (
                    <button key={label} onClick={() => go(label)} style={{
                      display: 'flex', alignItems: 'center', gap: 10, minHeight: 48, padding: '10px 12px', borderRadius: 12, textAlign: 'left', fontFamily: 'inherit',
                      fontSize: 13, fontWeight: active === label ? 800 : 600, cursor: 'pointer', minWidth: 0,
                      color: active === label ? '#34D399' : 'var(--text)',
                      background: active === label ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                    }}>
                      <Icon size={17} /><span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
              <button onClick={() => { setSheet(false); onAccount(); }} style={{ flex: 1, minWidth: 0, minHeight: 48, borderRadius: 12, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'left', padding: '8px 12px' }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: needsPlan ? '#34D399' : 'var(--text-3)' }}>{needsPlan ? 'Subscribe · £3.99/mo →' : 'My Account'}</div>
              </button>
              <button onClick={() => { setSheet(false); onSignOut(); }} aria-label="Sign out" style={{ minWidth: 56, minHeight: 48, borderRadius: 12, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </div>
      )}
      <nav aria-label="Main" style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 40, display: 'flex', background: 'var(--bg2)', borderTop: '1px solid var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {main.map(({ label, short, Icon }) => (
          <button key={label} onClick={() => go(label)} style={tab(active === label)} aria-current={active === label ? 'page' : undefined}>
            <Icon size={20} strokeWidth={active === label ? 2.4 : 1.9} />
            <span style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{short}</span>
          </button>
        ))}
        <button onClick={() => setSheet(true)} style={tab(inMore)} aria-haspopup="dialog">
          <MoreHorizontal size={20} strokeWidth={inMore ? 2.4 : 1.9} />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
