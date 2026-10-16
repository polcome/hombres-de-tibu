import { Link } from 'react-router-dom'
import { useStore } from '../store'
import { closedMonths, monthLabel } from '../logic/months'
import { awardNames, displayName, palmares, winnersOf } from '../logic/stats'
import { Avatar } from '../components/Avatar'
import { Section } from '../components/ui'

export default function Palmares() {
  const { db } = useStore()
  const rows = palmares(db)
  const months = closedMonths(db).reverse()

  return (
    <div className="stack">
      <Section title="🏆 Palmarès">
        <table className="table">
          <thead>
            <tr>
              <th></th>
              <th>Jugador</th>
              <th title="MVPs">🏆</th>
              <th title="Antis">🤡</th>
              <th title="Balanç">±</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.member.id}>
                <td className="muted">{i + 1}</td>
                <td>
                  <Link to={`/jugador/${r.member.slug}`} className="row">
                    <Avatar member={r.member} size={26} /> {displayName(r.member)}
                  </Link>
                </td>
                <td>
                  <b>{r.mvp}</b>
                </td>
                <td>{r.anti}</td>
                <td className={r.balance > 0 ? 'ok' : r.balance < 0 ? 'danger' : 'muted'}>
                  {r.balance > 0 ? '+' : ''}
                  {r.balance}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="📅 Historial">
        {months.length === 0 && <p className="muted">Encara no s'ha tancat cap mes.</p>}
        <div className="stack-sm">
          {months.map((m) => {
            const w = winnersOf(db, m.id)
            return (
              <Link key={m.id} to={`/mes/${m.id}`} className="history-row">
                <b>{monthLabel(m.id)}</b>
                <span>🏆 {awardNames(db, w.mvp) || '—'}</span>
                <span>🤡 {awardNames(db, w.anti) || '—'}</span>
              </Link>
            )
          })}
        </div>
      </Section>
    </div>
  )
}
