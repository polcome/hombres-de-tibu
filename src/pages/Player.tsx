import { useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toPng } from 'html-to-image'
import { api } from '../api'
import { useStore } from '../store'
import { closedMonths, currentMonthKey, monthLabel, shiftMonth } from '../logic/months'
import { STAT_LABELS, awardsOf, cardKey, displayName, featuredCard, fmtTotals, monthTotals, photoFor, rating, unlockedCards, yearTotals } from '../logic/stats'
import { PhotoControls } from '../components/PhotoControls'
import { FifaCard } from '../components/FifaCard'
import { CardZoom, unlockProps } from '../components/CardZoom'
import { Section } from '../components/ui'
import { ExpedientItem } from './Dossier'

export default function Player() {
  const { slug } = useParams()
  const { db, me, reload } = useStore()
  const nav = useNavigate()
  const cardRef = useRef<HTMLDivElement>(null)
  const m = db.members.find((x) => x.slug === slug)
  if (!m) return <p>Jugador no trobat.</p>

  const unlocks = unlockedCards(db)
  const f = featuredCard(db, m, unlocks)
  const r = rating(db, m.id)
  const year = new Date().getFullYear()
  const yt = yearTotals(db, m.id, year)
  const { mvp, anti } = awardsOf(db, m.id)
  const mine = unlocks.filter((u) => u.memberId === m.id)
  const history = closedMonths(db)
    .slice(-6)
    .map((mo) => ({ id: mo.id, ovr: rating(db, m.id, mo.id).overall }))
  const months = [-5, -4, -3, -2, -1, 0].map((d) => shiftMonth(currentMonthKey(), d))
  const mt = months.map((k) => ({ k, t: monthTotals(db, m.id, k) }))
  const maxM = Math.max(1, ...mt.map((x) => x.t.gym + x.t.fora))
  const exps = db.expedients.filter((e) => e.target_id === m.id).slice(0, 5)

  const download = async () => {
    if (!cardRef.current) return
    const url = await toPng(cardRef.current, {
      pixelRatio: 3,
      cacheBust: true,
    })
    const a = document.createElement('a')
    a.href = url
    a.download = `carta-${m.slug}.png`
    a.click()
  }

  return (
    <div className="stack">
      <div className="player-hero">
        <FifaCard
          ref={cardRef}
          member={m}
          rating={r}
          variant={f.variant}
          boost={f.boost}
          label={f.label}
          title={f.title}
          size="lg"
          photo={photoFor(db, m, f.key)}
        />
        <div className="row wrap center">
          <button className="btn" onClick={download}>
            📥 Descarregar carta
          </button>
          {me?.id === m.id && (
            <button
              className="btn"
              onClick={async () => {
                await api.logout()
                await reload()
                nav('/')
              }}
            >
              Sortir
            </button>
          )}
        </div>
      </div>

      {me?.is_admin && (
        <Section title="📷 Foto base">
          <p className="muted small">Surt a la carta normal, a l'avatar i a les cartes especials que no tinguin foto pròpia.</p>
          <PhotoControls url={m.photo_url} onChange={(img) => api.setPhoto(m.id, img)} />
        </Section>
      )}

      <div className="kpis">
        <div>
          <b>{fmtTotals(yt)}</b>
          <small>Entrenos {year}</small>
        </div>
        <div>
          <b>{mvp.length}</b>
          <small>🏆 MVPs</small>
        </div>
        <div>
          <b>{anti.length}</b>
          <small>🤡 Antis</small>
        </div>
        <div>
          <b>{mine.length}</b>
          <small>🃏 Cartes</small>
        </div>
      </div>

      <Section title="Estadístiques">
        <div className="statbars">
          {STAT_LABELS.map(([k, l, d]) => (
            <div key={k} title={d}>
              <span>{l}</span>
              <span className="bar">
                <span className={`bar-stat ${(r[k] as number) >= 75 ? 'hi' : (r[k] as number) < 50 ? 'lo' : ''}`} style={{ width: `${r[k]}%` }} />
              </span>
              <b>{r[k] as number}</b>
            </div>
          ))}
        </div>
        {history.length > 1 && (
          <div className="evo">
            <div className="muted small">Evolució de la mitjana</div>
            <div className="row wrap">
              {history.map((h, i) => {
                const diff = i ? h.ovr - history[i - 1].ovr : 0
                return (
                  <span key={h.id} className="evo-item">
                    <small>{monthLabel(h.id, true)}</small>
                    <b>{h.ovr}</b>
                    {diff !== 0 && <small className={diff > 0 ? 'ok' : 'danger'}>{diff > 0 ? `▲${diff}` : `▼${-diff}`}</small>}
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </Section>

      <Section title="Entrenos per mes">
        <div className="vbars">
          {mt.map(({ k, t }) => (
            <div key={k}>
              <b className="small">{t.gym + t.fora || ''}</b>
              <span className="vbar">
                <span className="bar-fora" style={{ height: `${(t.fora / maxM) * 100}%` }} />
                <span className="bar-gym" style={{ height: `${(t.gym / maxM) * 100}%` }} />
              </span>
              <small>{monthLabel(k, true)}</small>
            </div>
          ))}
        </div>
        <p className="muted small">Lila = gym · Verd = fora. Només compta el que s'apunta a l'app.</p>
      </Section>

      <Section title={`🃏 Cartes especials (${mine.length})`}>
        {mine.length === 0 ? (
          <p className="muted">
            Cap carta especial encara. <Link to="/cartes">Mira com aconseguir-ne</Link>.
          </p>
        ) : (
          <div className="cards-row scroll">
            {mine.map((u) => (
              <div key={u.def.id + u.sortKey} className="card-with-ctl">
                <CardZoom card={unlockProps(db, u)} def={u.def}>
                  <FifaCard {...unlockProps(db, u)} size="sm" />
                </CardZoom>
                {me?.is_admin && (
                  <PhotoControls
                    compact
                    removeLabel="Tornar a la foto base"
                    url={db.cardPhotos.find((p) => p.member_id === m.id && p.card_key === cardKey(u))?.url}
                    onChange={(img) => api.setCardPhoto(m.id, cardKey(u), img)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {(mvp.length > 0 || anti.length > 0) && (
        <Section title="Palmarès">
          <div className="stack-sm">
            {[...mvp, ...anti]
              .sort((a, b) => b.month_id.localeCompare(a.month_id))
              .map((a) => (
                <Link key={a.id} to={`/mes/${a.month_id}`} className="row">
                  {a.type === 'mvp' ? '🏆 MVP' : '🤡 Anti'} · {monthLabel(a.month_id)}{' '}
                  {a.votes != null && (
                    <span className="muted">
                      ({a.votes} vot{a.votes === 1 ? '' : 's'})
                    </span>
                  )}
                </Link>
              ))}
          </div>
        </Section>
      )}

      {exps.length > 0 && (
        <Section title={`Expedients de ${displayName(m)}`}>
          <div className="stack-sm">
            {exps.map((e) => (
              <ExpedientItem key={e.id} e={e} compact />
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
