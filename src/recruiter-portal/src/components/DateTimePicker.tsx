import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  value: string // 'YYYY-MM-DDTHH:mm' (same shape the native datetime-local input used) or ''
  onChange: (value: string) => void
  hasError?: boolean
}

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function toLocalIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function daysInGrid(month: Date): Date[] {
  const year = month.getFullYear()
  const m = month.getMonth()
  const firstOfMonth = new Date(year, m, 1)
  const startOffset = (firstOfMonth.getDay() + 6) % 7 // Monday-first grid
  const gridStart = new Date(year, m, 1 - startOffset)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    return d
  })
}

export function DateTimePicker({ value, onChange, hasError }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedDate = value ? new Date(value) : null
  const [viewMonth, setViewMonth] = useState(() => selectedDate ?? new Date())

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function selectDay(day: Date) {
    const next = new Date(day)
    next.setHours(selectedDate?.getHours() ?? 9, selectedDate?.getMinutes() ?? 0, 0, 0)
    onChange(toLocalIso(next))
  }

  function setTime(hh: number, mm: number) {
    const next = new Date(selectedDate ?? new Date())
    next.setHours(hh, mm, 0, 0)
    onChange(toLocalIso(next))
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const label = selectedDate
    ? `${selectedDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · ${selectedDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
    : 'Select date & time…'

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--bg3)', border: `1px solid ${hasError ? '#F87171' : 'var(--border)'}`, borderRadius: 10,
          padding: '13px 16px', color: selectedDate ? 'var(--text)' : 'var(--text-3)', fontSize: 14,
          fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <Calendar size={15} style={{ flexShrink: 0, opacity: 0.6 }} />
        {label}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 30,
              background: '#0c1220', border: '1px solid var(--border)', borderRadius: 14,
              padding: 16, width: 300, boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <button type="button" onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} style={navBtnStyle}><ChevronLeft size={14} /></button>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                {viewMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              </div>
              <button type="button" onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} style={navBtnStyle}><ChevronRight size={14} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
              {DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-3)', padding: '4px 0' }}>{d}</div>)}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 14 }}>
              {daysInGrid(viewMonth).map((d, i) => {
                const inMonth = d.getMonth() === viewMonth.getMonth()
                const isSelected = !!selectedDate && d.toDateString() === selectedDate.toDateString()
                const isToday = d.toDateString() === today.toDateString()
                const isPast = d < today
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={isPast}
                    onClick={() => selectDay(d)}
                    style={{
                      aspectRatio: '1', border: 'none', borderRadius: 8, cursor: isPast ? 'default' : 'pointer',
                      fontSize: 12, fontWeight: isSelected ? 800 : 500, fontFamily: 'inherit',
                      background: isSelected ? '#4F8EF7' : 'transparent',
                      color: isSelected ? '#fff' : (!inMonth || isPast) ? 'rgba(255,255,255,0.2)' : isToday ? '#4F8EF7' : 'var(--text)',
                    }}
                  >
                    {d.getDate()}
                  </button>
                )
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Time</span>
              <input
                type="time"
                value={selectedDate ? `${String(selectedDate.getHours()).padStart(2, '0')}:${String(selectedDate.getMinutes()).padStart(2, '0')}` : '09:00'}
                onChange={e => {
                  const [hh, mm] = e.target.value.split(':').map(Number)
                  setTime(hh, mm)
                }}
                style={{
                  flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
                  padding: '8px 10px', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', outline: 'none',
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                width: '100%', marginTop: 14, background: 'linear-gradient(135deg,#4F8EF7,#2563eb)', color: '#fff',
                border: 'none', borderRadius: 8, padding: '10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Done
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const navBtnStyle: React.CSSProperties = {
  width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 6, color: 'var(--text-2)', cursor: 'pointer',
}
