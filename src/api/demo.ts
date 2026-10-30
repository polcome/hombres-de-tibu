// Mode demo: tot es guarda al navegador (localStorage). Serveix per provar
// l'app sense configurar Supabase. Contrasenya de qualsevol usuari: "tibu".
import type { Api } from './types'
import type { DB, Member } from '../types'

const KEY = 'tibu-demo-db-v3'
const ME = 'tibu-demo-me'
/** Registre ocult votant → papereta (com `ballot_links`): no el llegeix la UI, només castVote, removeVote i voteCheck */
const LINKS = 'tibu-demo-ballot-links'
const loadLinks = (): Record<string, string> => JSON.parse(localStorage.getItem(LINKS) ?? '{}')
const saveLinks = (l: Record<string, string>) => localStorage.setItem(LINKS, JSON.stringify(l))
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
  const db: DB = { members, months: [], trainings: [], awards: [], expedients: [], comments: [], ballots: [], voters: [], cardPhotos: [], trainingVotes: [], achievements: [], expedientReactions: [], myPostDays: [] }

  BASE.forEach(([slug, , gym, fora]) => {
    db.trainings.push({ id: uid(), member_id: by(slug), date: '2026-10-16', kind: 'gym', count: gym, baseline: true, note: 'Recompte inicial 2026' })
    if (fora) db.trainings.push({ id: uid(), member_id: by(slug), date: '2026-10-16', kind: 'fora', count: fora, baseline: true, note: 'Recompte inicial 2026' })
  })

  // Palmarès real 2026 (gener–setembre)
  const PALMARES: [string, string, string][] = [
    ['2026-01', 'come', 'gerard'],
    ['2026-02', 'eduard', 'marc'],
    ['2026-03', 'deig', 'josep'],
    ['2026-04', 'josep', 'policho'],
    ['2026-05', 'deig', 'fq'],
    ['2026-06', 'polsy', 'fq'],
    ['2026-07', 'come', 'gerard'],
    ['2026-08', 'ferran', 'deig'],
    ['2026-09', 'josep', 'marc'],
  ]
  PALMARES.forEach(([month, mvp, anti]) => {
    db.months.push({ id: month, status: 'closed', deadline: null, acta: null })
    db.awards.push(
      { id: uid(), month_id: month, type: 'mvp', member_id: by(mvp), votes: null },
      { id: uid(), month_id: month, type: 'anti', member_id: by(anti), votes: null },
    )
  })
  db.months.push({ id: '2026-10', status: 'active', deadline: '2026-11-01T22:00:00+01:00', acta: null })
  // Vots d'exemple (inventats) del setembre
  db.ballots.push(
    { id: uid(), month_id: '2026-09', mvp_id: by('josep'), mvp_reason: 'Ha anat al gym cada dia i ha portat esmorzar per a tothom', anti_id: by('marc'), anti_reason: 'Va dir que venia dimarts, dijous i divendres i no va venir cap dia', annulled: false },
    { id: uid(), month_id: '2026-09', mvp_id: by('josep'), mvp_reason: 'Ha organitzat el sopar del grup i ha reservat ell tot', anti_id: by('marc'), anti_reason: 'Ens va deixar tirats al sopar de grup per anar amb la xurri', annulled: false },
  )
  // Èxits esportius d'exemple (inventats)
  db.achievements = [
    { id: uid(), member_id: by('deig'), kind: 'mitja', event: 'Mitja Marató de Barcelona', date: '2026-02-15' },
    { id: uid(), member_id: by('come'), kind: 'mitja', event: 'Mitja Marató de Barcelona', date: '2026-02-15' },
    { id: uid(), member_id: by('eduard'), kind: 'hyrox', event: 'Hyrox Barcelona', date: '2026-05-10' },
    { id: uid(), member_id: by('bernat'), kind: 'ascens', event: 'Ascens a Primera Catalana', date: '2026-06-01' },
    { id: uid(), member_id: by('marc'), kind: 'marato', event: 'Marató de València', date: '2026-01-12' },
  ]

  const d = (day: number) => `2026-10-${String(day).padStart(2, '0')}`
  for (const [slug, days] of [['eduard', [1, 2, 3, 6, 7, 8]], ['marc', [1, 3, 6, 8]], ['deig', [2, 5]], ['polsy', [6, 7]]] as const) {
    days.forEach((day) => db.trainings.push({ id: uid(), member_id: by(slug), date: d(day), kind: 'gym', count: 1, baseline: false, note: null }))
  }
  db.trainings.push({ id: uid(), member_id: by('deig'), date: d(4), kind: 'fora', count: 1, baseline: false, note: 'Pàdel' })

  const e1 = uid()
  db.expedients.push(
    { id: e1, month_id: '2026-10', target_id: by('josep'), kind: 'falta', text: 'Ha dit que el pit es entrena dilluns i dimecres. Gravíssim.', author: null, reactions: {}, created_at: '2026-10-08T19:22:00Z' },
    { id: uid(), month_id: '2026-10', target_id: by('bernat'), kind: 'merit', text: 'Ens ha portat a tots a casa després del sopar sense queixar-se', author: 'Marc', reactions: {}, created_at: '2026-10-10T23:40:00Z' },
    { id: uid(), month_id: '2026-10', target_id: by('pena'), kind: 'falta', text: 'Ha tornat a fer bolo dimarts. Ja en van 3 seguits.', author: 'Eduard', reactions: {}, created_at: '2026-10-14T20:05:00Z' },
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
      const posts = (db as DB & { posts?: { member_id: string; day: string }[] }).posts ?? []
      const closed = new Set(db.months.filter((m) => m.status === 'closed').map((m) => m.id))
      return {
        ...db,
        // Com la RLS: les paperetes només es veuen quan el mes està tancat
        ballots: db.ballots.filter((b) => closed.has(b.month_id)),
        cardPhotos: db.cardPhotos ?? [],
        trainingVotes: db.trainingVotes ?? [],
        achievements: db.achievements ?? [],
        expedientReactions: db.expedientReactions ?? [],
        myPostDays: posts.filter((p) => p.member_id === meId()).map((p) => p.day),
      }
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
    async addTraining(t, photo) {
      const photo_url = photo ? await toDataUrl(photo) : null
      mutate((db) => db.trainings.push({ id: uid(), baseline: false, note: null, ...t, photo_url, created_at: new Date().toISOString() }))
    },
    async voteTraining(trainingId, vote) {
      const me = meId()
      if (!me) throw new Error("Has d'iniciar sessió")
      mutate((db) => {
        if (db.trainings.find((t) => t.id === trainingId)?.member_id === me) throw new Error('No et pots validar a tu mateix 😏')
        db.trainingVotes = (db.trainingVotes ?? []).filter((v) => !(v.training_id === trainingId && v.member_id === me))
        if (vote) db.trainingVotes.push({ training_id: trainingId, member_id: me, vote })
      })
    },
    async deleteTraining(id) {
      mutate((db) => (db.trainings = db.trainings.filter((t) => t.id !== id)))
    },
    async addExpedient(e) {
      const me = meId()
      if (!me) throw new Error("Has d'entrar per publicar (continuarà sent anònim)")
      const today = new Date().toLocaleDateString('sv-SE')
      mutate((db) => {
        const d = db as DB & { posts?: { member_id: string; day: string }[] }
        d.posts = d.posts ?? []
        if (d.posts.filter((p) => p.member_id === me && p.day === today).length >= 2) throw new Error('Ja has publicat 2 expedients avui. Torna demà 😉')
        d.posts.push({ member_id: me, day: today })
        db.expedients.unshift({ ...e, id: uid(), reactions: {}, created_at: new Date().toISOString() })
      })
    },
    async addComment(c) {
      mutate((db) => db.comments.push({ ...c, id: uid(), created_at: new Date().toISOString() }))
    },
    async react(id, emoji) {
      const me = meId()
      if (!me) throw new Error("Has d'entrar per reaccionar")
      mutate((db) => {
        db.expedientReactions = db.expedientReactions ?? []
        const cur = db.expedientReactions.find((r) => r.expedient_id === id && r.member_id === me)
        db.expedientReactions = db.expedientReactions.filter((r) => r !== cur)
        if (cur?.emoji !== emoji) db.expedientReactions.push({ expedient_id: id, member_id: me, emoji })
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
      const id = uid()
      mutate((d) => {
        d.voters.push({ month_id: monthId, member_id: me })
        d.ballots.push({ id, month_id: monthId, mvp_id: mvpId, mvp_reason: mvpReason.trim(), anti_id: antiId, anti_reason: antiReason.trim(), annulled: false })
      })
      saveLinks({ ...loadLinks(), [`${monthId}:${me}`]: id })
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
        const ballots = db.ballots.filter((b) => b.month_id === id && !b.annulled)
        const count = (type: 'mvp' | 'anti') => {
          const counts = new Map<string, number>()
          ballots.forEach((b) => {
            const k = type === 'mvp' ? b.mvp_id : b.anti_id
            counts.set(k, (counts.get(k) ?? 0) + 1)
          })
          return counts
        }
        const other = { mvp: count('anti'), anti: count('mvp') }
        for (const type of ['mvp', 'anti'] as const) {
          const counts = count(type)
          const max = Math.max(0, ...counts.values())
          let top = [...counts].filter(([, v]) => v === max)
          // Desempat: MVP → menys vots d'anti; anti → menys vots de MVP (si continuen empatats, guanyen tots)
          const min = Math.min(...top.map(([k]) => other[type].get(k) ?? 0))
          top = top.filter(([k]) => (other[type].get(k) ?? 0) === min)
          top.forEach(([k, v]) => db.awards.push({ id: uid(), month_id: id, type, member_id: k, votes: v }))
        }
        db.months.find((m) => m.id === id)!.status = 'closed'
      })
    },
    async removeVote(monthId, memberId) {
      requireAdmin()
      if (load().months.find((m) => m.id === monthId)?.status === 'closed') throw new Error('Aquest mes ja està tancat')
      const links = loadLinks()
      const ballotId = links[`${monthId}:${memberId}`]
      mutate((db) => {
        db.ballots = db.ballots.filter((b) => b.id !== ballotId)
        db.voters = db.voters.filter((v) => !(v.month_id === monthId && v.member_id === memberId))
      })
      delete links[`${monthId}:${memberId}`]
      saveLinks(links)
    },
    async voteCheck(monthId) {
      requireAdmin()
      const db = load()
      const links = loadLinks()
      return Object.fromEntries(
        db.voters.filter((v) => v.month_id === monthId).map((v) => [v.member_id, db.ballots.some((b) => b.id === links[`${monthId}:${v.member_id}`])]),
      )
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
      if (memberId !== meId()) requireAdmin()
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
    async addAchievements(memberIds, a) {
      requireAdmin()
      mutate((db) => {
        db.achievements = db.achievements ?? []
        memberIds.forEach((member_id) => db.achievements.push({ id: uid(), member_id, ...a }))
      })
    },
    async deleteAchievement(id) {
      requireAdmin()
      mutate((db) => (db.achievements = (db.achievements ?? []).filter((x) => x.id !== id)))
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
