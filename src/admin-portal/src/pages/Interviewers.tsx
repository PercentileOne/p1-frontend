import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, Eye, EyeOff, Loader2, Pencil, Plus, Trash2, Upload, Users, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  EXPLAIN_API_BASE, interviewersApi,
  type Interviewer, type InterviewerInput, type InterviewerRole,
} from '../api/interviewersApi'

// Interviewers (2026-10-07): the one place that says who a candidate can meet. Each has a Spatius face (avatar ID), a background picture, a voice, a one-line description and
// five personality levels. The interview room reads its three seats (HR, technical, briefing) from the ones marked "default"; the picker, the demo and the marketing hero
// will read the whole active list (see docs/specs/interviewers-and-picker-plan.md).

const ROLE_LABEL: Record<InterviewerRole, string> = { hr: 'HR', technical: 'Technical', briefing: 'Briefing' }
const TRAITS: { key: 'depth' | 'strictness' | 'warmth' | 'humour' | 'pace'; label: string; low: string; high: string }[] = [
  { key: 'depth', label: 'Depth', low: 'broad', high: 'deep' },
  { key: 'strictness', label: 'Strictness', low: 'relaxed', high: 'strict' },
  { key: 'warmth', label: 'Warmth', low: 'neutral', high: 'warm' },
  { key: 'humour', label: 'Humour', low: 'serious', high: 'light' },
  { key: 'pace', label: 'Pace', low: 'patient', high: 'brisk' },
]

const card: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }
const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, fontSize: 12.5, fontFamily: 'inherit', background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)' }
const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }
const smallBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: 'var(--text-2)', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }

function emptyForm(): InterviewerInput {
  return { displayName: '', role: 'technical', spatiusAvatarId: '', voiceId: '', description: '', depth: 3, strictness: 3, warmth: 3, humour: 3, pace: 3, active: true, sortOrder: 100, defaultFor: null }
}
function toForm(i: Interviewer): InterviewerInput {
  return {
    displayName: i.displayName, role: i.role, spatiusAvatarId: i.spatiusAvatarId, voiceId: i.voiceId ?? '', description: i.description,
    depth: i.traits.depth, strictness: i.traits.strictness, warmth: i.traits.warmth, humour: i.traits.humour, pace: i.traits.pace,
    active: i.active, sortOrder: i.sortOrder, defaultFor: i.defaultFor,
  }
}
function slugify(name: string) { return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) }
const bgSrc = (url: string | null) => (url ? `${EXPLAIN_API_BASE}${url}` : null)

// A portrait straight from a camera or screenshot can be many megabytes; it is shown small, so it is shrunk to at most 1000 px on its long side (JPEG) before it is sent.
async function shrinkImage(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, 1000 / Math.max(bmp.width, bmp.height))
    if (scale === 1 && file.size < 600_000) return file
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale)
    canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.88))
    return blob ? new File([blob], 'portrait.jpg', { type: 'image/jpeg' }) : file
  } catch { return file }
}

function TraitBars({ t }: { t: Interviewer['traits'] }) {
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      {TRAITS.map(x => (
        <div key={x.key} style={{ display: 'grid', gridTemplateColumns: '66px 1fr', alignItems: 'center', gap: 8, fontSize: 10.5, color: 'var(--text-3)' }}>
          <span>{x.label}</span>
          <span style={{ display: 'flex', gap: 3 }} title={`${x.label}: ${t[x.key]} of 5 (${x.low} to ${x.high})`}>
            {[1, 2, 3, 4, 5].map(n => <span key={n} style={{ flex: 1, height: 5, borderRadius: 3, background: n <= t[x.key] ? '#34D399' : 'var(--border)' }} />)}
          </span>
        </div>
      ))}
    </div>
  )
}

