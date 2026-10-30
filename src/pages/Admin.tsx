import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAction, useStore } from '../store'
import type { AchievementKind, AwardType, Member, Month, TrainingKind } from '../types'
import { activeMonth, closedMonths, currentMonthKey, monthLabel, shiftMonth, todayISO } from '../logic/months'
import { ACHIEVEMENT_FOR_BONUS, CARD_DEFS, displayName, memberById } from '../logic/stats'
import { aiPrompt, generateActa } from '../logic/acta'
import { Avatar } from '../components/Avatar'
import { CopyButton, ErrorMsg, MemberSelect, Section } from '../components/ui'
import { PhotoControls } from '../components/PhotoControls'
import { Link } from 'react-router-dom'
import { appUrl } from './Home'

const toLocalInput = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export default function Admin() {
  const { me } = useStore()
  if (!me?.is_admin) return <p>Només per a admins.</p>
  return (
    <div className="stack">
      <MonthAdmin />
      <ActaAdmin />
      <MembersAdmin />
      <TrainingAdmin />
      <AchievementsAdmin />
      <HistoryAdmin />
    </div>
  )
}

/** Genera l'acta amb IA i la desa (amb les dades acabades de carregar, que inclouen les paperetes del mes tancat) */
async function saveAiActa(monthId: string) {
  const fresh = await api.loadAll()
  const text = await api.aiActa(aiPrompt(fresh, monthId))
  await api.upsertMonth({ id: monthId, acta: text })
}

