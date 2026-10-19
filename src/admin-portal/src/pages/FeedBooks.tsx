import { useCallback, useEffect, useState } from 'react'
import { BookOpen, Loader2, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { THEMES, feedBooksApi, parseBookLine } from '../api/feedBooksApi'
import type { ApiError, FeedBook } from '../api/feedBooksApi'

// The books in the candidate feed's "Worth a read" strip (Francis, 2026-10-19). Paste one book per line as `ISBN | theme | why it is here | authors (optional)`. Each ISBN is checked with Open Library
// before it is added: Open Library must know the book, have a title and have a cover picture. Title, cover and page link come from Open Library; the "why" line is ours and the strip says so.
// Open Library's author names can be messy (repeated names, translators), so the fourth part replaces them when you want it tidier. No shop links and no affiliate code.

const card: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 22px' }
const field: React.CSSProperties = { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 11px', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }
const btn: React.CSSProperties = { background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }
const ghost: React.CSSProperties = { background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 11px', color: 'var(--text-2)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }

const themeLabel = (theme: string) => THEMES.find(t => t.value === theme)?.label ?? theme

export default function FeedBooks() {
  const { token } = useAuth()
  const [books, setBooks] = useState<FeedBook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lines, setLines] = useState('')
  const [theme, setTheme] = useState(THEMES[0].value)
  const [adding, setAdding] = useState(false)
  const [results, setResults] = useState<{ line: string; ok: boolean; text: string }[]>([])

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true); setError('')
    try { setBooks(await feedBooksApi.list(token)) }
    catch (e) { setError((e as ApiError).error ?? 'Failed to load the books.') }
    finally { setLoading(false) }
  }, [token])
  useEffect(() => { void load() }, [load])

  async function addAll() {
    if (!token) return
    const parsed = lines.split('\n').map(l => ({ line: l.trim(), p: parseBookLine(l) })).filter(x => x.p)
    if (parsed.length === 0) { setError('Paste at least one ISBN.'); return }
    setAdding(true); setError(''); setResults([])
    const out: { line: string; ok: boolean; text: string }[] = []
    for (const { line, p } of parsed) {
      try { const b = await feedBooksApi.add(token, p!.isbn, p!.theme || theme, p!.why, p!.authors); out.push({ line, ok: true, text: `Added: ${b.title}${b.authors ? ` (${b.authors})` : ''}` }) }
      catch (e) { out.push({ line, ok: false, text: (e as ApiError).error ?? 'Could not add it.' }) }
      setResults([...out])
    }
    setAdding(false)
    // Keep only the lines that failed in the box, so a retry is just a press of the button.
    setLines(out.filter(r => !r.ok).map(r => r.line).join('\n'))
    await load()
  }

  async function change(b: FeedBook, body: { status?: string; theme?: string; why?: string; authors?: string }) {
    if (!token) return
    try { const next = await feedBooksApi.patch(token, b.id, body); setBooks(list => list.map(x => x.id === b.id ? next : x)) }
    catch (e) { setError((e as ApiError).error ?? 'That did not save.') }
  }
  async function remove(b: FeedBook) {
    if (!token || !window.confirm(`Remove "${b.title}" from the list?`)) return
    try { await feedBooksApi.remove(token, b.id); setBooks(list => list.filter(x => x.id !== b.id)) }
    catch (e) { setError((e as ApiError).error ?? 'That did not remove.') }
  }

  const live = books.filter(b => b.status === 'published').length

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}><BookOpen size={20} /> Feed books</h1>
      <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4, maxWidth: 720, lineHeight: 1.55 }}>
        The books in the candidate feed&rsquo;s &ldquo;Worth a read&rdquo; strip. Paste one book per line as <code>ISBN | theme | why it is here | authors</code>. The theme and authors are optional (the theme falls back to the one chosen below,
        and the authors to Open Library&rsquo;s). Each ISBN is checked with Open Library first: it must know the book and have a cover picture. Pick an edition that has a cover; a 10 or 13 digit ISBN both work. The &ldquo;why&rdquo; note is ours and the strip says so.
      </p>

      <div style={{ ...card, margin: '18px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label htmlFor="fbLines" style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', letterSpacing: '0.06em' }}>BOOKS (ONE PER LINE)</label>
        <textarea id="fbLines" value={lines} onChange={e => setLines(e.target.value)} rows={6} placeholder={'9780735211292 | habits | A practical guide to building good habits.\n9781449373320 | software-and-cloud | A staple for system design interviews. | Martin Kleppmann'} style={{ ...field, width: '100%', resize: 'vertical' }} />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <label htmlFor="fbTheme" style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', letterSpacing: '0.06em' }}>THEME WHEN A LINE HAS NONE</label>
          <select id="fbTheme" value={theme} onChange={e => setTheme(e.target.value)} style={field}>{THEMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
          <button type="button" disabled={adding} onClick={() => void addAll()} style={{ ...btn, opacity: adding ? 0.6 : 1 }}>{adding ? 'Checking with Open Library…' : 'Check and add'}</button>
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
          In the strip: {live} showing · {books.length - live} hidden
        </div>
        {loading ? <Loader2 size={18} /> : books.length === 0 ? <div style={{ fontSize: 13, color: 'var(--text-3)' }}>No books yet. Paste some ISBNs above.</div> : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
            {books.map(b => (
              <li key={b.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--border)', opacity: b.status === 'hidden' ? 0.55 : 1, flexWrap: 'wrap' }}>
                <img src={b.coverUrl} alt="" width={42} height={63} style={{ objectFit: 'cover', borderRadius: 4, background: '#000', flexShrink: 0 }} />
                <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', overflowWrap: 'anywhere' }}>{b.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{b.authors || 'No author'} · {themeLabel(b.theme)} · {b.id}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2, overflowWrap: 'anywhere' }}>{b.why || 'No note yet.'}</div>
                </div>
                <select aria-label={`Theme for ${b.title}`} value={b.theme} onChange={e => void change(b, { theme: e.target.value })} style={{ ...field, padding: '6px 8px', fontSize: 12 }}>
                  {THEMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <button type="button" onClick={() => void change(b, { status: b.status === 'published' ? 'hidden' : 'published' })} style={ghost}>{b.status === 'published' ? 'Hide' : 'Show'}</button>
                <button type="button" onClick={() => void remove(b)} aria-label={`Remove ${b.title}`} style={{ ...ghost, display: 'inline-flex', alignItems: 'center', gap: 5 }}><Trash2 size={13} /> Remove</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
