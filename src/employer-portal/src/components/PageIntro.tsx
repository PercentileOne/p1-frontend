import { useState } from 'react'
import { Info, X } from 'lucide-react'

// A short "what this page is for" note at the top of a page (Francis, 2026-10-20), so a new person knows at a glance what they are looking at and does not have to find out by clicking around.
// One or two plain sentences. It can be hidden with the X and then stays hidden on that page; the sidebar has a link to bring them all back (this portal has no Help Centre).
// The text lives in help/pageIntros.ts, keyed by the menu label. Storage can be blocked, so a failed read or write just means the note shows again.
// Copied from the candidate portal's PageIntro (the portals are separate apps), without the help-article link, in this portal's green.

export const PAGE_INTRO_PREFIX = 'tic.pageintro.'
const keyFor = (label: string) => PAGE_INTRO_PREFIX + label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** Brings every hidden page description back. Returns how many were hidden. */
export function showAllPageIntros(): number {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(PAGE_INTRO_PREFIX)) keys.push(k) }
    keys.forEach(k => localStorage.removeItem(k))
    return keys.length
  } catch { return 0 }
}

const GREEN = '#34D399'

export function PageIntro({ label, text }: { label: string; text: string }) {
  const key = keyFor(label)
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(key) === '1' } catch { return false } })
  if (hidden) return null
  function hide() { try { localStorage.setItem(key, '1') } catch { /* it will just show again */ } setHidden(true) }

  return (
    <section aria-label={`About ${label}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.24)', borderRadius: 10, padding: '10px 14px', margin: '0 0 16px', maxWidth: 900 }}>
      <Info size={16} color={GREEN} style={{ flexShrink: 0, marginTop: 2 }} />
      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-2)', flex: 1 }}>{text}</p>
      <button type="button" onClick={hide} aria-label="Hide this description" title="Hide this. You can bring it back from the sidebar." style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2, display: 'flex', flexShrink: 0 }}><X size={15} /></button>
    </section>
  )
}
