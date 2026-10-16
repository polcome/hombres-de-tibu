import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAction, useStore } from '../store'
import type { TrainingKind } from '../types'
import { currentMonthKey, monthKey, monthLabel, shiftMonth, todayISO } from '../logic/months'
import { displayName, fmtTotals, monthTotals, yearTotals } from '../logic/stats'
import { whatsappCount } from '../logic/acta'
import { Avatar } from '../components/Avatar'
import { CopyButton, ErrorMsg, Section, WhatsAppButton } from '../components/ui'
import { TrainingItem } from '../components/TrainingItem'
import { compressImage } from '../logic/image'

export default function Trainings() {
  const { db, me } = useStore()
  const { run, busy, err } = useAction()
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [flash, setFlash] = useState('')
  const year = new Date().getFullYear()
  const [scope, setScope] = useState<'year' | string>('year')
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null)
  const [shareable, setShareable] = useState<{ file: File; text: string } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const pickPhoto = async (f: File) => {
    const blob = await compressImage(f)
    if (photo) URL.revokeObjectURL(photo.url)
    setPhoto({ blob, url: URL.createObjectURL(blob) })
  }

  const add = async (kind: TrainingKind) => {
    if (!me) return
    const ok = await run(() => api.addTraining({ member_id: me.id, date, kind, count: 1, note: note.trim() || null }, photo?.blob))
    if (ok) {
      const t = yearTotals(db, me.id, year)
      t[kind] += 1
      const text = `${kind === 'gym' ? '💪' : '🏃'} ${displayName(me)} +1 ${kind === 'gym' ? 'gym' : 'fora'}${note.trim() ? ` (${note.trim()})` : ''} · porta ${fmtTotals(t)}`
      setShareable(photo ? { file: new File([photo.blob], 'entreno.jpg', { type: 'image/jpeg' }), text } : null)
      if (photo) URL.revokeObjectURL(photo.url)
      setPhoto(null)
      setNote('')
      setFlash(kind === 'gym' ? '💪 +1 al gym!' : '🏃 +1 fora del gym!')
      setTimeout(() => setFlash(''), 1800)
    }
  }
  const canShareFiles = (f: File) => typeof navigator.canShare === 'function' && navigator.canShare({ files: [f] })

  const totals = (id: string) => (scope === 'year' ? yearTotals(db, id, year) : monthTotals(db, id, scope))
  const rows = db.members
    .filter((m) => m.active)
    .map((m) => ({ m, t: totals(m.id) }))
    .sort((a, b) => b.t.gym - a.t.gym || b.t.fora - a.t.fora)
  const max = Math.max(1, ...rows.map((r) => r.t.gym + r.t.fora))
  const mine = me ? db.trainings.filter((t) => t.member_id === me.id && !t.baseline).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8) : []
  const months = [0, -1, -2, -3, -4, -5].map((d) => shiftMonth(currentMonthKey(), d))
  const countText = whatsappCount(db, year, (id) => yearTotals(db, id, year))
  const [feedLimit, setFeedLimit] = useState(20)
  const feed = db.trainings
    .filter((t) => !t.baseline && monthKey(t.date) >= shiftMonth(currentMonthKey(), -1))
    .sort((a, b) => b.date.localeCompare(a.date) || (b.created_at ?? '').localeCompare(a.created_at ?? ''))

  return (
    <div className="stack">
      <Section title="🏋️ Apuntar entreno">
        {me ? (
          <div className="form">
            <div className="row">
              <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
              <input placeholder="Nota (opcional): pit, pàdel…" value={note} onChange={(e) => setNote(e.target.value)} maxLength={60} />
            </div>
            <div className="proof-pick">
              {photo ? (
                <>
                  <img src={photo.url} alt="Prova" />
                  <div className="stack-sm">
                    <span className="small ok">✓ Foto de prova afegida</span>
                    <div className="row">
                      <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
                        Canviar
                      </button>
                      <button type="button" className="btn danger" onClick={() => setPhoto(null)}>
                        🗑
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <button type="button" className="btn grow" onClick={() => fileInput.current?.click()}>
                  📷 Afegir foto de prova
                </button>
              )}
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) pickPhoto(f)
                  e.target.value = ''
                }}
              />
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
            {shareable && (
              <div className="row wrap center">
                {canShareFiles(shareable.file) ? (
                  <button
                    type="button"
                    className="btn btn-wa"
                    onClick={() => navigator.share({ files: [shareable.file], text: shareable.text }).catch(() => {})}
                  >
                    📲 Compartir la foto al grup
                  </button>
                ) : (
                  <WhatsAppButton text={shareable.text}>Avisar al grup</WhatsAppButton>
                )}
                <button type="button" className="link muted" onClick={() => setShareable(null)}>
                  ara no
                </button>
              </div>
            )}
            <ErrorMsg err={err} />
            {mine.length > 0 && (
              <div className="mine">
                <div className="muted small">Els teus últims:</div>
                {mine.map((t) => (
                  <div key={t.id} className="row small">
                    <span>{t.kind === 'gym' ? '💪' : '🏃'}</span>
                    {t.photo_url && <span title="Amb foto">📷</span>}
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

      <Section title="📸 Últims entrenos del grup">
        <p className="muted small">Valida els entrenos dels altres: ✅ vàlid o 🧢 dubtós. Amb 3 🧢 (i més 🧢 que ✅), queda marcat com a dubtós perquè l'admin hi faci una ullada.</p>
        <div className="stack-sm">
          {feed.slice(0, feedLimit).map((t) => (
            <TrainingItem key={t.id} t={t} />
          ))}
          {feed.length === 0 && <p className="muted">Encara no hi ha entrenos registrats.</p>}
          {feed.length > feedLimit && (
            <button className="btn" onClick={() => setFeedLimit(feedLimit + 20)}>
              Veure'n més
            </button>
          )}
        </div>
      </Section>
    </div>
  )
}