function MonthAdmin() {
  const { db } = useStore()
  const { run, busy, err } = useAction()
  const month = activeMonth(db)
  const [deadline, setDeadline] = useState(toLocalInput(month?.deadline ?? null))
  useEffect(() => setDeadline(toLocalInput(month?.deadline ?? null)), [month?.deadline])
  // Comprovació que cada votant té la papereta guardada (sense saber quina)
  const [check, setCheck] = useState<Record<string, boolean>>({})
  const voterKey = db.voters
    .filter((v) => v.month_id === month?.id)
    .map((v) => v.member_id)
    .join()
  useEffect(() => {
    if (month?.status === 'voting') api.voteCheck(month.id).then(setCheck, () => setCheck({}))
  }, [month?.id, month?.status, voterKey])

  if (!month) {
    const next = closedMonths(db).length ? shiftMonth(closedMonths(db).at(-1)!.id, 1) : currentMonthKey()
    return (
      <Section title="📅 Mes en joc">
        <p className="muted">No hi ha cap mes obert.</p>
        <button className="btn btn-primary" disabled={busy} onClick={() => run(() => api.upsertMonth({ id: next, status: 'active' }))}>
          Començar {monthLabel(next)}
        </button>
      </Section>
    )
  }

  const voters = db.voters.filter((v) => v.month_id === month.id)
  const save = (patch: Partial<Month>) => run(() => api.upsertMonth({ id: month.id, ...patch }))

  return (
    <Section title={`📅 ${monthLabel(month.id)} · ${month.status === 'voting' ? 'VOTACIÓ OBERTA' : 'en joc'}`}>
      <div className="form">
        <label className="small muted">Data límit de la votació</label>
        <div className="row">
          <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          <button className="btn" disabled={busy} onClick={() => save({ deadline: deadline ? new Date(deadline).toISOString() : null })}>
            Desar
          </button>
        </div>
        {month.status === 'active' && (
          <button className="btn btn-primary btn-big" disabled={busy} onClick={() => confirm('Obrir la votació?') && save({ status: 'voting' })}>
            🗳️ Obrir votació
          </button>
        )}
        {month.status === 'voting' && (
          <>
            <div className="row wrap">
              <button
                className="btn btn-primary btn-big"
                disabled={busy}
                onClick={async () => {
                  if (!confirm(`Tancar la votació amb ${voters.length} vots i publicar resultats?`)) return
                  const ok = await run(() => api.closeMonth(month.id))
                  if (!ok) return
                  await run(() => api.upsertMonth({ id: shiftMonth(month.id, 1), status: 'active' }))
                  // L'acta amb IA: si falla, queda l'automàtica i es pot tornar a provar des d'"Editar acta"
                  await run(() => saveAiActa(month.id))
                }}
              >
                🏁 Tancar i publicar
              </button>
              <button className="btn" disabled={busy} onClick={() => save({ status: 'active' })}>
                Tornar a "en joc"
              </button>
            </div>
            <p className="muted small">En tancar, es calculen els guanyadors, la IA escriu l'acta i s'obre el mes següent. Empat al MVP: guanya qui tingui menys vots d'anti aquell mes. Empat a l'anti: se l'emporta qui tingui menys vots de MVP. Si continuen empatats, guanyen tots.</p>
          </>
        )}
        <ErrorMsg err={err} />
      </div>

      {month.status === 'voting' && (
        <>
          <h3>Han votat ({voters.length})</h3>
          <p className="muted small">
            El vot és secret: ningú, ni l'admin, veu les paperetes fins que es tanca el mes, i a l'app mai surt qui ha votat què. Si algú s'ha
            equivocat, esborra-li el vot (✕): desapareix la seva papereta i pot tornar a votar.
          </p>
          <div className="row wrap">
            {voters.map((v) => (
              <span key={v.member_id} className="chip">
                {check[v.member_id] === true ? '✅' : check[v.member_id] === false ? '⚠️' : ''} {displayName(memberById(db, v.member_id))}
                <button
                  className="link danger"
                  title="Esborrar el vot perquè torni a votar"
                  onClick={() =>
                    confirm(`Esborrar el vot de ${displayName(memberById(db, v.member_id))}? Haurà de tornar a votar.`) &&
                    run(() => api.removeVote(month.id, v.member_id))
                  }
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          {voters.some((v) => check[v.member_id] === false) && (
            <p className="muted small">⚠️ Vot d'abans del vot secret: no es pot saber quina és la seva papereta, així que esborrar-lo no la treu.</p>
          )}
        </>
      )}
    </Section>
  )
}

function ActaAdmin() {
  const { db } = useStore()
  const { run, busy, err } = useAction()
  const months = closedMonths(db).reverse()
  const [id, setId] = useState(months[0]?.id ?? '')
  const month = db.months.find((m) => m.id === id)
  const [text, setText] = useState('')
  useEffect(() => setText(month?.acta || (id ? generateActa(db, id) : '')), [id, month?.acta]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!months.length) return null

  return (
    <Section
      title="📜 Editar acta"
      right={
        <select className="select-sm" value={id} onChange={(e) => setId(e.target.value)}>
          {months.map((m) => (
            <option key={m.id} value={m.id}>
              {monthLabel(m.id)}
            </option>
          ))}
        </select>
      }
    >
      <p className="muted small">
        En tancar el mes, la IA (Gemini) escriu l'acta sola, cada mes amb un estil diferent. Si no et convenç, torna-la a generar, retoca-la o torna a
        l'automàtica (plantilles, sense IA).
      </p>
      <textarea rows={12} value={text} onChange={(e) => setText(e.target.value)} className="mono" />
      <div className="row wrap">
        <button className="btn btn-primary" disabled={busy} onClick={() => run(() => api.upsertMonth({ id, acta: text }))}>
          Desar acta
        </button>
        <button className="btn" disabled={busy} onClick={() => run(() => saveAiActa(id))}>
          {busy ? '✨ Escrivint…' : '✨ Generar amb IA'}
        </button>
        <button className="btn" disabled={busy} onClick={() => run(() => api.upsertMonth({ id, acta: null }))}>
          Tornar a l'automàtica
        </button>
        <button className="btn" disabled={busy} onClick={() => run(() => api.closeMonth(id))}>
          Recalcular guanyadors
        </button>
      </div>
      <ErrorMsg err={err} />
    </Section>
  )
}

function MemberRow({ m, code, onCode }: { m: Member; code?: string; onCode: (c: string) => void }) {
  const { run, busy } = useAction()
  const [name, setName] = useState(m.name)
  const [nick, setNick] = useState(m.nickname ?? '')
  const msg = `🦈 *Hombres de Tibu*\nEntra a ${appUrl()}#/login → "Primer cop"\nUsuari: ${m.name}\nCodi: ${code}\nI tria la teva contrasenya.`

  return (
    <div className="member-row">
      <Link to={`/jugador/${m.slug}`} title="Fitxa i fotos de cartes">
        <Avatar member={m} size={44} />
      </Link>
      <div className="grow stack-sm">
        <PhotoControls compact url={m.photo_url} onChange={(img) => api.setPhoto(m.id, img)} />
        <div className="row">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom" />
          <input value={nick} onChange={(e) => setNick(e.target.value)} placeholder="Sobrenom a la carta" />
          {(name !== m.name || nick !== (m.nickname ?? '')) && (
            <button className="btn btn-primary" disabled={busy} onClick={() => run(() => api.updateMember(m.id, { name, nickname: nick || null }))}>
              Desar
            </button>
          )}
        </div>
        <div className="row wrap small">
          <span className="muted">@{m.slug}</span>
          {m.auth_id === undefined || m.auth_id ? (
            <span className="badge badge-green">compte actiu</span>
          ) : (
            <>
              <span className="badge">codi: {code ?? '…'}</span>
              {code && <CopyButton text={msg} className="link">copiar missatge</CopyButton>}
            </>
          )}
          <label className="row">
            <input type="checkbox" checked={m.is_admin} onChange={(e) => run(() => api.updateMember(m.id, { is_admin: e.target.checked }))} /> admin
          </label>
          <label className="row">
            <input type="checkbox" checked={m.active} onChange={(e) => run(() => api.updateMember(m.id, { active: e.target.checked }))} /> actiu
          </label>
          <button
            className="link danger"
            onClick={async () => {
              if (!confirm(`Resetejar el compte de ${m.name}? Haurà de tornar-lo a activar amb un codi nou.`)) return
              let c = ''
              if (await run(async () => (c = await api.resetMember(m.id)))) onCode(c)
            }}
          >
            resetejar contrasenya
          </button>
        </div>
      </div>
    </div>
  )
}

function MembersAdmin() {
  const { db } = useStore()
  const { run, busy, err } = useAction()
  const [codes, setCodes] = useState<Record<string, string>>({})
  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  useEffect(() => {
    api.inviteCodes().then(setCodes).catch(() => {})
  }, [db.members.length])

  return (
    <Section title={`👥 Membres (${db.members.length})`}>
      <p className="muted small">
        Aquí canvies la foto base (posa-hi els edits de les cares 😂). Les fotos de cada carta especial es posen des de la fitxa del jugador: toca la seva cara. Passa a cadascú el seu codi per activar el compte.
      </p>
      <div className="stack-sm">
        {db.members.map((m) => (
          <MemberRow key={m.id} m={m} code={codes[m.id]} onCode={(c) => setCodes({ ...codes, [m.id]: c })} />
        ))}
      </div>
      <h3>Afegir membre</h3>
      <div className="row">
        <input placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="usuari (minúscules)" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))} />
        <button
          className="btn btn-primary"
          disabled={busy || !name || slug.length < 2}
          onClick={async () => (await run(() => api.addMember({ slug, name }))) && (setSlug(''), setName(''))}
        >
          Afegir
        </button>
      </div>
      <ErrorMsg err={err} />
    </Section>
  )
}