// The interviewer's face on their card (2026-10-08): the portrait the candidates see in the picker (a file on the candidate site, named by the interviewer's id), with the
// uploaded room as a small inset in the corner. A new interviewer with no portrait file yet simply shows their room, as before.
function CardFace({ id, portrait, room }: { id: string; portrait: string | null; room: string | null }) {
  const [failed, setFailed] = useState(false);
  const src = portrait ?? `https://candidate.theinterviewchair.com/images/interviewers/${id}.jpg`;
  return (
    <>
      {!failed && <img src={src} alt="" onError={() => setFailed(true)}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 8%' }} />}
      {!failed && room && <div title="Room (background)" style={{ position: 'absolute', top: 10, right: 10, width: 76, aspectRatio: '16 / 9', borderRadius: 6, border: '2px solid rgba(255,255,255,0.85)', background: `center / cover url(${room})` }} />}
    </>
  );
}

export default function Interviewers() {
  const { token } = useAuth()
  const [items, setItems] = useState<Interviewer[] | null>(null)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<InterviewerInput>(emptyForm())
  const [newId, setNewId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [portraitFile, setPortraitFile] = useState<File | null>(null)
  const [portraitPreview, setPortraitPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setError('')
    try { setItems(await interviewersApi.list(token)) }
    catch (e) { setError((e as Error).message || 'Could not load the interviewers.') }
  }, [token])
  useEffect(() => { void load() }, [load])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
  useEffect(() => () => { if (portraitPreview) URL.revokeObjectURL(portraitPreview) }, [portraitPreview])

  function startEdit(i: Interviewer) { setEditingId(i.id); setForm(toForm(i)); setFile(null); setPreview(null); setPortraitFile(null); setPortraitPreview(null); setFormError('') }
  function startNew() { setEditingId('new'); setForm(emptyForm()); setNewId(''); setFile(null); setPreview(null); setPortraitFile(null); setPortraitPreview(null); setFormError('') }
  function closeForm() { setEditingId(null); setFile(null); setPreview(null); setPortraitFile(null); setPortraitPreview(null); setFormError('') }
  function pickFile(f: File | null) { setFile(f); setPreview(f ? URL.createObjectURL(f) : null) }
  function pickPortrait(f: File | null) { setPortraitFile(f); setPortraitPreview(f ? URL.createObjectURL(f) : null) }

  async function save() {
    if (!token || editingId === null) return
    const id = editingId === 'new' ? (newId.trim() || slugify(form.displayName)) : editingId
    if (!id) { setFormError('Give the interviewer a name.'); return }
    setSaving(true); setFormError('')
    try {
      let saved = await interviewersApi.save(token, id, form)
      if (file) saved = await interviewersApi.uploadBackground(token, id, file)
      if (portraitFile) saved = await interviewersApi.uploadPortrait(token, id, await shrinkImage(portraitFile))
      await load()
      closeForm()
      void saved
    } catch (e) { setFormError((e as Error).message || 'Save failed.') }
    finally { setSaving(false) }
  }

  async function toggleActive(i: Interviewer) {
    if (!token) return
    try { await interviewersApi.save(token, i.id, { ...toForm(i), active: !i.active }); await load() }
    catch (e) { setError((e as Error).message) }
  }

  async function remove(i: Interviewer) {
    if (!token) return
    if (!window.confirm(`Delete ${i.displayName}? This removes them and their uploaded background. Candidates will no longer see them.`)) return
    try { await interviewersApi.remove(token, i.id); await load() }
    catch (e) { setError((e as Error).message) }
  }

  function copy(text: string) {
    void navigator.clipboard?.writeText(text).then(() => { setCopied(text); window.setTimeout(() => setCopied(c => (c === text ? null : c)), 1500) }).catch(() => { /* clipboard blocked */ })
  }

  const editing = editingId && editingId !== 'new' ? items?.find(i => i.id === editingId) : undefined
  const shownBackground = preview ?? bgSrc(editing?.backgroundUrl ?? null)
  const shownPortrait = portraitPreview ?? bgSrc(editing?.portraitUrl ?? null) ?? (editing ? `https://candidate.theinterviewchair.com/images/interviewers/${editing.id}.jpg` : null)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 8 }}><Users size={20} /> Interviewers</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4, maxWidth: 680 }}>
            Everyone a candidate can meet. Each has a Spatius face, a background picture, a voice and a personality. The interview room takes its three seats from the interviewers marked
            as <b>default</b> for HR, technical and briefing; the others will be offered as choices. The Spatius avatar ID is not a secret: copy it from Spatius Studio.
          </p>
        </div>
        <button onClick={startNew} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 800, color: '#04120c', background: '#34D399', border: 'none', borderRadius: 8, padding: '9px 16px', cursor: 'pointer' }}>
          <Plus size={14} /> Add interviewer
        </button>
      </div>

      {error && <div style={{ color: '#EF4444', fontSize: 12.5, marginBottom: 12 }}>{error}</div>}
      {!items && !error && <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-3)', fontSize: 13 }}><Loader2 size={16} className="admin-spin" /> Loading…</div>}

      {items && items.length === 0 && <div style={{ color: 'var(--text-3)', fontSize: 13 }}>No interviewers yet. Add the first one.</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 16 }}>
        {(items ?? []).map(i => (
          <div key={i.id} style={{ ...card, opacity: i.active ? 1 : 0.6 }}>
            <div style={{ aspectRatio: '16 / 9', background: bgSrc(i.backgroundUrl) ? `center / cover url(${bgSrc(i.backgroundUrl)})` : 'linear-gradient(135deg, #232b3b, #3b475c)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: 10 }}>
              <CardFace id={i.id} portrait={bgSrc(i.portraitUrl)} room={bgSrc(i.backgroundUrl)} />
              <span style={{ position: 'relative', fontSize: 11, fontWeight: 800, color: '#fff', background: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: '3px 8px' }}>{i.displayName}</span>
              <span style={{ position: 'relative', display: 'flex', gap: 5 }}>
                {i.defaultFor && <span style={{ fontSize: 10, fontWeight: 800, color: '#04120c', background: '#34D399', borderRadius: 6, padding: '3px 7px' }}>Default {ROLE_LABEL[i.defaultFor]}</span>}
                {!i.active && <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: 'rgba(239,68,68,0.85)', borderRadius: 6, padding: '3px 7px' }}>Hidden</span>}
              </span>
              {!bgSrc(i.backgroundUrl) && <span style={{ position: 'absolute', top: 10, left: 10, zIndex: 1, fontSize: 10.5, color: 'rgba(255,255,255,0.7)' }}>No background uploaded yet (the room uses its own file)</span>}
            </div>
            <div style={{ padding: '12px 14px', display: 'grid', gap: 10, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{i.displayName}</span>
                <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-3)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px' }}>{ROLE_LABEL[i.role]}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.45, minHeight: 34 }}>{i.description || 'No description yet.'}</div>
              <TraitBars t={i.traits} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: 'var(--text-3)' }}>
                <span style={{ fontFamily: 'ui-monospace, monospace', overflowWrap: 'anywhere', flex: 1 }}>{i.spatiusAvatarId || 'no avatar ID'}</span>
                {i.spatiusAvatarId && <button onClick={() => copy(i.spatiusAvatarId)} title="Copy the avatar ID" style={{ ...smallBtn, padding: '3px 6px' }}>{copied === i.spatiusAvatarId ? <Check size={11} /> : <Copy size={11} />}</button>}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                <button onClick={() => startEdit(i)} style={smallBtn}><Pencil size={12} /> Edit</button>
                <button onClick={() => void toggleActive(i)} style={smallBtn}>{i.active ? <><EyeOff size={12} /> Hide</> : <><Eye size={12} /> Show</>}</button>
                <button onClick={() => void remove(i)} style={{ ...smallBtn, color: '#EF4444' }}><Trash2 size={12} /> Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editingId !== null && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '5vh 16px', overflowY: 'auto', zIndex: 50 }}>
          <div style={{ ...card, width: 'min(720px, 100%)', padding: 22, gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{editingId === 'new' ? 'Add an interviewer' : `Edit ${editing?.displayName ?? editingId}`}</div>
              <button onClick={closeForm} aria-label="Close" style={{ ...smallBtn, padding: 6 }}><X size={14} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <div><label style={label}>Name candidates see</label><input value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} style={field} maxLength={40} placeholder="e.g. Haruto" /></div>
              <div>
                <label style={label}>Role</label>
                <select value={form.role} onChange={e => { const role = e.target.value as InterviewerRole; setForm({ ...form, role, defaultFor: form.defaultFor && form.defaultFor !== role ? null : form.defaultFor }) }} style={field}>
                  <option value="hr">HR interviewer</option><option value="technical">Technical interviewer</option><option value="briefing">Briefing (meets you first)</option>
                </select>
              </div>
              {editingId === 'new' && <div><label style={label}>Short id (letters, numbers, hyphens)</label><input value={newId} onChange={e => setNewId(e.target.value.toLowerCase())} style={field} placeholder={slugify(form.displayName) || 'haruto'} maxLength={32} /></div>}
              <div style={{ gridColumn: '1 / -1' }}><label style={label}>Spatius avatar ID (Copy ID in Spatius Studio)</label><input value={form.spatiusAvatarId} onChange={e => setForm({ ...form, spatiusAvatarId: e.target.value })} style={{ ...field, fontFamily: 'ui-monospace, monospace' }} placeholder="17dcea17-a918-4963-ad1b-742bc0e82d10" /></div>
              <div><label style={label}>Voice ID (ElevenLabs), optional for now</label><input value={form.voiceId} onChange={e => setForm({ ...form, voiceId: e.target.value })} style={{ ...field, fontFamily: 'ui-monospace, monospace' }} /></div>
              <div><label style={label}>Order in the list</label><input type="number" min={0} max={10000} value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} style={field} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={label}>One-line description ({form.description.length}/160)</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={field} maxLength={160} placeholder="e.g. Calm and methodical, with a dry sense of humour." /></div>
            </div>

            <div>
              <div style={{ ...label, marginBottom: 8 }}>Personality (shown to candidates; it also steers how the questions and feedback are written)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                {TRAITS.map(t => (
                  <div key={t.key}>
                    <label style={{ ...label, display: 'flex', justifyContent: 'space-between' }}><span>{t.label}</span><span style={{ fontWeight: 600, color: 'var(--text-3)' }}>{t.low} {form[t.key]} {t.high}</span></label>
                    <input type="range" min={1} max={5} step={1} value={form[t.key]} onChange={e => setForm({ ...form, [t.key]: Number(e.target.value) })} style={{ width: '100%' }} />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ ...label, marginBottom: 6 }}>Portrait (the person's face: shown in the picker, on the homepage and in this list; JPG, PNG or WebP, any size, it is shrunk for you)</div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ width: 120, aspectRatio: '4 / 3', borderRadius: 8, border: '1px solid var(--border)', background: shownPortrait ? `center 12% / cover url(${shownPortrait})` : 'var(--bg3)', flexShrink: 0 }} />
                <label style={{ ...smallBtn, cursor: 'pointer' }}><Upload size={12} /> {portraitFile ? portraitFile.name : 'Choose a portrait'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => pickPortrait(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />
                </label>
                {editingId === 'new' && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>It is uploaded when you save.</span>}
              </div>
            </div>

            <div>
              <div style={{ ...label, marginBottom: 6 }}>Background picture (16:9, JPG, PNG or WebP, up to 6 MB; download it from Spatius Studio)</div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ width: 200, aspectRatio: '16 / 9', borderRadius: 8, border: '1px solid var(--border)', background: shownBackground ? `center / cover url(${shownBackground})` : 'var(--bg3)', flexShrink: 0 }} />
                <label style={{ ...smallBtn, cursor: 'pointer' }}><Upload size={12} /> {file ? file.name : 'Choose a picture'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => pickFile(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />
                </label>
                {editingId === 'new' && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>It is uploaded when you save.</span>}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--text-2)' }}>
              <label style={{ display: 'flex', gap: 7, alignItems: 'center' }}><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Visible to candidates</label>
              <label style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                <input type="checkbox" checked={form.defaultFor === form.role} onChange={e => setForm({ ...form, defaultFor: e.target.checked ? form.role : null })} />
                The default {ROLE_LABEL[form.role]} interviewer (the room uses them for that seat; any previous default is replaced)
              </label>
            </div>

            {formError && <div style={{ color: '#EF4444', fontSize: 12.5 }}>{formError}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={closeForm} style={smallBtn}>Cancel</button>
              <button onClick={() => void save()} disabled={saving || !form.displayName.trim() || !form.spatiusAvatarId.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 800, color: '#04120c', background: '#34D399', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', opacity: saving || !form.displayName.trim() || !form.spatiusAvatarId.trim() ? 0.55 : 1 }}>
                {saving ? <><Loader2 size={13} className="admin-spin" /> Saving…</> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
