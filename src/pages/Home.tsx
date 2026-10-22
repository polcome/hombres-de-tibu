import { Link } from 'react-router-dom'
import { useStore } from '../store'
import { activeMonth, closedMonths, currentMonthKey, formatDeadline, monthLabel } from '../logic/months'
import { displayName, fmtTotals, memberById, monthTotals, photoFor, rating, unlockedCards, winnersOf } from '../logic/stats'
import { Avatar } from '../components/Avatar'
import { FifaCard } from '../components/FifaCard'
import { CardZoom, unlockProps } from '../components/CardZoom'
import { Section, WhatsAppButton } from '../components/ui'
import { ExpedientItem } from './Dossier'

export const appUrl = () => `${location.origin}${location.pathname}`

function Countdown({ deadline }: { deadline: string }) {
  const ms = new Date(deadline).getTime() - Date.now()
  if (ms <= 0) return <span className="badge badge-red">Termini acabat</span>
  const d = Math.floor(ms / 86400000)
  const h = Math.floor((ms % 86400000) / 3600000)
  return <span className="badge badge-gold">⏰ {d > 0 ? `${d}d ${h}h` : `${h}h`} per tancar</span>
}

export default function Home() {
  const { db, me } = useStore()
  const month = activeMonth(db)
  const last = closedMonths(db).at(-1)
  const active = db.members.filter((m) => m.active)
  const unlocks = unlockedCards(db)

  const voterIds = new Set(db.voters.filter((v) => v.month_id === month?.id).map((v) => v.member_id))
  const pending = active.filter((m) => !voterIds.has(m.id))
  const iVoted = me ? voterIds.has(me.id) : false

  const curKey = currentMonthKey()
  const ranking = active
    .map((m) => ({ m, t: monthTotals(db, m.id, curKey) }))
    .sort((a, b) => b.t.gym + b.t.fora - (a.t.gym + a.t.fora))
  const exps = db.expedients.filter((e) => e.month_id === curKey)

  const nag = month
    ? `🚨 *VOTACIÓ MVP/ANTI ${monthLabel(month.id).toUpperCase()}* 🚨\n\nPorteu ${voterIds.size}/${active.length} vots.\nFalten: ${pending.map(displayName).join(', ')} 👀\n${month.deadline ? `⏰ Tanca: ${formatDeadline(month.deadline)}\n` : ''}\nQui no voti es converteix en candidat a anti 🤡\n👉 ${appUrl()}#/votar`
    : ''

  return (
    <div className="stack">
      {month && (
        <section className={`hero ${month.status === 'voting' ? 'hero-voting' : ''}`}>
          <div className="hero-kicker">{month.status === 'voting' ? '🗳️ VOTACIÓ OBERTA' : '📅 MES EN JOC'}</div>
          <h1>{monthLabel(month.id)}</h1>
          {month.status === 'voting' ? (
            <>
              <div className="row wrap">
                {month.deadline && <Countdown deadline={month.deadline} />}
                <span className="badge">
                  {voterIds.size}/{active.length} han votat
                </span>
              </div>
              <div className="progress">
                <div style={{ width: `${(voterIds.size / Math.max(1, active.length)) * 100}%` }} />
              </div>
              {pending.length > 0 && (
                <div className="morosos">
                  <div className="muted small">Morosos 🐌</div>
                  <div className="avatars">
                    {pending.map((m) => (
                      <span key={m.id} title={displayName(m)}>
                        <Avatar member={m} size={30} />
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="row wrap">
                {me && !iVoted ? (
                  <Link to="/votar" className="btn btn-primary btn-big">
                    Votar ara
                  </Link>
                ) : iVoted ? (
                  <span className="badge badge-green">✅ Ja has votat</span>
                ) : (
                  <Link to="/login" className="btn btn-primary">
                    Entra per votar
                  </Link>
                )}
                {pending.length > 0 && <WhatsAppButton text={nag}>Avisar morosos</WhatsAppButton>}
              </div>
            </>
          ) : (
            <>
              <p className="muted">
                La votació s'obre a final de mes. Mentrestant, aneu omplint el dossier: cada mèrit i cada falta comptarà.
              </p>
              <div className="row wrap">
                <span className="badge badge-green">🟢 {exps.filter((e) => e.kind === 'merit').length} mèrits</span>
                <span className="badge badge-red">🔴 {exps.filter((e) => e.kind === 'falta').length} faltes</span>
                <Link to="/dossier" className="btn btn-primary">
                  + Obrir expedient
                </Link>
              </div>
            </>
          )}
        </section>
      )}

      {last && (
        <Section title={`Guanyadors ${monthLabel(last.id)}`} right={<Link to={`/mes/${last.id}`}>Veure acta →</Link>}>
          <div className="cards-row">
            {(['mvp', 'anti'] as const).flatMap((type) =>
              winnersOf(db, last.id)[type].map((a) => {
                const m = memberById(db, a.member_id)!
                const u = unlocks.find((x) => x.memberId === a.member_id && x.sortKey === last.id && x.def.id === (type === 'mvp' ? 'totm' : 'antim'))
                if (u)
                  return (
                    <CardZoom key={a.id} card={unlockProps(db, u)} def={u.def}>
                      <FifaCard {...unlockProps(db, u)} />
                    </CardZoom>
                  )
                return (
                  <Link key={a.id} to={`/jugador/${m.slug}`}>
                    <FifaCard
                      member={m}
                      rating={rating(db, m.id, last.id)}
                      variant={type === 'mvp' ? 'totm' : 'anti'}
                      boost={0}
                      label={monthLabel(last.id)}
                      title={type === 'mvp' ? 'Tibu of the Month' : 'Anti-MVP del mes'}
                      emoji={type === 'mvp' ? '🏆' : '🤡'}
                      photo={photoFor(db, m, `${type === 'mvp' ? 'totm' : 'antim'}:${last.id}`)}
                    />
                  </Link>
                )
              }),
            )}
          </div>
        </Section>
      )}

      <Section title={`Entrenos ${monthLabel(curKey)}`} right={<Link to="/entrenos">Tots →</Link>}>
        {ranking.every((r) => r.t.gym + r.t.fora === 0) ? (
          <p className="muted">Encara ningú s'ha apuntat cap entreno aquest mes. Qui serà el primer?</p>
        ) : (
          <ol className="rank">
            {ranking.slice(0, 5).map(({ m, t }, i) => (
              <li key={m.id}>
                <span className="rank-pos">{['🥇', '🥈', '🥉'][i] ?? i + 1}</span>
                <Avatar member={m} size={28} />
                <Link to={`/jugador/${m.slug}`}>{displayName(m)}</Link>
                <b className="ml-auto">{fmtTotals(t)}</b>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title="Últims expedients" right={<Link to="/dossier">Dossier →</Link>}>
        {db.expedients.length === 0 ? (
          <p className="muted">Res de res. Massa bon comportament, sospitós.</p>
        ) : (
          <div className="stack-sm">
            {db.expedients.slice(0, 3).map((e) => (
              <ExpedientItem key={e.id} e={e} compact />
            ))}
          </div>
        )}
      </Section>

      <div className="row wrap center">
        <Link to="/palmares" className="btn">
          🏆 Palmarès
        </Link>
        <Link to="/cartes" className="btn">
          🃏 Col·lecció de cartes
        </Link>
      </div>
    </div>
  )
}
