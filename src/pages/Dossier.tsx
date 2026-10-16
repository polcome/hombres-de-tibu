import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAction, useStore } from '../store'
import { EMOJIS, type Expedient } from '../types'
import { currentMonthKey, monthLabel, timeAgo } from '../logic/months'
import { displayName, memberById } from '../logic/stats'
import { Avatar } from '../components/Avatar'
import { ErrorMsg, MemberSelect, Section } from '../components/ui'

export function ExpedientItem({ e, compact }: { e: Expedient; compact?: boolean }) {
  const { db, me } = useStore()
  const { run, busy } = useAction()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [author, setAuthor] = useState('')
  const target = memberById(db, e.target_id)
  const comments = db.comments.filter((c) => c.expedient_id === e.id)

  return (
    <article className={`exp exp-${e.kind}`}>
      <div className="exp-head">
        <Avatar member={target} size={32} />
        <div>
          <div>
            <span className={`tag tag-${e.kind}`}>{e.kind === 'merit' ? '🟢 MÈRIT' : '🔴 FALTA'}</span>{' '}
            {target ? <Link to={`/jugador/${target.slug}`}><b>{displayName(target)}</b></Link> : <b>¿?</b>}
          </div>
          <div className="muted small">
            {e.author ? `per ${e.author}` : '🕵️ xivato anònim'} · {timeAgo(e.created_at)}
          </div>
        </div>
        {me?.is_admin && !compact && (
          <button className="link ml-auto danger" onClick={() => confirm('Esborrar expedient?') && run(() => api.deleteExpedient(e.id))}>
            🗑
          </button>
        )}
      </div>
      <p className="exp-text">{e.text}</p>
      {!compact && (
        <>
          <div className="reactions">
            {EMOJIS.map((em) => (
              <button key={em} disabled={busy} onClick={() => run(() => api.react(e.id, em))}>
                {em} {e.reactions[em] ? <b>{e.reactions[em]}</b> : null}
              </button>
            ))}
            <button className="ml-auto" onClick={() => setOpen(!open)}>
              💬 {comments.length || ''}
            </button>
          </div>
          {open && (
            <div className="comments">
              {comments.map((c) => (
                <div key={c.id} className="comment">
                  <b>{c.author || 'Anònim'}</b> {c.text} <span className="muted small">· {timeAgo(c.created_at)}</span>
                  {me?.is_admin && (
                    <button className="link danger" onClick={() => run(() => api.deleteComment(c.id))}>
                      🗑
                    </button>
                  )}
                </div>
              ))}
              <form
                className="comment-form"
                onSubmit={async (ev) => {
                  ev.preventDefault()
                  if (!text.trim()) return
                  if (await run(() => api.addComment({ expedient_id: e.id, author: author.trim() || null, text: text.trim() }))) setText('')
                }}
              >
                <input placeholder="Nom (opcional)" value={author} onChange={(x) => setAuthor(x.target.value)} maxLength={40} style={{ maxWidth: 120 }} />
                <input placeholder="Comenta…" value={text} onChange={(x) => setText(x.target.value)} maxLength={500} />
                <button className="btn btn-primary" disabled={busy}>
                  ➤
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </article>
  )
}

export default function Dossier() {
  const { db, me } = useStore()
  const { run, busy, err } = useAction()
  const [target, setTarget] = useState('')
  const [kind, setKind] = useState<'merit' | 'falta'>('falta')
  const [text, setText] = useState('')
  const [author, setAuthor] = useState('')
  const [done, setDone] = useState(false)
  const months = [...new Set([currentMonthKey(), ...db.expedients.map((e) => e.month_id)])].sort().reverse()
  const [month, setMonth] = useState(months[0])
  const [who, setWho] = useState('')

  const list = db.expedients.filter((e) => e.month_id === month && (!who || e.target_id === who))

  return (
    <div className="stack">
      <Section title="📁 Obrir expedient">
        <p className="muted small">
          Ha passat alguna cosa? Apunta-ho ara i no a final de mes. No cal entrar a l'app: pots signar-ho o fer de xivato anònim.
        </p>
        <form
          className="form"
          onSubmit={async (ev) => {
            ev.preventDefault()
            const ok = await run(() =>
              api.addExpedient({ month_id: currentMonthKey(), target_id: target, kind, text: text.trim(), author: author.trim() || null }),
            )
            if (ok) {
              setText('')
              setTarget('')
              setDone(true)
              setMonth(currentMonthKey())
              setTimeout(() => setDone(false), 2500)
            }
          }}
        >
          <div className="toggle">
            <button type="button" className={kind === 'merit' ? 'on-green' : ''} onClick={() => setKind('merit')}>
              🟢 Mèrit
            </button>
            <button type="button" className={kind === 'falta' ? 'on-red' : ''} onClick={() => setKind('falta')}>
              🔴 Falta
            </button>
          </div>
          <MemberSelect members={db.members} value={target} onChange={setTarget} placeholder="Qui és l'acusat/a?" />
          <textarea
            placeholder={kind === 'merit' ? 'Què ha fet de bo? Ex: ha portat esmorzar per a tothom' : "Què ha fet? Ex: ha dit que venia i ens ha deixat tirats"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            rows={3}
          />
          <div className="row">
            <input placeholder="Signat per… (buit = anònim)" value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={40} />
            {me && !author && (
              <button type="button" className="btn" onClick={() => setAuthor(displayName(me))}>
                Signar
              </button>
            )}
          </div>
          <ErrorMsg err={err} />
          <button className="btn btn-primary" disabled={busy || !target || text.trim().length < 3}>
            {done ? '✅ Expedient obert!' : author.trim() ? `Publicar com a ${author.trim()}` : 'Publicar anònimament 🕵️'}
          </button>
        </form>
      </Section>

      <Section
        title="Dossier"
        right={
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="select-sm">
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        }
      >
        <MemberSelect members={db.members} value={who} onChange={setWho} placeholder="Tothom" />
        <div className="stack-sm mt">
          {list.length === 0 && <p className="muted">Cap expedient. De moment.</p>}
          {list.map((e) => (
            <ExpedientItem key={e.id} e={e} />
          ))}
        </div>
      </Section>
    </div>
  )
}
