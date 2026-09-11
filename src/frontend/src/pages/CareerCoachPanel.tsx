import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../auth/authStore';
import {
  listThreads, getThread, startThread, sendMessage, deleteThread,
  type ThreadSummary, type Thread, type ChatMessage,
} from '../api/careerCoachApi';

const SAMPLE_PROMPTS = [
  "I'm unsure if I should start this degree course or another one — how do I decide?",
  "How do I explain a career gap without it working against me?",
  "I keep getting rejected after the first interview — what am I missing?",
  "What should I actually focus on this month to move my career forward?",
];

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

export default function CareerCoachPanel() {
  const token = useAuthStore(s => s.token);
  const [threads, setThreads] = useState<ThreadSummary[] | null>(null);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [cappedMessage, setCappedMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const refreshThreads = () => {
    if (!token) return;
    listThreads(token).then(setThreads).catch(() => setThreads([]));
  };

  useEffect(refreshThreads, [token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages.length]);

  async function openThread(id: string) {
    if (!token) return;
    setLoadingThread(true);
    setCappedMessage(null);
    try {
      setActiveThread(await getThread(token, id));
    } catch {
      setCappedMessage("Couldn't load that conversation — please try again in a moment.");
    } finally {
      setLoadingThread(false);
    }
  }

  function startNewThread() {
    setActiveThread(null);
    setCappedMessage(null);
    setDraft('');
  }

  async function handleSend(text: string) {
    if (!token || !text.trim() || sending) return;
    setSending(true);
    setCappedMessage(null);
    setDraft('');
    try {
      const result = activeThread
        ? await sendMessage(token, activeThread.id, text.trim())
        : await startThread(token, text.trim());

      if ('capped' in result) {
        setCappedMessage(result.message);
        return;
      }
      setActiveThread(result);
      refreshThreads();
    } catch {
      setCappedMessage("Something went wrong sending that — please try again in a moment.");
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!token) return;
    if (activeThread?.id === id) setActiveThread(null);
    setThreads(prev => prev?.filter(t => t.id !== id) ?? null);
    await deleteThread(token, id).catch(() => {});
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 140px)', minHeight: 500, gap: 20 }}>
      {/* Thread sidebar */}
      <div style={{
        width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10,
        background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 16,
      }}>
        <button
          type="button"
          onClick={startNewThread}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)',
            borderRadius: 10, padding: '10px 14px', color: '#a78bfa', fontWeight: 700, fontSize: 13,
            cursor: 'pointer', fontFamily: 'inherit', marginBottom: 4,
          }}
        >
          + New Conversation
        </button>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {threads === null && <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '8px 4px' }}>Loading…</div>}
          {threads?.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '8px 4px', lineHeight: 1.6 }}>
              No conversations yet — start one below whenever something's on your mind.
            </div>
          )}
          {threads?.map(t => (
            <div
              key={t.id}
              onClick={() => openThread(t.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
                padding: '10px 10px', borderRadius: 8, cursor: 'pointer',
                background: activeThread?.id === t.id ? 'rgba(255,255,255,0.06)' : 'transparent',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 12.5, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap',
                  overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {t.title}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 2 }}>{timeAgo(t.lastMessageAt)}</div>
              </div>
              <button
                type="button"
                onClick={e => handleDelete(t.id, e)}
                title="Delete conversation"
                style={{
                  flexShrink: 0, background: 'none', border: 'none', color: 'var(--text-3)',
                  cursor: 'pointer', fontSize: 13, padding: 4, opacity: 0.6,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main conversation area */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0,
        background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden',
      }}>
        {loadingThread ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 13 }}>
            Loading conversation…
          </div>
        ) : !activeThread ? (
          <EmptyState onPick={handleSend} sending={sending} />
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {activeThread.messages.map((m, i) => <MessageBubble key={i} message={m} />)}
            {sending && <MessageBubble message={{ role: 'assistant', text: '…', at: '' }} pending />}
            <div ref={messagesEndRef} />
          </div>
        )}

        {cappedMessage && (
          <div style={{
            margin: '0 24px 12px', padding: '12px 16px', borderRadius: 10,
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
            color: '#F59E0B', fontSize: 12.5, lineHeight: 1.6,
          }}>
            {cappedMessage}
          </div>
        )}

        <div style={{ padding: '16px 24px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(draft); } }}
            placeholder="Ask your career coach anything…"
            disabled={sending || !!cappedMessage}
            style={{
              flex: 1, background: 'var(--bg3, #14171f)', border: '1px solid var(--border)', borderRadius: 10,
              padding: '12px 16px', color: 'var(--text)', fontSize: 13.5, outline: 'none', fontFamily: 'inherit',
            }}
          />
          <button
            type="button"
            onClick={() => handleSend(draft)}
            disabled={sending || !draft.trim() || !!cappedMessage}
            style={{
              padding: '12px 22px', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 13,
              background: draft.trim() && !sending ? 'linear-gradient(135deg,#a78bfa,#7c3aed)' : 'rgba(255,255,255,0.06)',
              color: draft.trim() && !sending ? '#fff' : 'var(--text-3)',
              cursor: draft.trim() && !sending ? 'pointer' : 'default', fontFamily: 'inherit',
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onPick, sending }: { onPick: (text: string) => void; sending: boolean }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 32, marginBottom: 14 }}>💜</div>
      <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>Welcome to your Career Coach</div>
      <div style={{ fontSize: 13.5, color: 'var(--text-2)', maxWidth: 440, lineHeight: 1.7, marginBottom: 28 }}>
        Career decisions, job search strategy, confidence, upskilling — ask whatever's actually on your mind.
        Every conversation stays here, ready whenever you come back to it.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 460 }}>
        {SAMPLE_PROMPTS.map(p => (
          <button
            key={p}
            type="button"
            disabled={sending}
            onClick={() => onPick(p)}
            style={{
              textAlign: 'left', padding: '12px 16px', borderRadius: 10, fontSize: 13, fontFamily: 'inherit',
              background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'var(--text-2)',
              cursor: sending ? 'default' : 'pointer', lineHeight: 1.5,
            }}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message, pending }: { message: ChatMessage; pending?: boolean }) {
  const isUser = message.role === 'user';
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div style={{
        maxWidth: '75%', padding: '12px 16px', borderRadius: 14,
        borderBottomRightRadius: isUser ? 4 : 14, borderBottomLeftRadius: isUser ? 14 : 4,
        background: isUser ? 'linear-gradient(135deg,#a78bfa,#7c3aed)' : 'rgba(255,255,255,0.05)',
        color: isUser ? '#fff' : 'var(--text)', fontSize: 13.5, lineHeight: 1.6,
        border: isUser ? 'none' : '1px solid var(--border)',
        opacity: pending ? 0.6 : 1,
        whiteSpace: 'pre-wrap',
      }}>
        {message.text}
      </div>
    </div>
  );
}