function TrainingAdmin() {
  const { db } = useStore()
  const { run, busy, err } = useAction()
  const [who, setWho] = useState('')
  const [kind, setKind] = useState<TrainingKind>('gym')
  const [count, setCount] = useState(1)
  const [date, setDate] = useState(todayISO())
  const [baseline, setBaseline] = useState(false)
  const [ok, setOk] = useState(false)

  return (
    <Section title="🏋️ Afegir entrenos a qualsevol">
      <p className="muted small">Per corregir recomptes o per a qui no faci servir l'app. Marca "recompte acumulat" si són entrenos antics que no han de comptar en cap mes concret.</p>
      <div className="form">
        <MemberSelect members={db.members} value={who} onChange={setWho} />
        <div className="row">
          <select value={kind} onChange={(e) => setKind(e.target.value as TrainingKind)}>
            <option value="gym">Gym</option>
            <option value="fora">Fora del gym</option>
          </select>
          <input type="number" min={1} value={count} onChange={(e) => setCount(Number(e.target.value))} style={{ maxWidth: 80 }} />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <label className="row small">
          <input type="checkbox" checked={baseline} onChange={(e) => setBaseline(e.target.checked)} /> Recompte acumulat (no compta en cap mes)
        </label>
        <ErrorMsg err={err} />
        <button
          className="btn btn-primary"
          disabled={busy || !who || count < 1}
          onClick={async () => {
            if (await run(() => api.addTraining({ member_id: who, kind, count, date, baseline, note: baseline ? 'Ajust admin' : null }))) {
              setOk(true)
              setTimeout(() => setOk(false), 1500)
            }
          }}
        >
          {ok ? '✅ Afegit' : `Afegir ${count} entreno${count > 1 ? 's' : ''}`}
        </button>
      </div>
    </Section>
  )
}

