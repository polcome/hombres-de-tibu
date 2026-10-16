import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAction, useStore } from '../store'
import type { TrainingKind } from '../types'
import { currentMonthKey, monthKey, monthLabel, shiftMonth, todayISO } from '../logic/months'
import { displayName, fmtTotals, monthTotals, yearTotals } from '../logic/stats'
import { whatsappCount } from '../logic/acta'
import { Avatar } from '../components/Avatar'
import { CopyButton, ErrorMsg, Section, WhatsAppButton } from '../components/ui'

export default function Trainings() {
  const { db, me } = useStore()
  const { run, busy, err } = useAction()
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState('')
  const year = new Date().getFullYear()
  const [scope, setScope] = useState<'year' | string>('year')

  const add = async (kind: TrainingKind) => {
    if (!me) return
    const ok = await run(() => api.addTraining({ member_id: me.id, date, kind, count: 1, note: note.trim() || null }))
    if (ok) {
      setNote('')
      setFlash(kind === 'gym' ? '💪 +1 al gym!' : '🏃 +1 fora del gym!')
      setTimeout(() => setFlash(''), 1800)
    }
  }

  const totals = (id: string) => (scope === 'year' ? yearTotals(db, id, year) : monthTotals(db, id, scope))
  const rows = db.members
    .filter((m) => m.active)
    .map((m) => ({ m, t: totals(m.id) }))
    .sort((a, b) => b.t.gym - a.t.gym || b.t.fora - a.t.fora)
  const max = Math.max(1, ...rows.map((r) => r.t.gym + r.t.fora))
  const mine = me ? db.trainings.filter((t) => t.member_id === me.id && !t.baseline).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8) : []
  const months = [0, -1, -2, -3, -4, -5].map((d) => shiftMonth(currentMonthKey(), d))
  const countText = whatsappCount(db, year, (id) => yearTotals(db, id, year))

  return (
    <div className="stack">
      <Section title="🏋️ Apuntar entreno">
        {me ? (
          <div className="form">
            <div className="row">
              <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
              <input placeholder="Nota (opcional): pit, pàdel…" value={note} onChange={(e) => setNote(e.target.value)} maxLength={60} />
            </div>
            <div className="row">
              <button className="btn btn-primary btn-big grow" disabled={busy} onClick={() => add('gym')}>
                +1 Gym 💪
              </button>
              <button className="btn btn-big grow" disabled={busy} onClick={() => add('fora')}>
                +1 Fora (…) 🏃
              </button>
            </div>
            {flash && <div className="flash">{flash}</div>}
            <ErrorMsg err={err} />
            {mine.length > 0 && (
              <div className="mine">
                <div className="muted small">Els teus últims:</div>
                {mine.map((t) => (
                  <div key={t.id} className="row small">
                    <span>{t.kind === 'gym' ? '💪' : '🏃'}</span>
                    <span>{new Date(t.date).toLocaleDateString('ca-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    {t.note && <span className="muted">{t.note}</span>}
                    <button className="link danger ml-auto" onClick={() => run(() => api.deleteTraining(t.id))}>
                      treure
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p>
            <Link to="/login">Entra</Link> per apuntar-te els entrenos.
          </p>
        )}
      </Section>

      <Section
        title="Recompte"
        right={
          <select className="select-sm" value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="year">Any {year}</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        }
      >
        <p className="muted small">Format: gym (fora del gym). {scope !== 'year' && 'Els mesos només compten el que s\'apunta a l\'app.'}</p>
        <div className="bars">
          {rows.map(({ m, t }, i) => (
            <Link key={m.id} to={`/jugador/${m.slug}`} className="bar-row">
              <span className="rank-pos">{i + 1}</span>
              <Avatar member={m} size={26} />
              <span className="bar-name">{displayName(m)}</span>
              <span className="bar">
                <span className="bar-gym" style={{ width: `${(t.gym / max) * 100}%` }} />
                <span className="bar-fora" style={{ width: `${(t.fora / max) * 100}%` }} />
              </span>
              <b className="bar-num">{fmtTotals(t)}</b>
            </Link>
          ))}
        </div>
        {scope === 'year' && (
          <div className="row wrap mt">
            <CopyButton text={countText}>📋 Copiar recompte</CopyButton>
            <WhatsAppButton text={countText}>Compartir</WhatsAppButton>
          </div>
        )}
      </Section>

      <Section title="Últims entrenos del grup">
        <div className="stack-sm">
          {db.trainings
            .filter((t) => !t.baseline && monthKey(t.date) >= shiftMonth(currentMonthKey(), -1))
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 15)
            .map((t) => {
              const m = db.members.find((x) => x.id === t.member_id)
              return (
                <div key={t.id} className="row small">
                  <Avatar member={m} size={22} />
                  <b>{displayName(m)}</b>
                  <span>{t.kind === 'gym' ? '💪 gym' : '🏃 fora'}</span>
                  {t.note && <span className="muted">· {t.note}</span>}
                  <span className="muted ml-auto">{new Date(t.date).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' })}</span>
                </div>
              )
            })}
        </div>
      </Section>
    </div>
  )
}
