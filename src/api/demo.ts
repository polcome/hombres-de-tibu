// Mode demo: tot es guarda al navegador (localStorage). Serveix per provar
// l'app sense configurar Supabase. Contrasenya de qualsevol usuari: "tibu".
import type { Api } from './types'
import type { DB, Member } from '../types'

const KEY = 'tibu-demo-db-v1'
const ME = 'tibu-demo-me'
const uid = () => crypto.randomUUID()

const BASE: [string, string, number, number][] = [
  ['josep', 'Josep', 131, 0],
  ['marc', 'Marc', 144, 28],
  ['eduard', 'Eduard', 150, 33],
  ['come', 'Come', 127, 107],
  ['bernat', 'Bernat', 147, 42],
  ['policho', 'Policho', 49, 33],
  ['deig', 'Deig', 93, 136],
  ['jordi', 'Jordi', 65, 12],
  ['polsy', 'Polsy', 86, 67],
  ['pena', 'Peña', 32, 42],
  ['ferran', 'Ferran', 35, 2],
  ['fq', 'FQ', 47, 3],
  ['gerard', 'Gerard', 16, 0],
]

function seed(): DB {
  const members: Member[] = BASE.map(([slug, name]) => ({
    id: uid(),
    slug,
    name,
    nickname: null,
    photo_url: null,
    is_admin: slug === 'come',
    active: true,
  }))
  const by = (s: string) => members.find((m) => m.slug === s)!.id
  const db: DB = { members, months: [], trainings: [], awards: [], expedients: [], comments: [], ballots: [], voters: [], cardPhotos: [] }

  BASE.forEach(([slug, , gym, fora]) => {
    db.trainings.push({ id: uid(), member_id: by(slug), date: '2026-10-16', kind: 'gym', count: gym, baseline: true, note: 'Recompte inicial 2026' })
    if (fora) db.trainings.push({ id: uid(), member_id: by(slug), date: '2026-10-16', kind: 'fora', count: fora, baseline: true, note: 'Recompte inicial 2026' })
  })

  // Mesos d'exemple (inventats!) per veure com queda
  db.months.push(
    { id: '2026-08', status: 'closed', deadline: null, acta: null },
    { id: '2026-09', status: 'closed', deadline: null, acta: null },
    { id: '2026-10', status: 'active', deadline: '2026-11-01T22:00:00+01:00', acta: null },
  )
  db.awards.push(
    { id: uid(), month_id: '2026-08', type: 'mvp', member_id: by('eduard'), votes: 5 },
    { id: uid(), month_id: '2026-08', type: 'anti', member_id: by('gerard'), votes: 6 },
    { id: uid(), month_id: '2026-09', type: 'mvp', member_id: by('deig'), votes: 4 },
    { id: uid(), month_id: '2026-09', type: 'anti', member_id: by('pena'), votes: 5 },
  )
  db.ballots.push(
    { id: uid(), month_id: '2026-09', mvp_id: by('deig'), mvp_reason: 'Ha fet una ruta de 40km amb bici i encara va venir al gym després', anti_id: by('pena'), anti_reason: 'Va dir que venia dimarts, dijous i divendres i no va venir cap dia', annulled: false },
    { id: uid(), month_id: '2026-09', mvp_id: by('deig'), mvp_reason: 'Màquina absoluta, 136 entrenos fora del gym aquest any', anti_id: by('pena'), anti_reason: 'Ens va deixar tirats al sopar de grup per anar amb la xurri', annulled: false },
    { id: uid(), month_id: '2026-09', mvp_id: by('bernat'), mvp_reason: 'Ha organitzat el sopar del grup i ha reservat ell tot', anti_id: by('gerard'), anti_reason: 'Gerard, 16 entrenos en tot l\'any. Sense paraules.', annulled: false },
  )

  const d = (day: number) => `2026-10-${String(day).padStart(2, '0')}`
  for (const [slug, days] of [['eduard', [1, 2, 3, 6, 7, 8]], ['marc', [1, 3, 6, 8]], ['deig', [2, 5]], ['polsy', [6, 7]]] as const) {
    days.forEach((day) => db.trainings.push({ id: uid(), member_id: by(slug), date: d(day), kind: 'gym', count: 1, baseline: false, note: null }))
  }
  db.trainings.push({ id: uid(), member_id: by('deig'), date: d(4), kind: 'fora', count: 1, baseline: false, note: 'Pàdel' })

  const e1 = uid()
  db.expedients.push(
    { id: e1, month_id: '2026-10', target_id: by('josep'), kind: 'falta', text: 'Ha dit que el pit es entrena dilluns i dimecres. Gravíssim.', author: null, reactions: { '😂': 4, '🤡': 2 }, created_at: '2026-10-08T19:22:00Z' },
    { id: uid(), month_id: '2026-10', target_id: by('bernat'), kind: 'merit', text: 'Ens ha portat a tots a casa després del sopar sense queixar-se', author: 'Marc', reactions: { '👏': 3 }, created_at: '2026-10-10T23:40:00Z' },
    { id: uid(), month_id: '2026-10', target_id: by('pena'), kind: 'falta', text: 'Ha tornat a fer bolo dimarts. Ja en van 3 seguits.', author: 'Eduard', reactions: { '💀': 5 }, created_at: '2026-10-14T20:05:00Z' },
  )
  db.comments.push({ id: uid(), expedient_id: e1, author: 'Josep', text: 'Fake news, era espatlla', created_at: '2026-10-08T19:40:00Z' })
  return db
}

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignora */
  }
  const db = seed()
  save(db)
  return db
}
function save(db: DB) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    /* ignora */
  }
}
function mutate(fn: (db: DB) => void) {
  const db = load()
  fn(db)
  save(db)
}
const toDataUrl = (b: Blob) =>
  new Promise<string>((res) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.readAsDataURL(b)
  })
