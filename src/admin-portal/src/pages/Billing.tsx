import { useCallback, useEffect, useState } from 'react'
import { Loader2, TrendingUp, Users, Building2, Receipt } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { billingApi, type BillingSummary, type ApiError } from '../api/billingApi'

// Admin revenue overview (Francis, 2026-09-24: "a financial page too... investors would love
// it"). Deliberately no fabricated growth chart — there's no historical snapshot table yet to
// build one honestly from, so this reports only real current-state numbers plus a real recent-
// transactions feed. Candidate MRR is Stripe-verified; org seat MRR is a manually-set rate, kept
// visually distinct so the two aren't blended into one number people can't trust.
function gbp(n: number): string {
  return `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function StatCard({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', flex: '1 1 220px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: accent ?? 'var(--text-3)' }}>
        {icon}
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.01em' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function Billing() {
  const { token } = useAuth()
  const [data, setData] = useState<BillingSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      setData(await billingApi.summary(token))
    } catch (err) {
      setError((err as ApiError).error ?? 'Failed to load billing summary.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>Billing</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>Revenue overview — real numbers only, no projections.</p>
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-3)', fontSize: 13, padding: '24px 0' }}>
          <Loader2 size={16} className="admin-spin" /> Loading…
        </div>
      )}

      {!loading && error && (
        <div style={{ fontSize: 12, color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px' }}>
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
            <StatCard icon={<TrendingUp size={14} />} label="Total MRR" value={gbp(data.totalMrrGbp)} sub="Candidate subscriptions + org seats" accent="#34D399" />
            <StatCard icon={<Users size={14} />} label="Candidate MRR" value={gbp(data.candidateMrrGbp)} sub={`${data.activeSubscriberCount} active subscriber${data.activeSubscriberCount === 1 ? '' : 's'} · Stripe-verified`} />
            <StatCard icon={<Building2 size={14} />} label="Org seat MRR" value={gbp(data.seatMrrGbp)} sub={`${data.activeOrganisationCount} active organisation${data.activeOrganisationCount === 1 ? '' : 's'} · manually-set rate, not yet Stripe-billed`} />
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
            <StatCard icon={<Receipt size={14} />} label="One-off, last 30 days" value={gbp(data.oneOffLast30DaysGbp)} sub="Interview passes/gifts + Question Packs" />
            <StatCard icon={<Receipt size={14} />} label="One-off, all time" value={gbp(data.oneOffAllTimeGbp)} />
          </div>

          <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 12 }}>Recent transactions</h2>
          {data.recentTransactions.length === 0 ? (
            <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '24px 0' }}>No payments recorded yet.</div>
          ) : (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Date</th>
                    <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Type</th>
                    <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Detail</th>
                    <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentTransactions.map((t, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{new Date(t.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#34D399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 6, padding: '3px 8px' }}>{t.type}</span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{t.label}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>{gbp(t.amountGbp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
