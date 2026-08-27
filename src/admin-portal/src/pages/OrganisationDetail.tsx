import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Sparkles, X, UserPlus, Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { DateTimePicker } from '../components/DateTimePicker'
import { organisationsApi, type OrganisationDetail as OrgDetail, type ApiError } from '../api/organisationsApi'
import { FormField, inputStyle, buttonStyle } from './Organisations'

const ORG_TYPES = ['business', 'university', 'jobcentre', 'recruitment']

function toLocalInputValue(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function OrganisationDetail() {
  const { id } = useParams<{ id: string }>()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [org, setOrg] = useState<OrgDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const showToast = useCallback((message: string) => {
    clearTimeout(toastTimerRef.current)
    setToast(message)
    toastTimerRef.current = setTimeout(() => setToast(null), 2200)
  }, [])

  useEffect(() => () => clearTimeout(toastTimerRef.current), [])

  const load = useCallback(async () => {
    if (!token || !id) return
    setLoading(true)
    setError('')
    try {
      setOrg(await organisationsApi.get(token, Number(id)))
    } catch (err) {
      setError((err as ApiError).error ?? 'Failed to load organisation.')
    } finally {
      setLoading(false)
    }
  }, [token, id])

  useEffect(() => { load() }, [load])

  if (loading) return <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Loading…</div>
  if (error) return <div style={{ fontSize: 13, color: '#EF4444' }}>{error}</div>
  if (!org) return null

  return (
    <div style={{ maxWidth: 760 }}>
      <button
        onClick={() => navigate('/organisations')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 18, padding: 0, fontFamily: 'inherit' }}
      >
        <ArrowLeft size={15} /> Organisations
      </button>

      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 24 }}>{org.name}</h1>

      <OverviewCard org={org} token={token!} onSaved={setOrg} showToast={showToast} />
      <BillingCard org={org} token={token!} onSaved={setOrg} showToast={showToast} />
      <MembersCard org={org} token={token!} onSaved={setOrg} />

      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg2)', border: '1px solid rgba(52,211,153,0.35)', borderRadius: 10,
          padding: '10px 18px', boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
          fontSize: 13, fontWeight: 700, color: 'var(--text)', zIndex: 200,
          animation: 'adminToastIn 0.2s ease-out',
        }}>
          <Check size={15} color="var(--green)" strokeWidth={3} />
          {toast}
        </div>
      )}
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 22, marginBottom: 18,
}

function OverviewCard({ org, token, onSaved, showToast }: { org: OrgDetail; token: string; onSaved: (o: OrgDetail) => void; showToast: (message: string) => void }) {
  const [name, setName] = useState(org.name)
  const [type, setType] = useState(org.type)
  const [contactEmail, setContactEmail] = useState(org.contactEmail)
  const [contactName, setContactName] = useState(org.contactName)
  const [phone, setPhone] = useState(org.phone ?? '')
  const [website, setWebsite] = useState(org.website ?? '')
  const [domain, setDomain] = useState(org.domain ?? '')
  const [seatCount, setSeatCount] = useState(String(org.seatCount))
  const [status, setStatus] = useState(org.status)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!contactName.trim()) { setError('Contact name is required.'); return }
    if (!phone.trim()) { setError('Phone number is required.'); return }
    setSaving(true)
    setError('')
    try {
      await organisationsApi.update(token, org.id, {
        name: name.trim(), type, contactEmail: contactEmail.trim(),
        contactName: contactName.trim(), phone: phone.trim(), website: website.trim(), domain: domain.trim(),
        seatCount: Number(seatCount) || 1, status,
      })
      onSaved({
        ...org, name: name.trim(), type, contactEmail: contactEmail.trim(), contactName: contactName.trim(),
        phone: phone.trim() || null, website: website.trim() || null, domain: domain.trim() || null,
        seatCount: Number(seatCount) || 1, status,
      })
      showToast('Saved')
    } catch (err) {
      setError((err as ApiError).error ?? 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={cardStyle}>
      <h2 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 16 }}>Overview</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <FormField label="Name"><input value={name} onChange={e => setName(e.target.value)} style={inputStyle} /></FormField>
        <FormField label="Type">
          <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
            {ORG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </FormField>
        <FormField label="Contact email"><input value={contactEmail} onChange={e => setContactEmail(e.target.value)} style={inputStyle} /></FormField>
        <FormField label="Contact name"><input value={contactName} onChange={e => setContactName(e.target.value)} style={inputStyle} /></FormField>
        <FormField label="Phone"><input value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} placeholder="e.g. 020 7946 0958" /></FormField>
        <FormField label="Website"><input value={website} onChange={e => setWebsite(e.target.value)} style={inputStyle} placeholder="https://company.com" /></FormField>
        <FormField label="Email domain"><input value={domain} onChange={e => setDomain(e.target.value)} style={inputStyle} placeholder="e.g. vallumassociates.com" /></FormField>
        <FormField label="Seat count"><input type="number" min={1} value={seatCount} onChange={e => setSeatCount(e.target.value)} style={inputStyle} /></FormField>
        <FormField label="Status">
          <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </FormField>
      </div>
      {error && <div style={{ fontSize: 12, color: '#EF4444', marginTop: 12 }}>{error}</div>}
      <button onClick={handleSave} disabled={saving} style={{ ...buttonStyle, background: 'var(--blue)', color: '#fff', border: 'none', marginTop: 16, opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  )
}

