import { useCallback, useEffect, useState } from 'react'
import { Clapperboard, Loader2, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { THEMES, feedVideosApi } from '../api/feedVideosApi'
import type { ApiError, FeedVideo } from '../api/feedVideosApi'

// The videos in the candidate feed's video strip (Francis, 2026-10-18). Paste YouTube links, one per line, choose a theme, and each one is checked with YouTube before it is added:
// it must exist, be public, and have embedding switched on by its owner. Title, channel and thumbnail come from YouTube. Only official channels should go in (Shark Tank, Dragons' Den, TED
// and the like): the candidate sees the channel credited on every card, and nothing is copied or re-hosted.

const card: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 22px' }
const field: React.CSSProperties = { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 11px', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }
const btn: React.CSSProperties = { background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }
const ghost: React.CSSProperties = { background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 11px', color: 'var(--text-2)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }

const themeLabel = (theme: string) => THEMES.find(t => t.value === theme)?.label ?? theme

export default function FeedVideos() {
  const { token } = useAuth()
  const [videos, setVideos] = useState<FeedVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [links, setLinks] = useState('')
  const [theme, setTheme] = useState(THEMES[0].value)
  const [adding, setAdding] = useState(false)
  const [results, setResults] = useState<{ line: string; ok: boolean; text: string }[]>([])

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true); setError('')
    try { setVideos(await feedVideosApi.list(token)) }
    catch (e) { setError((e as ApiError).error ?? 'Failed to load the videos.') }
    finally { setLoading(false) }
  }, [token])
  useEffect(() => { void load() }, [load])

  async function addAll() {
    if (!token) return
    const lines = links.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) { setError('Paste at least one YouTube link.'); return }
    setAdding(true); setError(''); setResults([])
    const out: { line: string; ok: boolean; text: string }[] = []
    for (const line of lines) {
      // A line may end with its own theme (for example "https://youtu.be/abc pitching"), so a whole mixed list can go in with one paste.
      const parts = line.split(/\s+/)
      const own = parts.length > 1 && THEMES.some(t => t.value === parts[parts.length - 1]) ? parts[parts.length - 1] : null
      const url = own ? parts.slice(0, -1).join(' ') : line
      try { const v = await feedVideosApi.add(token, url, own ?? theme); out.push({ line, ok: true, text: `Added: ${v.title} (${v.channel})` }) }
      catch (e) { out.push({ line, ok: false, text: (e as ApiError).error ?? 'Could not add it.' }) }
      setResults([...out])
    }
    setAdding(false)
    // Keep only the lines that failed in the box, so a retry is just a press of the button.
    setLinks(out.filter(r => !r.ok).map(r => r.line).join('\n'))
    await load()
  }

  async function change(v: FeedVideo, body: { status?: string; theme?: string }) {
    if (!token) return
    try { const next = await feedVideosApi.patch(token, v.id, body); setVideos(list => list.map(x => x.id === v.id ? next : x)) }
    catch (e) { setError((e as ApiError).error ?? 'That did not save.') }
  }
  async function remove(v: FeedVideo) {
    if (!token || !window.confirm(`Remove "${v.title}" from the list?`)) return
    try { await feedVideosApi.remove(token, v.id); setVideos(list => list.filter(x => x.id !== v.id)) }
    catch (e) { setError((e as ApiError).error ?? 'That did not remove.') }
  }

  const live = videos.filter(v => v.status === 'published').length

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}><Clapperboard size={20} /> Feed videos</h1>
      <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4, maxWidth: 720, lineHeight: 1.55 }}>
        The videos in the candidate feed&rsquo;s &ldquo;Worth a watch&rdquo; strip. Paste YouTube links, one per line, pick a theme and add them (or end a line with its own theme, such as <code>pitching</code> or <code>routines</code>, to mix themes in one paste). Each link is checked with YouTube first: it must exist, be public and allow embedding.
        Use official channels only (Shark Tank, Dragons&rsquo; Den, TED and the like). The channel is credited on every card and nothing is copied or re-hosted.
      </p>

      <div style={{ ...card, margin: '18px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label htmlFor="fvLinks" style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', letterSpacing: '0.06em' }}>YOUTUBE LINKS (ONE PER LINE)</label>
        <textarea id="fvLinks" value={links} onChange={e => setLinks(e.target.value)} rows={5} placeholder={'https://www.youtube.com/watch?v=...\nhttps://youtu.be/...'} style={{ ...field, width: '100%', resize: 'vertical' }} />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <label htmlFor="fvTheme" style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', letterSpacing: '0.06em' }}>THEME</label>
          <select id="fvTheme" value={theme} onChange={e => setTheme(e.target.value)} style={field}>{THEMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
          <button type="button" disabled={adding} onClick={() => void addAll()} style={{ ...btn, opacity: adding ? 0.6 : 1 }}>{adding ? 'Checking with YouTube…' : 'Check and add'}</button>
        </div>
        {results.length > 0 && (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
            {results.map((r, i) => <li key={i} style={{ color: r.ok ? '#34D399' : '#F87171', overflowWrap: 'anywhere' }}>{r.ok ? '✓' : '✗'} {r.text}{r.ok ? '' : ` (${r.line})`}</li>)}
          </ul>
        )}
      </div>

      {error && <div role="alert" style={{ color: '#F87171', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <div style={card}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
          In the strip: {live} showing · {videos.length - live} hidden
        </div>
        {loading ? <Loader2 size={18} /> : videos.length === 0 ? <div style={{ fontSize: 13, color: 'var(--text-3)' }}>No videos yet. Paste some links above.</div> : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
            {videos.map(v => (
              <li key={v.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--border)', opacity: v.status === 'hidden' ? 0.55 : 1, flexWrap: 'wrap' }}>
                <img src={v.thumbnail} alt="" width={96} height={54} style={{ objectFit: 'cover', borderRadius: 6, background: '#000', flexShrink: 0 }} />
                <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', overflowWrap: 'anywhere' }}>{v.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{v.channel} · {themeLabel(v.theme)}</div>
                </div>
                <select aria-label={`Theme for ${v.title}`} value={v.theme} onChange={e => void change(v, { theme: e.target.value })} style={{ ...field, padding: '6px 8px', fontSize: 12 }}>
                  {THEMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <button type="button" onClick={() => void change(v, { status: v.status === 'published' ? 'hidden' : 'published' })} style={ghost}>{v.status === 'published' ? 'Hide' : 'Show'}</button>
                <button type="button" onClick={() => void remove(v)} aria-label={`Remove ${v.title}`} style={{ ...ghost, display: 'inline-flex', alignItems: 'center', gap: 5 }}><Trash2 size={13} /> Remove</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
