import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, LifeBuoy, Search, ThumbsDown, ThumbsUp } from 'lucide-react'
import { logEvent } from '../api/flowLogger'
import { CONTACT_URL, HELP_CATEGORIES, RECRUITER_ARTICLES, type HelpArticle } from '../help/articles'

// Help Centre (Francis, 2026-09-30) — text-first so the same articles can later feed short videos and a support assistant.
// Searches, opened articles and "was this helpful?" votes are logged (see logEvent) — questions that find nothing tell us which article to write next.

const VISITED_KEY = 'tic.help.visited'

interface Props {
  /** Open straight onto this article (used by the "How does this work?" hints and the checklist). */
  initialArticleId?: string | null
  /** Jump to a page in the portal (the article's "Go to …" button). */
  onNavigate: (label: string) => void
}

function matches(a: HelpArticle, q: string): boolean {
  const hay = [a.title, a.summary, ...(a.body ?? []), ...(a.steps ?? []), ...(a.tips ?? []), ...(a.keywords ?? [])].join(' ').toLowerCase()
  return q.toLowerCase().split(/\s+/).filter(Boolean).every(word => hay.includes(word))
}

export default function HelpCentre({ initialArticleId, onNavigate }: Props) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('All')
  const [openId, setOpenId] = useState<string | null>(initialArticleId ?? null)
  const [voted, setVoted] = useState<Record<string, boolean>>({})

  useEffect(() => { try { localStorage.setItem(VISITED_KEY, '1') } catch { /* private mode */ } }, [])

  const results = useMemo(() => {
    const q = query.trim()
    return RECRUITER_ARTICLES.filter(a => (category === 'All' || a.category === category) && (!q || matches(a, q)))
  }, [query, category])

  const open = openId ? RECRUITER_ARTICLES.find(a => a.id === openId) ?? null : null

  function openArticle(id: string) {
    setOpenId(id)
    logEvent('help_article_open', { metadata: { article: id, portal: 'recruiter' } })
    window.scrollTo({ top: 0 })
  }

  function logSearch() {
    const q = query.trim()
    if (q.length < 2) return
    logEvent(results.length ? 'help_search' : 'help_search_no_result', { metadata: { q: q.slice(0, 80), results: results.length, portal: 'recruiter' } })
  }

  function vote(article: HelpArticle, helpful: boolean) {
    setVoted(v => ({ ...v, [article.id]: helpful }))
    logEvent('help_feedback', { metadata: { article: article.id, helpful, portal: 'recruiter' } })
  }

  const card: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }
  const chip = (active: boolean): React.CSSProperties => ({
    padding: '6px 13px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    border: `1px solid ${active ? '#34D399' : 'var(--border)'}`, background: active ? 'rgba(52,211,153,0.12)' : 'transparent', color: active ? '#34D399' : 'var(--text-2)',
  })

  if (open) {
    const related = (open.related ?? []).map(id => RECRUITER_ARTICLES.find(a => a.id === id)).filter((a): a is HelpArticle => !!a)
    return (
      <div style={{ maxWidth: 760 }}>
        <button onClick={() => setOpenId(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 14, fontFamily: 'inherit' }}>
          <ArrowLeft size={14} /> All help articles
        </button>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#34D399', marginBottom: 6 }}>{open.category}</div>
        <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', margin: '0 0 8px' }}>{open.title}</h1>
        <p style={{ fontSize: 14.5, color: 'var(--text-2)', lineHeight: 1.6, margin: '0 0 20px' }}>{open.summary}</p>

        {open.body && open.body.map((p, i) => <p key={i} style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-2)', margin: '0 0 12px' }}>{p}</p>)}

        {open.steps && (
          <ol style={{ ...card, margin: '8px 0 16px', paddingLeft: 40, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {open.steps.map((s, i) => <li key={i} style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)' }}>{s}</li>)}
          </ol>
        )}

        {open.tips && (
          <div style={{ background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.22)', borderRadius: 12, padding: '14px 18px', margin: '0 0 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#4F8EF7', marginBottom: 6 }}>Tips</div>
            {open.tips.map((t, i) => <div key={i} style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-2)', marginTop: i ? 6 : 0 }}>• {t}</div>)}
          </div>
        )}

        {open.navLabel && (
          <button onClick={() => onNavigate(open.navLabel!)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, border: 'none', background: '#34D399', color: '#04120c', fontSize: 13.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 22 }}>
            Go to {open.navLabel} <ArrowRight size={15} />
          </button>
        )}

        {open.id === 'get-in-touch' && (
          <a href={CONTACT_URL} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', padding: '10px 18px', borderRadius: 10, background: '#34D399', color: '#04120c', fontSize: 13.5, fontWeight: 800, textDecoration: 'none', marginBottom: 22 }}>Send us a message →</a>
        )}

        <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 22 }}>
          <span style={{ fontSize: 13.5, color: 'var(--text-2)' }}>Was this helpful?</span>
          {voted[open.id] === undefined ? (
            <>
              <button aria-label="Yes, helpful" onClick={() => vote(open, true)} style={{ ...chip(false), display: 'flex', alignItems: 'center', gap: 6 }}><ThumbsUp size={14} /> Yes</button>
              <button aria-label="No, not helpful" onClick={() => vote(open, false)} style={{ ...chip(false), display: 'flex', alignItems: 'center', gap: 6 }}><ThumbsDown size={14} /> No</button>
            </>
          ) : (
            <span style={{ fontSize: 13.5, color: '#34D399', fontWeight: 700 }}>
              {voted[open.id] ? 'Thanks — glad it helped.' : <>Thanks for telling us. <a href={CONTACT_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#4F8EF7' }}>Tell us what was missing →</a></>}
            </span>
          )}
        </div>

        {related.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Related</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {related.map(a => (
                <button key={a.id} onClick={() => openArticle(a.id)} style={{ ...card, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text)', fontSize: 14, fontWeight: 700 }}>{a.title}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <LifeBuoy size={22} color="#34D399" />
        <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>Help Centre</h1>
      </div>
      <p style={{ fontSize: 14, color: 'var(--text-3)', margin: '0 0 18px' }}>Short answers, one task at a time. Search, or pick a topic.</p>

      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--text-3)' }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onBlur={logSearch}
          onKeyDown={e => { if (e.key === 'Enter') logSearch() }}
          placeholder="Search — for example: send a prep, alerts, seats, email"
          aria-label="Search the help articles"
          style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px 12px 40px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {['All', ...HELP_CATEGORIES].map(c => <button key={c} onClick={() => setCategory(c)} style={chip(category === c)}>{c}</button>)}
      </div>

      {results.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '30px 20px' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>Nothing found for "{query}"</div>
          <div style={{ fontSize: 13.5, color: 'var(--text-3)', marginBottom: 14 }}>Try a different word, or ask us directly — we read every message, and it helps us write the article you were looking for.</div>
          <a href={CONTACT_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#4F8EF7', fontSize: 14, fontWeight: 700 }}>Contact us →</a>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {results.map(a => (
            <button key={a.id} onClick={() => openArticle(a.id)} style={{ ...card, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#34D399' }}>{a.category}</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', lineHeight: 1.35 }}>{a.title}</span>
              <span style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.5 }}>{a.summary}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
