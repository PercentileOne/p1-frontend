import { useEffect, useState } from 'react'
import { MessagesSquare, ExternalLink } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { siteGuideApi } from '../api/siteGuideApi'
import type { ApiError } from '../api/siteGuideApi'

// The live talking guide on the marketing homepage (Francis, 2026-10-23): the on/off switch, what the limits are, and the way to the test page. The guide itself (ElevenLabs voice,
// Spatius face) lives in the candidate app, so trying it out happens there; this page is where it is switched on for visitors.

const card: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 22px' }
const TEST_PAGE = 'https://candidate.theinterviewchair.com/dev/site-agent'

export default function SiteGuide() {
  const { token } = useAuth()
  const [on, setOn] = useState<boolean | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    siteGuideApi.getPublic(token).then(r => setOn(r.enabled)).catch(e => setError((e as ApiError).error ?? 'Could not read the switch.'))
  }, [token])

  async function flip(next: boolean) {
    if (!token) return
    setError('')
    try { setOn((await siteGuideApi.setPublic(token, next)).enabled) }
    catch (e) { setError((e as ApiError).error ?? 'That did not save.') }
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 820 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <MessagesSquare size={22} color="var(--blue)" />
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: 'var(--text)' }}>Site guide</h1>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 20px', lineHeight: 1.55 }}>
        A live, talking guide that sits above &ldquo;Choose your interviewer&rdquo; on the homepage, with Recruiter and Candidate tabs. Visitors talk to it for up to 3 minutes, and each conversation is billed minutes at ElevenLabs and Spatius.
      </p>

      <div style={{ ...card, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ flex: '1 1 300px' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>On the public homepage: {on === null ? '…' : on ? 'ON' : 'OFF'}</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.5 }}>Off by default. Turning it off removes the panel from the homepage within seconds.</div>
        </div>
        <button type="button" disabled={on === null} onClick={() => void flip(!on)}
          style={{ background: on ? 'none' : 'var(--blue)', color: on ? '#EF4444' : '#fff', border: on ? '1px solid rgba(239,68,68,0.4)' : 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          {on ? 'Turn off' : 'Turn on'}
        </button>
        {error && <div role="alert" style={{ flexBasis: '100%', fontSize: 13, color: '#F59E0B' }}>{error}</div>}
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>Protection</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.8 }}>
          <li>Each visitor: 3 conversations a day. Whole site: 100 conversations a day.</li>
          <li>Robots and crawlers are refused. Computers only (not shown on phones yet).</li>
          <li>Admin accounts are not limited, so you can test as much as you like.</li>
          <li>Set a monthly spend alert in ElevenLabs as well.</li>
        </ul>
      </div>

      <div style={{ ...card }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>Try it yourself first</div>
        <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 12px', lineHeight: 1.5 }}>
          The test page talks to the same guide, with the test boxes. It is part of the candidate app, so it asks you to sign in there once.
        </p>
        <a href={TEST_PAGE} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--blue)', textDecoration: 'none' }}>
          Open the test page <ExternalLink size={14} />
        </a>
      </div>
    </div>
  )
}
