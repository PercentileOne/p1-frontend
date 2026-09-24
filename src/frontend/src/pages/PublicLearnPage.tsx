import { useState } from 'react';
import { generatePublicLesson, type PublicLesson } from '../api/publicLearnApi';

// "Learn Anything" (Francis, 2026-09-24) — the public, no-login taste of the Learn module for
// visitors from the marketing site: type any topic, get a real generated lesson (key concepts,
// misconceptions, glossary), same generation/cache the authenticated Learn module uses. The
// spoken exam questions and MCQ practice are shown as a locked preview — full practice needs a
// free account, matching the "watch/read free, act requires an account" pattern this app uses
// everywhere else (Introductions, session replays). No history, no saving for anonymous visitors.
const GREEN = '#34D399';
const REGISTER_URL = 'https://login.theinterviewchair.com/register';

export default function PublicLearnPage() {
  const [topic, setTopic] = useState(() => { try { return (new URLSearchParams(window.location.search).get('topic') ?? '').slice(0, 120); } catch { return ''; } });
  const [loading, setLoading] = useState(false);
  const [lesson, setLesson] = useState<PublicLesson | null>(null);
  const [error, setError] = useState<string | null>(null);

  const card: React.CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '22px 24px' };
  const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '13px 14px', fontSize: 15, color: '#fff' };

  async function generate() {
    const trimmed = topic.trim();
    if (trimmed.length < 2) { setError('Tell us what you’d like to learn about.'); return; }
    setError(null);
    setLoading(true);
    setLesson(null);
    const res = await generatePublicLesson(trimmed);
    setLoading(false);
    if (res.ok) setLesson(res.data); else setError(res.message);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#07080f', color: '#fff', padding: '48px 16px 80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: 720 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: GREEN, marginBottom: 10 }}>No account needed</div>
          <h1 style={{ fontSize: 32, fontWeight: 900, margin: '0 0 12px', lineHeight: 1.2 }}>Learn Anything</h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
            Name any subject — a real generated lesson with key concepts, common misconceptions, and a glossary, ready in seconds.
          </p>
        </div>

        <div style={card}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>What do you want to learn?</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              value={topic}
              onChange={e => setTopic(e.target.value.slice(0, 120))}
              onKeyDown={e => { if (e.key === 'Enter') void generate(); }}
              placeholder="e.g. Kubernetes, The French Revolution, Compound Interest"
              style={{ ...inputStyle, flex: '1 1 260px' }}
            />
            <button onClick={() => void generate()} disabled={loading} style={{
              background: loading ? 'rgba(52,211,153,0.4)' : `linear-gradient(135deg,${GREEN},#047857)`, color: '#fff', border: 'none',
              borderRadius: 12, padding: '13px 22px', fontSize: 14.5, fontWeight: 800, cursor: loading ? 'default' : 'pointer',
            }}>
              {loading ? 'Generating…' : 'Generate lesson →'}
            </button>
          </div>
          {error && <div style={{ color: '#F87171', fontSize: 13, marginTop: 14 }}>{error}</div>}
        </div>

        {lesson && (
          <div style={{ marginTop: 24 }}>
            <div style={{ ...card, marginBottom: 18 }}>
              <div style={{ fontSize: 34, marginBottom: 6 }}>{lesson.emoji}</div>
              <h2 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 8px' }}>{lesson.title}</h2>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: GREEN, marginBottom: 10 }}>{lesson.category}</div>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: 'rgba(255,255,255,0.85)', margin: 0 }}>{lesson.hook}</p>
            </div>

            <SectionTitle>Key concepts</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 22 }}>
              {lesson.keyConcepts.map((k, i) => (
                <div key={i} style={card}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 20 }}>{k.icon}</span>
                    <span style={{ fontSize: 16, fontWeight: 800 }}>{k.title}</span>
                  </div>
                  <p style={{ fontSize: 14, lineHeight: 1.65, color: 'rgba(255,255,255,0.8)', margin: '0 0 10px' }}>{k.body}</p>
                  <p style={{ fontSize: 13.5, lineHeight: 1.65, color: 'rgba(255,255,255,0.6)', margin: '0 0 10px' }}>{k.deepDive}</p>
                  {k.codeSnippet && (
                    <pre style={{ background: '#0c1220', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 14, fontSize: 12.5, overflowX: 'auto', color: '#a5f3c9', marginBottom: 10 }}>{k.codeSnippet}</pre>
                  )}
                  <div style={{ fontSize: 12.5, color: '#FBBF24', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 8, padding: '8px 12px' }}>
                    ⚠️ Exam trap: {k.examTrap}
                  </div>
                </div>
              ))}
            </div>

            <SectionTitle>Common misconceptions</SectionTitle>
            <div style={{ ...card, marginBottom: 22 }}>
              {lesson.misconceptions.map((m, i) => (
                <div key={i} style={{ marginBottom: i < lesson.misconceptions.length - 1 ? 14 : 0 }}>
                  <div style={{ fontSize: 13.5, color: '#F87171', marginBottom: 3 }}>✗ {m.wrong}</div>
                  <div style={{ fontSize: 13.5, color: GREEN }}>✓ {m.right}</div>
                </div>
              ))}
            </div>

            <SectionTitle>Glossary</SectionTitle>
            <div style={{ ...card, marginBottom: 22, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
              {lesson.glossary.map((g, i) => (
                <div key={i}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 3 }}>{g.term}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{g.def}</div>
                </div>
              ))}
            </div>

            <div style={{ ...card, textAlign: 'center', border: `1px solid ${GREEN}55`, background: 'linear-gradient(135deg,rgba(52,211,153,0.10),rgba(4,120,87,0.06))' }}>
              <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>🔒 {lesson.examQuestions.length} spoken exam questions + {lesson.mcQuestions.length} MCQs, locked</div>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', maxWidth: 460, margin: '0 auto 18px', lineHeight: 1.6 }}>
                Create a free account to practise this exact topic out loud, take the MCQ quiz, and save it to come back to later.
              </p>
              <a href={REGISTER_URL} style={{ display: 'inline-block', background: `linear-gradient(135deg,${GREEN},#047857)`, color: '#fff', borderRadius: 12, padding: '13px 28px', fontWeight: 800, textDecoration: 'none' }}>
                Create my free account →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>{children}</div>;
}
