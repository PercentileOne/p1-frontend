import { useCallback, useEffect, useState } from 'react'
import { GraduationCap, Loader2, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { COSTS, THEMES, feedCoursesApi, parseCourseLine } from '../api/feedCoursesApi'
import type { ApiError, FeedCourse } from '../api/feedCoursesApi'

// The courses in the candidate feed's "Courses worth taking" strip (Francis, 2026-10-20). Paste one course per line as `address | theme | why it is here | cost | title`. Each address is checked against the provider's
// own page before it is added: it must be https on an allowed provider, answer with a page and a title, and not have moved. Title and picture come from the page. The cost is yours to say (free, free-to-audit or paid):
// we never assume a course is free. Udemy, Skillshare, Pluralsight and LinkedIn Learning refuse automated checks, so for those you open the course yourself and type its title; they are marked "not checked by us".

const card: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 22px' }
const field: React.CSSProperties = { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 11px', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }
const btn: React.CSSProperties = { background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }
const ghost: React.CSSProperties = { background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 11px', color: 'var(--text-2)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }

const themeLabel = (theme: string) => THEMES.find(t => t.value === theme)?.label ?? theme

export default function FeedCourses() {
  const { token } = useAuth()
  const [courses, setCourses] = useState<FeedCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lines, setLines] = useState('')
  const [theme, setTheme] = useState(THEMES[0].value)
  const [adding, setAdding] = useState(false)
  const [results, setResults] = useState<{ line: string; ok: boolean; text: string }[]>([])

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true); setError('')
    try { setCourses(await feedCoursesApi.list(token)) }
    catch (e) { setError((e as ApiError).error ?? 'Failed to load the courses.') }
    finally { setLoading(false) }
  }, [token])
  useEffect(() => { void load() }, [load])

  async function addAll() {
    if (!token) return
    const parsed = lines.split('\n').map(l => ({ line: l.trim(), p: parseCourseLine(l) })).filter(x => x.p)
    if (parsed.length === 0) { setError('Paste at least one course address.'); return }
    setAdding(true); setError(''); setResults([])
    const out: { line: string; ok: boolean; text: string }[] = []
    for (const { line, p } of parsed) {
      try {
        const c = await feedCoursesApi.add(token, { ...p!, theme: p!.theme || theme })
        out.push({ line, ok: true, text: `Added: ${c.title} (${c.provider})${c.verified ? '' : ' — not checked by us'}` })
      } catch (e) { out.push({ line, ok: false, text: (e as ApiError).error ?? 'Could not add it.' }) }
      setResults([...out])
    }
    setAdding(false)
    // Keep only the lines that failed in the box, so a retry is just a press of the button.
    setLines(out.filter(r => !r.ok).map(r => r.line).join('\n'))
    await load()
  }

  async function change(c: FeedCourse, body: { status?: string; theme?: string; cost?: string }) {
    if (!token) return
    try { const next = await feedCoursesApi.patch(token, c.id, body); setCourses(list => list.map(x => x.id === c.id ? next : x)) }
    catch (e) { setError((e as ApiError).error ?? 'That did not save.') }
  }
  async function remove(c: FeedCourse) {
    if (!token || !window.confirm(`Remove "${c.title}" from the list?`)) return
    try { await feedCoursesApi.remove(token, c.id); setCourses(list => list.filter(x => x.id !== c.id)) }
    catch (e) { setError((e as ApiError).error ?? 'That did not remove.') }
  }

  const live = courses.filter(c => c.status === 'published').length

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}><GraduationCap size={20} /> Feed courses</h1>
      <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4, maxWidth: 720, lineHeight: 1.55 }}>
        The courses in the candidate feed&rsquo;s &ldquo;Courses worth taking&rdquo; strip. Paste one course per line as <code>address | theme | why it is here | cost | title</code>. Theme, cost and title are optional (the theme falls back to the one chosen below;
        cost is <code>free</code>, <code>free-to-audit</code> or <code>paid</code>, and without it no label shows). Each address is checked against the provider&rsquo;s own page: it must be https on an allowed provider, show a title and not have moved.
        Udemy, Skillshare, Pluralsight and LinkedIn Learning (pages under /learning/) cannot be checked automatically, so open the course yourself and give its title; those are marked &ldquo;not checked by us&rdquo;. The &ldquo;why&rdquo; note is ours and the strip says so.
      </p>

      <div style={{ ...card, margin: '18px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label htmlFor="fcLines" style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', letterSpacing: '0.06em' }}>COURSES (ONE PER LINE)</label>
        <textarea id="fcLines" value={lines} onChange={e => setLines(e.target.value)} rows={6}
          placeholder={'https://www.coursera.org/learn/learning-how-to-learn | learning | How to learn hard subjects. | free-to-audit\nhttps://www.udemy.com/course/the-complete-web-development-bootcamp/ | software-and-cloud | A broad start for web developers. | paid | The Complete Web Development Bootcamp'}
          style={{ ...field, width: '100%', resize: 'vertical' }} />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <label htmlFor="fcTheme" style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', letterSpacing: '0.06em' }}>THEME WHEN A LINE HAS NONE</label>
          <select id="fcTheme" value={theme} onChange={e => setTheme(e.target.value)} style={field}>{THEMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
          <button type="button" disabled={adding} onClick={() => void addAll()} style={{ ...btn, opacity: adding ? 0.6 : 1 }}>{adding ? 'Checking the pages…' : 'Check and add'}</button>
        </div>
        {results.length > 0 && (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
            {results.map((r, i) => <li key={i} style={{ color: r.ok ? '#34D399' : '#F87171', overflowWrap: 'anywhere' }}>{r.ok ? '✓' : '✗'} {r.text}{r.ok ? '' : ` (${r.line.split('|')[0].trim()})`}</li>)}
          </ul>
        )}
      </div>

      {error && <div role="alert" style={{ color: '#F87171', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <div style={card}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
          In the strip: {live} showing · {courses.length - live} hidden
        </div>
        {loading ? <Loader2 size={18} /> : courses.length === 0 ? <div style={{ fontSize: 13, color: 'var(--text-3)' }}>No courses yet. Paste some addresses above.</div> : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
            {courses.map(c => (
              <li key={c.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--border)', opacity: c.status === 'hidden' ? 0.55 : 1, flexWrap: 'wrap' }}>
                {c.imageUrl
                  ? <img src={c.imageUrl} alt="" width={96} height={54} referrerPolicy="no-referrer" style={{ objectFit: 'cover', borderRadius: 6, background: '#000', flexShrink: 0 }} />
                  : <div style={{ width: 96, height: 54, borderRadius: 6, background: 'var(--bg3)', flexShrink: 0 }} />}
                <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', overflowWrap: 'anywhere' }}>{c.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{c.provider} · {themeLabel(c.theme)}{c.cost ? ` · ${c.cost}` : ''}{c.verified ? '' : ' · not checked by us'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2, overflowWrap: 'anywhere' }}>{c.why || 'No note yet.'}</div>
                  <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, color: 'var(--blue)', overflowWrap: 'anywhere' }}>{c.url}</a>
                </div>
                <select aria-label={`Theme for ${c.title}`} value={c.theme} onChange={e => void change(c, { theme: e.target.value })} style={{ ...field, padding: '6px 8px', fontSize: 12 }}>
                  {THEMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <select aria-label={`Cost of ${c.title}`} value={c.cost} onChange={e => void change(c, { cost: e.target.value })} style={{ ...field, padding: '6px 8px', fontSize: 12 }}>
                  <option value="">No cost label</option>
                  {COSTS.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
                <button type="button" onClick={() => void change(c, { status: c.status === 'published' ? 'hidden' : 'published' })} style={ghost}>{c.status === 'published' ? 'Hide' : 'Show'}</button>
                <button type="button" onClick={() => void remove(c)} aria-label={`Remove ${c.title}`} style={{ ...ghost, display: 'inline-flex', alignItems: 'center', gap: 5 }}><Trash2 size={13} /> Remove</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
