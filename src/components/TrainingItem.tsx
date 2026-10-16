import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAction, useStore } from '../store'
import type { DB, Training } from '../types'
import { displayName, memberById } from '../logic/stats'
import { Avatar } from './Avatar'

/** Un entreno és "dubtós" si té 3+ vots de fake i més fakes que oks */
export function trainingStatus(db: DB, t: Training) {
  const votes = db.trainingVotes.filter((v) => v.training_id === t.id)
  const ok = votes.filter((v) => v.vote === 'ok').length
  const fake = votes.length - ok
  return { ok, fake, dubious: fake >= 3 && fake > ok }
}

export function TrainingItem({ t }: { t: Training }) {
  const { db, me } = useStore()
  const { run, busy } = useAction()
  const [zoom, setZoom] = useState(false)
  const m = memberById(db, t.member_id)
  const { ok, fake, dubious } = trainingStatus(db, t)
  const mine = db.trainingVotes.find((v) => v.training_id === t.id && v.member_id === me?.id)?.vote
  const canVote = me && me.id !== t.member_id
  const vote = (v: 'ok' | 'fake') => run(() => api.voteTraining(t.id, mine === v ? null : v))

  return (
    <article className={`training ${dubious ? 'training-dubious' : ''}`}>
      <div className="row">
        <Avatar member={m} size={30} />
        <div className="grow">
          <div>
            {m ? <Link to={`/jugador/${m.slug}`}><b>{displayName(m)}</b></Link> : <b>¿?</b>} {t.kind === 'gym' ? '💪 gym' : '🏃 fora'}
            {dubious && <span className="badge badge-red"> 🧢 dubtós</span>}
          </div>
          <div className="muted small">
            {new Date(t.date).toLocaleDateString('ca-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
            {t.note && ` · ${t.note}`}
            {!t.photo_url && ' · sense foto'}
          </div>
        </div>
        {me?.is_admin && (
          <button className="link danger" onClick={() => confirm('Esborrar aquest entreno?') && run(() => api.deleteTraining(t.id))}>
            🗑
          </button>
        )}
      </div>

      {t.photo_url && (
        <button type="button" className="proof-thumb" onClick={() => setZoom(true)}>
          <img src={t.photo_url} alt="Prova de l'entreno" loading="lazy" />
        </button>
      )}

      <div className="reactions">
        <button disabled={!canVote || busy} className={mine === 'ok' ? 'on' : ''} onClick={() => vote('ok')} title="Vàlid">
          ✅ {ok || ''}
        </button>
        <button disabled={!canVote || busy} className={mine === 'fake' ? 'on' : ''} onClick={() => vote('fake')} title="Dubtós">
          🧢 {fake || ''}
        </button>
      </div>

      {zoom &&
        t.photo_url &&
        createPortal(
          <div className="modal card-modal" onClick={() => setZoom(false)}>
            <button type="button" className="card-modal-close" aria-label="Tancar">
              ✕
            </button>
            <img className="proof-full" src={t.photo_url} alt="Prova de l'entreno" />
          </div>,
          document.body,
        )}
    </article>
  )
}