function BillingCard({ org, token, onSaved, showToast }: { org: OrgDetail; token: string; onSaved: (o: OrgDetail) => void; showToast: (message: string) => void }) {
  const [seatFee, setSeatFee] = useState(String(org.seatMonthlyFeeGbp))
  const [prepPrice, setPrepPrice] = useState(String(org.prepUnitPriceGbp))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [promoFee, setPromoFee] = useState(org.promoSeatFeeGbp !== null ? String(org.promoSeatFeeGbp) : '0')
  const [promoExpires, setPromoExpires] = useState(toLocalInputValue(org.promoExpiresAt))
  const [promoSaving, setPromoSaving] = useState(false)
  const [promoError, setPromoError] = useState('')

  const promoActive = org.promoSeatFeeGbp !== null && (org.promoExpiresAt === null || new Date(org.promoExpiresAt) > new Date())

  async function handleSaveRates() {
    setSaving(true)
    setError('')
    try {
      await organisationsApi.update(token, org.id, { seatMonthlyFeeGbp: Number(seatFee), prepUnitPriceGbp: Number(prepPrice) })
      onSaved({ ...org, seatMonthlyFeeGbp: Number(seatFee), prepUnitPriceGbp: Number(prepPrice) })
      showToast('Saved')
    } catch (err) {
      setError((err as ApiError).error ?? 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  async function handleApplyPromo() {
    setPromoSaving(true)
    setPromoError('')
    try {
      const body: Parameters<typeof organisationsApi.update>[2] = { promoSeatFeeGbp: Number(promoFee) }
      if (promoExpires) body.promoExpiresAt = new Date(promoExpires).toISOString()
      await organisationsApi.update(token, org.id, body)
      const updated = await organisationsApi.get(token, org.id)
      onSaved(updated)
      showToast('Promo applied')
    } catch (err) {
      setPromoError((err as ApiError).error ?? 'Failed to apply promo.')
    } finally {
      setPromoSaving(false)
    }
  }

  async function handleClearPromo() {
    setPromoSaving(true)
    setPromoError('')
    try {
      await organisationsApi.update(token, org.id, { clearPromo: true })
      const updated = await organisationsApi.get(token, org.id)
      onSaved(updated)
      setPromoFee('0')
      setPromoExpires('')
      showToast('Promo cleared')
    } catch (err) {
      setPromoError((err as ApiError).error ?? 'Failed to clear promo.')
    } finally {
      setPromoSaving(false)
    }
  }

  return (
    <div style={cardStyle}>
      <h2 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 16 }}>Billing</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <FormField label="Seat monthly fee (£)"><input type="number" min={0} step="0.01" value={seatFee} onChange={e => setSeatFee(e.target.value)} style={inputStyle} /></FormField>
        <FormField label="Per-prep price (£)"><input type="number" min={0} step="0.01" value={prepPrice} onChange={e => setPrepPrice(e.target.value)} style={inputStyle} /></FormField>
      </div>
      {error && <div style={{ fontSize: 12, color: '#EF4444', marginTop: 12 }}>{error}</div>}
      <button onClick={handleSaveRates} disabled={saving} style={{ ...buttonStyle, background: 'var(--blue)', color: '#fff', border: 'none', marginTop: 16, opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Saving…' : 'Save rates'}
      </button>

      <div style={{ borderTop: '1px solid var(--border)', marginTop: 22, paddingTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Sparkles size={15} color="var(--green)" />
          <h3 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>Promo seat fee</h3>
          {promoActive && (
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)', background: 'rgba(52,211,153,0.1)', borderRadius: 6, padding: '3px 8px' }}>ACTIVE</span>
          )}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14, lineHeight: 1.5 }}>
          Layered on top of the normal seat fee — per-prep billing keeps charging normally underneath. Reverts automatically once the expiry passes; leave the date blank for an open-ended promo you clear by hand.
        </p>

        {promoActive && (
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 14 }}>
            Currently billing <strong style={{ color: 'var(--green)' }}>£{org.effectiveSeatMonthlyFeeGbp.toFixed(2)}</strong> instead of £{org.seatMonthlyFeeGbp.toFixed(2)}
            {org.promoExpiresAt && <> until {new Date(org.promoExpiresAt).toLocaleString()}</>}.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <FormField label="Promo seat fee (£)"><input type="number" min={0} step="0.01" value={promoFee} onChange={e => setPromoFee(e.target.value)} style={inputStyle} /></FormField>
          <FormField label="Expires (optional)"><DateTimePicker value={promoExpires} onChange={setPromoExpires} /></FormField>
        </div>

        {promoError && <div style={{ fontSize: 12, color: '#EF4444', marginTop: 12 }}>{promoError}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button onClick={handleApplyPromo} disabled={promoSaving} style={{ ...buttonStyle, background: 'var(--green)', color: '#06210f', border: 'none', opacity: promoSaving ? 0.7 : 1 }}>
            {promoSaving ? 'Saving…' : 'Apply promo'}
          </button>
          {org.promoSeatFeeGbp !== null && (
            <button onClick={handleClearPromo} disabled={promoSaving} style={{ ...buttonStyle, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
              Clear promo
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function MembersCard({ org, token, onSaved }: { org: OrgDetail; token: string; onSaved: (o: OrgDetail) => void }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('member')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [justInvited, setJustInvited] = useState('')

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setAdding(true)
    setError('')
    setJustInvited('')
    try {
      const { invited, ...member } = await organisationsApi.addMember(token, org.id, { email: email.trim(), role, name: name.trim() || undefined })
      onSaved({ ...org, members: [...org.members, member] })
      if (invited) setJustInvited(member.email)
      setEmail('')
      setName('')
      setRole('member')
    } catch (err) {
      setError((err as ApiError).error ?? 'Failed to add member.')
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(memberId: number) {
    try {
      await organisationsApi.removeMember(token, org.id, memberId)
      onSaved({ ...org, members: org.members.filter(m => m.id !== memberId) })
    } catch (err) {
      setError((err as ApiError).error ?? 'Failed to remove member.')
    }
  }

  return (
    <div style={cardStyle}>
      <h2 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 16 }}>Members ({org.members.length})</h2>

      {org.members.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {org.members.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{m.name || m.email}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{m.email} · {m.role}</div>
              </div>
              <button onClick={() => handleRemove(m.id)} title="Remove" style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 4 }}>
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px' }}>
          <FormField label="Email">
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="person@company.com" style={inputStyle} />
          </FormField>
        </div>
        <div style={{ flex: '1 1 160px' }}>
          <FormField label="Name (if new)">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Mike Petrie" style={inputStyle} />
          </FormField>
        </div>
        <select value={role} onChange={e => setRole(e.target.value)} style={{ ...inputStyle, width: 120 }}>
          <option value="member">member</option>
          <option value="admin">admin</option>
        </select>
        <button type="submit" disabled={adding} style={{ ...buttonStyle, background: 'var(--blue)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 6, opacity: adding ? 0.7 : 1 }}>
          <UserPlus size={14} /> {adding ? 'Adding…' : 'Add'}
        </button>
      </form>
      <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>
        If they already have an account, this just links it. If not, enter their name too — we'll create their account (as a {org.type === 'recruitment' ? 'Recruiter' : org.type === 'business' ? 'Employer' : 'member'}) and email them a link to set their password.
      </p>

      {justInvited && (
        <div style={{ fontSize: 12, color: 'var(--green)', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 8, padding: '8px 12px', marginTop: 10 }}>
          Invite sent to {justInvited}.
        </div>
      )}
      {error && <div style={{ fontSize: 12, color: '#EF4444', marginTop: 10 }}>{error}</div>}
    </div>
  )
}
