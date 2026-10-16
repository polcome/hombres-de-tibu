import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAction, useStore } from '../store'
import { activeMonth, formatDeadline, monthLabel } from '../logic/months'
import { displayName, memberById } from '../logic/stats'
import { ErrorMsg, MemberSelect, Section } from '../components/ui'
import { ExpedientItem } from './Dossier'

const MIN = 15

export default function Vote() {
  const { db, me } = useStore()
  const { run, busy, err } = useAction()
  const month = activeMonth(db)
  const [mvp, setMvp] = useState('')
  const [mvpReason, setMvpReason] = useState('')
  const [anti, setAnti] = useState('')
  const [antiReason, setAntiReason] = useState('')

  if (!month || month.status !== 'voting')
    return (
      <Section title="🗳️ Votació">
        <p>La votació no està oberta ara mateix.</p>
        <p className="muted">S'obre a final de cada mes. Mentrestant, ves omplint el dossier perquè després tinguis motius.</p>
        <Link to="/dossier" className="btn btn-primary">
          Anar al dossier
        </Link>
      </Section>
    )

  if (!me)
    return (
      <Section title={`🗳️ Votació ${monthLabel(month.id)}`}>
        <p>Per votar has d'entrar amb el teu usuari. El vot és 100% secret: ningú (ni l'admin) pot saber què has votat.</p>
        <Link to="/login" className="btn btn-primary">
          Entrar
        </Link>
      </Section>
    )

  const voted = db.voters.some((v) => v.month_id === month.id && v.member_id === me.id)
  if (voted)
    return (
      <Section title={`🗳️ Votació ${monthLabel(month.id)}`}>
        <div className="big-emoji">✅</div>
        <p className="center">Vot registrat. Ara toca esperar el veredicte.</p>
        <p className="muted center small">El teu vot està guardat sense el teu nom ni l'hora: no es pot relacionar amb tu.</p>
      </Section>
    )

  const exps = db.expedients.filter((e) => e.month_id === month.id)
  const forMember = (id: string) => exps.filter((e) => e.target_id === id)

  return (
    <div className="stack">
      <Section title={`🗳️ Votació ${monthLabel(month.id)}`}>
        {month.deadline && <p className="muted small">⏰ Tanca {formatDeadline(month.deadline)}</p>}
        <p className="muted small">🔒 Vot secret. Els motius es publicaran a l'acta de forma anònima.</p>
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault()
            if (confirm(`Confirmes?\n\n🏆 MVP: ${displayName(memberById(db, mvp))}\n🤡 Anti: ${displayName(memberById(db, anti))}\n\nNo es pot canviar.`))
              run(() => api.castVote(month.id, mvp, mvpReason, anti, antiReason))
          }}
        >
          <div className="vote-box vote-mvp">
            <h3>🏆 MVP del mes</h3>
            <MemberSelect members={db.members} value={mvp} onChange={setMvp} exclude={[me.id, anti]} />
            <textarea
              rows={3}
              placeholder="Per què? Sigues específic, que sortirà a l'acta."
              value={mvpReason}
              onChange={(e) => setMvpReason(e.target.value)}
            />
            <Counter n={mvpReason.trim().length} />
            {mvp && forMember(mvp).length > 0 && <Hints list={forMember(mvp)} />}
          </div>

          <div className="vote-box vote-anti">
            <h3>🤡 Anti-MVP del mes</h3>
            <MemberSelect members={db.members} value={anti} onChange={setAnti} exclude={[me.id, mvp]} />
            <textarea rows={3} placeholder="Què ha fet? Sense pietat." value={antiReason} onChange={(e) => setAntiReason(e.target.value)} />
            <Counter n={antiReason.trim().length} />
            {anti && forMember(anti).length > 0 && <Hints list={forMember(anti)} />}
          </div>

          <ErrorMsg err={err} />
          <button
            className="btn btn-primary btn-big"
            disabled={busy || !mvp || !anti || mvpReason.trim().length < MIN || antiReason.trim().length < MIN}
          >
            Enviar vot secret 🔒
          </button>
        </form>
      </Section>

      {exps.length > 0 && (
        <Section title={`📁 Dossier del mes (${exps.length})`}>
          <p className="muted small">Per si no te'n recordes de tot el que ha passat…</p>
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

const Counter = ({ n }: { n: number }) => (
  <div className={`small ${n < MIN ? 'muted' : 'ok'}`}>{n < MIN ? `Mínim ${MIN} caràcters (${n}/${MIN})` : '✓ Motiu vàlid'}</div>
)

function Hints({ list }: { list: { id: string; kind: string; text: string }[] }) {
  return (
    <div className="hints">
      <div className="small muted">Expedients d'aquest mes:</div>
      {list.map((e) => (
        <div key={e.id} className="small">
          {e.kind === 'merit' ? '🟢' : '🔴'} {e.text}
        </div>
      ))}
    </div>
  )
}