function HistoryAdmin() {
  const { db } = useStore()
  const { run, busy, err } = useAction()
  const [month, setMonth] = useState('')
  const [type, setType] = useState<AwardType>('mvp')
  const [who, setWho] = useState('')
  const [votes, setVotes] = useState('')
  const awards = [...db.awards].sort((a, b) => b.month_id.localeCompare(a.month_id))

  return (
    <Section title="📚 Palmarès històric">
      <p className="muted small">Afegeix els MVPs i antis dels mesos anteriors a l'app perquè comptin al palmarès i a les cartes.</p>
      <div className="form">
        <div className="row">
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          <select value={type} onChange={(e) => setType(e.target.value as AwardType)}>
            <option value="mvp">🏆 MVP</option>
            <option value="anti">🤡 Anti</option>
          </select>
        </div>
        <div className="row">
          <MemberSelect members={db.members} value={who} onChange={setWho} />
          <input type="number" placeholder="vots" value={votes} onChange={(e) => setVotes(e.target.value)} style={{ maxWidth: 80 }} />
        </div>
        <ErrorMsg err={err} />
        <button
          className="btn btn-primary"
          disabled={busy || !month || !who}
          onClick={() =>
            run(async () => {
              if (!db.months.some((m) => m.id === month)) await api.upsertMonth({ id: month, status: 'closed' })
              await api.addAward({ month_id: month, type, member_id: who, votes: votes ? Number(votes) : null })
              setWho('')
              setVotes('')
            })
          }
        >
          Afegir
        </button>
      </div>
      <div className="stack-sm mt">
        {awards.map((a) => (
          <div key={a.id} className="row small">
            <span>{monthLabel(a.month_id)}</span>
            <span>{a.type === 'mvp' ? '🏆' : '🤡'}</span>
            <b>{displayName(memberById(db, a.member_id))}</b>
            {a.votes != null && <span className="muted">{a.votes} vots</span>}
            <button className="link danger ml-auto" onClick={() => confirm('Esborrar?') && run(() => api.deleteAward(a.id))}>
              🗑
            </button>
          </div>
        ))}
      </div>
    </Section>
  )
}

const KINDS: AchievementKind[] = ['ascens', 'mitja', 'marato', 'hyrox']
const kindDef = (k: AchievementKind) => CARD_DEFS.find((d) => d.id === `exit-${k}`)!

function AchievementsAdmin() {
  const { db } = useStore()
  const { run, busy, err } = useAction()
  const [kind, setKind] = useState<AchievementKind>('mitja')
  const [event, setEvent] = useState('')
  const [date, setDate] = useState(todayISO())
  const [who, setWho] = useState<string[]>([])
  const toggle = (id: string) => setWho(who.includes(id) ? who.filter((x) => x !== id) : [...who, id])

  // Agrupa per esdeveniment: tots els que hi van tenen la mateixa carta
  const groups = new Map<string, typeof db.achievements>()
  for (const a of [...db.achievements].sort((x, y) => y.date.localeCompare(x.date))) {
    const k = `${a.kind}|${a.event}|${a.date}`
    groups.set(k, [...(groups.get(k) ?? []), a])
  }

  return (
    <Section title="🏅 Èxits esportius">
      <p className="muted small">
        Cartes manuals. Tria l'èxit, posa el nom de l'esdeveniment i marca tothom qui l'ha aconseguit: tots tindran la mateixa carta. Pugen FOR durant l'any de l'èxit.
      </p>
      <div className="form">
        <div className="toggle wrap">
          {KINDS.map((k) => (
            <button key={k} type="button" className={kind === k ? 'on-green' : ''} onClick={() => setKind(k)}>
              {kindDef(k).emoji} {kindDef(k).name}
            </button>
          ))}
        </div>
        <p className="muted small">
          {kindDef(kind).how} Suma +{ACHIEVEMENT_FOR_BONUS[kind]} entrenos fora virtuals a FOR.
        </p>
        <input
          placeholder={kind === 'ascens' ? 'Ex: Ascens a Primera Catalana' : kind === 'hyrox' ? 'Ex: Hyrox Barcelona' : 'Ex: Mitja Marató de Barcelona'}
          value={event}
          onChange={(e) => setEvent(e.target.value)}
          maxLength={80}
        />
        <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        <div className="check-grid">
          {db.members
            .filter((m) => m.active)
            .map((m) => (
              <label key={m.id} className={`check-chip ${who.includes(m.id) ? 'on' : ''}`}>
                <input type="checkbox" checked={who.includes(m.id)} onChange={() => toggle(m.id)} />
                <Avatar member={m} size={22} /> {displayName(m)}
              </label>
            ))}
        </div>
        <ErrorMsg err={err} />
        <button
          className="btn btn-primary"
          disabled={busy || who.length === 0 || event.trim().length < 2 || !date}
          onClick={async () => {
            if (await run(() => api.addAchievements(who, { kind, event: event.trim(), date }))) {
              setWho([])
              setEvent('')
            }
          }}
        >
          Donar carta a {who.length || '…'} {who.length === 1 ? 'persona' : 'persones'}
        </button>
      </div>

      <div className="stack-sm mt">
        {[...groups.values()].map((list) => {
          const a = list[0]
          return (
            <div key={a.id} className="ballot">
              <div className="row">
                <b>
                  {kindDef(a.kind).emoji} {a.event}
                </b>
                <span className="muted small ml-auto">{new Date(a.date).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              <div className="row wrap">
                {list.map((x) => (
                  <span key={x.id} className="chip">
                    {displayName(memberById(db, x.member_id))}
                    <button className="link danger" onClick={() => confirm('Treure aquesta carta?') && run(() => api.deleteAchievement(x.id))}>
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </Section>
  )
}
