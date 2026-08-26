import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { organisationsApi, type OrganisationSummary, type ApiError } from '../api/organisationsApi'

const ORG_TYPES = ['business', 'university', 'jobcentre', 'recruitment']

export default function Organisations() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [rows, setRows] = useState<OrganisationSummary[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async (q?: string) => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const res = await organisationsApi.list(token, { search: q, size: 100 })
      setRows(res.rows)
      setTotal(res.total)
    } catch (err) {
      setError((err as ApiError).error ?? 'Failed to load organisations.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    load(search.trim() || undefined)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>Organisations</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>{total} organisation{total === 1 ? '' : 's'}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 10,
            padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
          New Organisation
        </button>
      </div>

      <form onSubmit={handleSearchSubmit} style={{ marginBottom: 18 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10,
          padding: '9px 14px', maxWidth: 360,
        }}>
          <Search size={15} color="var(--text-3)" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or contact email…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit' }}
          />
        </div>
      </form>

      {error && (
        <div style={{ fontSize: 12, color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-3)', fontSize: 13, padding: '24px 0' }}>
          <Loader2 size={16} className="admin-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '24px 0' }}>No organisations yet.</div>
      ) : (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Name', 'Type', 'Contact', 'Seats', 'Seat fee', 'Per prep', 'Members', 'Status'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(o => {
                const promoActive = o.promoSeatFeeGbp !== null && o.effectiveSeatMonthlyFeeGbp !== o.seatMonthlyFeeGbp
                return (
                  <tr
                    key={o.id}
                    onClick={() => navigate(`/organisations/${o.id}`)}
                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text)' }}>{o.name}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-2)', textTransform: 'capitalize' }}>{o.type}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{o.contactEmail}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{o.seatCount}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {promoActive ? (
                        <span>
                          <span style={{ textDecoration: 'line-through', color: 'var(--text-3)', marginRight: 6 }}>£{o.seatMonthlyFeeGbp.toFixed(0)}</span>
                          <span style={{ color: 'var(--green)', fontWeight: 700 }}>£{o.effectiveSeatMonthlyFeeGbp.toFixed(0)}</span>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-2)' }}>£{o.seatMonthlyFeeGbp.toFixed(0)}</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>£{o.prepUnitPriceGbp.toFixed(2)}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{o.memberCount}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6, textTransform: 'capitalize',
                        color: o.status === 'active' ? 'var(--green)' : 'var(--text-3)',
                        background: o.status === 'active' ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.05)',
                      }}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateOrganisationModal
          onClose={() => setShowCreate(false)}
          onCreated={id => { setShowCreate(false); navigate(`/organisations/${id}`) }}
        />
      )}
    </div>
  )
}

function CreateOrganisationModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) {
  const { token } = useAuth()
  const [name, setName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [domain, setDomain] = useState('')
  const [type, setType] = useState('business')
  const [seatCount, setSeatCount] = useState('1')
  const [status, setStatus] = useState('active')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // Only close on a genuine click on the backdrop itself — a text-selection drag that
  // starts inside an input and releases past the form's edge would otherwise register
  // as a "click" on the backdrop (mousedown/mouseup targets differ, so the click's
  // target becomes their common ancestor) and close the form mid-edit.
  const mouseDownOnBackdropRef = useRef(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    if (!name.trim()) { setError('Organisation name is required.'); return }
    if (!contactEmail.trim() || !contactEmail.includes('@')) { setError('A valid contact email is required.'); return }
    if (!contactName.trim()) { setError('Contact name is required.'); return }
    if (!phone.trim()) { setError('Phone number is required.'); return }
    setSaving(true)
    setError('')
    try {
      const { id } = await organisationsApi.create(token, {
        name: name.trim(),
        contactEmail: contactEmail.trim(),
        contactName: contactName.trim(),
        phone: phone.trim(),
        website: website.trim() || undefined,
        domain: domain.trim() || undefined,
        type,
        seatCount: Number(seatCount) || 1,
        status,
      })
      onCreated(id)
    } catch (err) {
      setError((err as ApiError).error ?? 'Failed to create organisation.')
      setSaving(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
      onMouseDown={e => { mouseDownOnBackdropRef.current = e.target === e.currentTarget }}
      onClick={e => { if (e.target === e.currentTarget && mouseDownOnBackdropRef.current) onClose() }}
    >
      <form
        onSubmit={handleSubmit}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 640, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>New Organisation</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="Name">
              <input type="text" autoComplete="off" value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="e.g. Vallum Associates" />
            </FormField>
          </div>
          <FormField label="Contact email">
            <input type="text" autoComplete="off" value={contactEmail} onChange={e => setContactEmail(e.target.value)} style={inputStyle} placeholder="contact@company.com" />
          </FormField>
          <FormField label="Contact name">
            <input type="text" autoComplete="off" value={contactName} onChange={e => setContactName(e.target.value)} style={inputStyle} placeholder="e.g. Mike Petrie" />
          </FormField>
          <FormField label="Phone">
            <input type="text" autoComplete="off" value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} placeholder="e.g. 020 7946 0958" />
          </FormField>
          <FormField label="Website">
            <input type="text" autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} style={inputStyle} placeholder="https://company.com" />
          </FormField>
          <FormField label="Email domain">
            <input type="text" autoComplete="off" value={domain} onChange={e => setDomain(e.target.value)} style={inputStyle} placeholder="e.g. vallumassociates.com" />
          </FormField>
          <FormField label="Type">
            <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
              {ORG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormField>
          <FormField label="Seat count">
            <input type="number" min={1} value={seatCount} onChange={e => setSeatCount(e.target.value)} style={inputStyle} />
          </FormField>
          <FormField label="Status">
            <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </FormField>
        </div>

        {error && <div style={{ fontSize: 12, color: '#EF4444' }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button type="button" onClick={onClose} style={{ ...buttonStyle, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-2)' }}>Cancel</button>
          <button type="submit" disabled={saving} style={{ ...buttonStyle, background: 'var(--blue)', color: '#fff', border: 'none', flex: 1, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Creating…' : 'Create organisation'}
          </button>
        </div>
      </form>
    </div>
  )
}

export function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      {children}
    </div>
  )
}

export const inputStyle: React.CSSProperties = {
  background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
  padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', outline: 'none',
  caretColor: 'var(--blue)', width: '100%', boxSizing: 'border-box',
}

export const buttonStyle: React.CSSProperties = {
  padding: '10px 16px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
}
