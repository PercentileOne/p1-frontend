import { useEffect, useRef } from 'react'
import { useIsMobile } from '../hooks/useIsMobile'

const metrics = [
  { name: 'Habit Consistency', score: 88, col: '#6366F1' },
  { name: 'Goal Achievement',  score: 74, col: '#10B981' },
  { name: 'Skill Growth',      score: 91, col: '#F59E0B' },
  { name: 'Consistency Score', score: 82, col: '#EF4444' },
  { name: 'Overall Percentile', score: 88, col: '#6366F1', label: 'Top 12%' },
]

export default function PercentileSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const barsRef = useRef<HTMLDivElement[]>([])
  const isMobile = useIsMobile()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const size = isMobile ? 260 : 340
    const cx = size / 2, cy = size / 2, r = size * 0.35
    canvas.width = size
    canvas.height = size
    const labels = ['Habits','Goals','Skills','Consistency','Growth','Achievement']
    const values = [.88,.74,.91,.82,.79,.85]
    const n = labels.length

    ctx.clearRect(0, 0, size, size)
    for (let ring = 1; ring <= 5; ring++) {
      ctx.beginPath()
      for (let i = 0; i < n; i++) { const a=(Math.PI*2*i/n)-Math.PI/2,rr=r*ring/5; i===0?ctx.moveTo(cx+rr*Math.cos(a),cy+rr*Math.sin(a)):ctx.lineTo(cx+rr*Math.cos(a),cy+rr*Math.sin(a)) }
      ctx.closePath(); ctx.strokeStyle='rgba(0,0,0,.06)'; ctx.lineWidth=1; ctx.stroke()
    }
    for (let i = 0; i < n; i++) { const a=(Math.PI*2*i/n)-Math.PI/2; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a)); ctx.strokeStyle='rgba(0,0,0,.06)'; ctx.lineWidth=1; ctx.stroke() }
    ctx.beginPath()
    for (let i = 0; i < n; i++) { const a=(Math.PI*2*i/n)-Math.PI/2,x=cx+r*values[i]*Math.cos(a),y=cy+r*values[i]*Math.sin(a); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y) }
    ctx.closePath(); ctx.fillStyle='rgba(99,102,241,.15)'; ctx.fill(); ctx.strokeStyle='#6366F1'; ctx.lineWidth=2; ctx.stroke()
    for (let i = 0; i < n; i++) { const a=(Math.PI*2*i/n)-Math.PI/2,x=cx+r*values[i]*Math.cos(a),y=cy+r*values[i]*Math.sin(a); ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2); ctx.fillStyle='#6366F1'; ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke() }
    ctx.fillStyle='#94A3B8'; ctx.font=`600 ${isMobile ? 9 : 11}px system-ui,sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'
    for (let i = 0; i < n; i++) { const a=(Math.PI*2*i/n)-Math.PI/2; ctx.fillText(labels[i],cx+(r+20)*Math.cos(a),cy+(r+20)*Math.sin(a)) }
  }, [isMobile])

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return
      barsRef.current.forEach((el, i) => {
        if (!el) return
        setTimeout(() => { el.style.width = el.dataset.width + '%' }, i * 120)
      })
      obs.disconnect()
    }, { threshold: .3 })
    if (barsRef.current[0]?.parentElement) obs.observe(barsRef.current[0].parentElement.parentElement!)
    return () => obs.disconnect()
  }, [])

  return (
    <section id="ranking" style={{ background: 'var(--bg)', padding: isMobile ? '64px 0' : '96px 0' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '0 20px' : '0 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 40 : 72, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12 }}>Percentile Ranking System</div>
            <h2 style={{ fontSize: 'clamp(26px,3.5vw,42px)', fontWeight: 900, letterSpacing: -1.5, lineHeight: 1.1, color: 'var(--text)', marginBottom: 20 }}>Your personal performance index.</h2>
            <p style={{ fontSize: 16, color: 'var(--text-3)', lineHeight: 1.7, marginBottom: 28 }}>
              Every habit completed, every goal reached, every skill levelled up — all feed into a single score that tells you exactly where you stand.
            </p>
            {metrics.map((m, i) => (
              <div key={m.name} style={{ marginBottom: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-2)' }}>{m.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)' }}>{m.label ?? m.score}</span>
                </div>
                <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div ref={el => { if (el) barsRef.current[i] = el }} data-width={m.score}
                    style={{ height: '100%', width: 0, background: m.col, borderRadius: 3, transition: 'width 1.2s cubic-bezier(.16,1,.3,1)' }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <canvas ref={canvasRef} width={isMobile ? 260 : 340} height={isMobile ? 260 : 340} />
          </div>
        </div>
      </div>
    </section>
  )
}