const tick = () => new Promise((r) => setTimeout(r, 80))

export function resetDemo() {
  localStorage.removeItem(KEY)
  localStorage.removeItem(ME)
}

export function createDemoApi(): Api {
  const meId = () => localStorage.getItem(ME)
  const isAdmin = () => load().members.find((m) => m.id === meId())?.is_admin ?? false
  const requireAdmin = () => {
    if (!isAdmin()) throw new Error('Només admins')
  }

  return {
    mode: 'demo',
    async loadAll() {
      await tick()
      const db = load()
      return { ...db, cardPhotos: db.cardPhotos ?? [] }
    },
    async me() {
      return meId()
    },
    async login(slug, password) {
      const m = load().members.find((x) => x.slug === slug.trim().toLowerCase())
      if (!m || password !== 'tibu') throw new Error('Usuari o contrasenya incorrectes (demo: contrasenya "tibu")')
      localStorage.setItem(ME, m.id)
    },
    async activate(slug, _code, password) {
      await this.login(slug, password)
    },
    async logout() {
      localStorage.removeItem(ME)
    },
    async addTraining(t) {
      mutate((db) => db.trainings.push({ id: uid(), baseline: false, note: null, ...t }))
    },
    async deleteTraining(id) {
      mutate((db) => (db.trainings = db.trainings.filter((t) => t.id !== id)))
    },
    async addExpedient(e) {
      mutate((db) => db.expedients.unshift({ ...e, id: uid(), reactions: {}, created_at: new Date().toISOString() }))
    },
    async addComment(c) {
      mutate((db) => db.comments.push({ ...c, id: uid(), created_at: new Date().toISOString() }))
    },
    async react(id, emoji) {
      mutate((db) => {
        const e = db.expedients.find((x) => x.id === id)
        if (e) e.reactions[emoji] = (e.reactions[emoji] ?? 0) + 1
      })
    },
    async castVote(monthId, mvpId, mvpReason, antiId, antiReason) {
      const me = meId()
      const db = load()
      if (!me) throw new Error("Has d'iniciar sessió")
      if (db.months.find((m) => m.id === monthId)?.status !== 'voting') throw new Error("La votació d'aquest mes no està oberta")
      if (db.voters.some((v) => v.month_id === monthId && v.member_id === me)) throw new Error('Ja has votat aquest mes')
      if (mvpId === me || antiId === me) throw new Error('No et pots votar a tu mateix, crack')
      if (mvpId === antiId) throw new Error("El MVP i l'anti no poden ser la mateixa persona")
      if (mvpReason.trim().length < 15 || antiReason.trim().length < 15) throw new Error('Els motius han de tenir mínim 15 caràcters')
      mutate((d) => {
        d.voters.push({ month_id: monthId, member_id: me })
        d.ballots.push({ id: uid(), month_id: monthId, mvp_id: mvpId, mvp_reason: mvpReason.trim(), anti_id: antiId, anti_reason: antiReason.trim(), annulled: false })
      })
    },
    async upsertMonth(m) {
      requireAdmin()
      mutate((db) => {
        const ex = db.months.find((x) => x.id === m.id)
        if (ex) Object.assign(ex, m)
        else db.months.push({ status: 'active', deadline: null, acta: null, ...m })
        db.months.sort((a, b) => a.id.localeCompare(b.id))
      })
    },
    async closeMonth(id) {
      requireAdmin()
      mutate((db) => {
        db.awards = db.awards.filter((a) => a.month_id !== id)
        for (const type of ['mvp', 'anti'] as const) {
          const counts = new Map<string, number>()
          db.ballots
            .filter((b) => b.month_id === id && !b.annulled)
            .forEach((b) => {
              const k = type === 'mvp' ? b.mvp_id : b.anti_id
              counts.set(k, (counts.get(k) ?? 0) + 1)
            })
          const max = Math.max(0, ...counts.values())
          counts.forEach((v, k) => v === max && db.awards.push({ id: uid(), month_id: id, type, member_id: k, votes: v }))
        }
        db.months.find((m) => m.id === id)!.status = 'closed'
      })
    },
    async setBallotAnnulled(id, annulled) {
      requireAdmin()
      mutate((db) => (db.ballots.find((b) => b.id === id)!.annulled = annulled))
    },
    async deleteVoter(monthId, memberId) {
      requireAdmin()
      mutate((db) => (db.voters = db.voters.filter((v) => !(v.month_id === monthId && v.member_id === memberId))))
    },
    async addAward(a) {
      requireAdmin()
      mutate((db) => db.awards.push({ ...a, id: uid() }))
    },
    async deleteAward(id) {
      requireAdmin()
      mutate((db) => (db.awards = db.awards.filter((a) => a.id !== id)))
    },
    async addMember(m) {
      requireAdmin()
      mutate((db) => db.members.push({ id: uid(), nickname: null, photo_url: null, is_admin: false, active: true, ...m }))
    },
    async updateMember(id, patch) {
      requireAdmin()
      mutate((db) => Object.assign(db.members.find((m) => m.id === id)!, patch))
    },
    async inviteCodes() {
      return Object.fromEntries(load().members.map((m) => [m.id, 'DEMO']))
    },
    async resetMember() {
      return 'DEMO'
    },
    async setPhoto(memberId, image) {
      const url = image ? await toDataUrl(image) : null
      await this.updateMember(memberId, { photo_url: url })
    },
    async setCardPhoto(memberId, cardKey, image) {
      requireAdmin()
      const url = image ? await toDataUrl(image) : null
      mutate((db) => {
        db.cardPhotos = (db.cardPhotos ?? []).filter((p) => !(p.member_id === memberId && p.card_key === cardKey))
        if (url) db.cardPhotos.push({ member_id: memberId, card_key: cardKey, url })
      })
    },
    async deleteExpedient(id) {
      requireAdmin()
      mutate((db) => (db.expedients = db.expedients.filter((e) => e.id !== id)))
    },
    async deleteComment(id) {
      requireAdmin()
      mutate((db) => (db.comments = db.comments.filter((c) => c.id !== id)))
    },
  }
}
