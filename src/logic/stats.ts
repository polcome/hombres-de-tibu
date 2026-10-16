import type { Award, DB, Member } from '../types'
import { closedMonths, lastDayOf, monthKey, monthLabel, monthsElapsed, shiftMonth, todayISO } from './months'

export interface Totals {
  gym: number
  fora: number
}

const clamp = (v: number, lo = 20, hi = 99) => Math.round(Math.max(lo, Math.min(hi, v)))

export function yearTotals(db: DB, memberId: string, year: number, upTo?: string): Totals {
  const t = { gym: 0, fora: 0 }
  for (const x of db.trainings) {
    if (x.member_id !== memberId || !x.date.startsWith(String(year))) continue
    if (upTo && !x.baseline && x.date > upTo) continue
    t[x.kind] += x.count
  }
  return t
}

/** Entrenaments d'un mes (sense comptar el recompte inicial) */
export function monthTotals(db: DB, memberId: string, monthId: string): Totals {
  const t = { gym: 0, fora: 0 }
  for (const x of db.trainings) if (x.member_id === memberId && !x.baseline && monthKey(x.date) === monthId) t[x.kind] += x.count
  return t
}

export const fmtTotals = (t: Totals) => (t.fora ? `${t.gym} (${t.fora})` : `${t.gym}`)

export function awardsOf(db: DB, memberId: string) {
  const mine = db.awards.filter((a) => a.member_id === memberId).sort((a, b) => a.month_id.localeCompare(b.month_id))
  return { mvp: mine.filter((a) => a.type === 'mvp'), anti: mine.filter((a) => a.type === 'anti') }
}

export function winnersOf(db: DB, monthId: string) {
  const list = db.awards.filter((a) => a.month_id === monthId)
  return { mvp: list.filter((a) => a.type === 'mvp'), anti: list.filter((a) => a.type === 'anti') }
}

/** Primer mes amb entrenaments registrats a l'app (no recompte inicial) */
export function appStartMonth(db: DB) {
  const dates = db.trainings.filter((t) => !t.baseline).map((t) => t.date).sort()
  return dates.length ? monthKey(dates[0]) : monthKey(todayISO())
}

/** Mesos amb votació feta a l'app */
const votingMonths = (db: DB) => closedMonths(db).filter((m) => db.voters.some((v) => v.month_id === m.id)).map((m) => m.id)

// ---------------------------------------------------------------------------
// Valoració tipus FIFA
// ---------------------------------------------------------------------------

export interface Rating {
  overall: number
  ent: number // entrenament al gym
  fora: number // activitat fora del gym
  mvp: number // palmarès MVP
  com: number // comportament (antis dels últims 12 mesos)
  vot: number // participació a les votacions
  car: number // carisma (mèrits/faltes dels últims 3 mesos)
  tier: 'bronze' | 'silver' | 'gold'
}

export const STAT_LABELS: [keyof Rating, string, string][] = [
  ['ent', 'ENT', 'Entrenos al gym (mitjana mensual de l\'any)'],
  ['fora', 'FOR', 'Entrenos fora del gym (mitjana mensual)'],
  ['mvp', 'MVP', 'MVPs guanyats en total'],
  ['com', 'COM', 'Comportament: antis dels últims 12 mesos'],
  ['vot', 'VOT', 'Participació a les votacions'],
  ['car', 'CAR', 'Carisma: mèrits i faltes dels últims 3 mesos'],
]

/** Valoració d'un membre a final del mes indicat (o avui) */
export function rating(db: DB, memberId: string, asOfMonth?: string): Rating {
  const asOf = asOfMonth ? lastDayOf(asOfMonth) : todayISO()
  const asOfM = monthKey(asOf)
  const year = Number(asOf.slice(0, 4))
  const t = yearTotals(db, memberId, year, asOf)

  // Si hi ha recompte inicial, cobreix fins a la seva data
  const baseDates = db.trainings.filter((x) => x.baseline && x.member_id === memberId && x.date.startsWith(String(year))).map((x) => x.date)
  const elapsed = Math.max(1, monthsElapsed(asOf), ...baseDates.map(monthsElapsed))

  const aw = db.awards.filter((a) => a.member_id === memberId && a.month_id <= asOfM)
  const mvps = aw.filter((a) => a.type === 'mvp').length
  const antis12 = aw.filter((a) => a.type === 'anti' && a.month_id > shiftMonth(asOfM, -12)).length

  const vm = votingMonths(db).filter((m) => m <= asOfM)
  const voted = vm.filter((m) => db.voters.some((v) => v.month_id === m && v.member_id === memberId)).length
  const vot = vm.length ? clamp(45 + 54 * (voted / vm.length)) : 70

  const exp = db.expedients.filter((e) => e.target_id === memberId && e.month_id <= asOfM && e.month_id > shiftMonth(asOfM, -3))
  const merits = exp.filter((e) => e.kind === 'merit').length
  const faltes = exp.length - merits

  const r = {
    ent: clamp(40 + (t.gym / elapsed) * 3, 30),
    fora: clamp(35 + (t.fora / elapsed) * 4, 30),
    mvp: clamp(55 + 11 * mvps),
    com: clamp(88 - 13 * antis12),
    vot,
    car: clamp(65 + 4 * merits - 4 * faltes, 30),
  }
  const overall = Math.round(0.3 * r.ent + 0.1 * r.fora + 0.2 * r.mvp + 0.2 * r.com + 0.1 * r.vot + 0.1 * r.car)
  return { ...r, overall, tier: overall >= 75 ? 'gold' : overall >= 65 ? 'silver' : 'bronze' }
}

// ---------------------------------------------------------------------------
// Cartes especials (col·leccionables)
// ---------------------------------------------------------------------------

export type CardVariant = 'gold' | 'silver' | 'bronze' | 'totm' | 'anti' | 'icon' | 'villain' | 'legend' | 'bdo' | 'fang' | 'ach' | 'ghost'

export interface CardDef {
  id: string
  name: string
  emoji: string
  variant: CardVariant
  how: string
  boost: number // punts que suma (o resta) a la mitjana a la carta especial
  rarity: 'Comuna' | 'Rara' | 'Èpica' | 'Llegendària' | 'Maleïda'
}

export const CARD_DEFS: CardDef[] = [
  { id: 'totm', name: 'Tibu of the Month', emoji: '🏆', variant: 'totm', how: 'Guanya el MVP d\'un mes.', boost: 3, rarity: 'Rara' },
  { id: 'antim', name: 'Riota del Mes', emoji: '🤡', variant: 'anti', how: 'Guanya l\'anti-MVP d\'un mes.', boost: -3, rarity: 'Maleïda' },
  { id: 'icona', name: 'Icona', emoji: '👑', variant: 'icon', how: 'Acumula 3 MVPs.', boost: 6, rarity: 'Èpica' },
  { id: 'nongrata', name: 'Persona Non Grata', emoji: '😈', variant: 'villain', how: 'Acumula 3 antis.', boost: -6, rarity: 'Maleïda' },
  { id: 'hattrick', name: 'Hat-trick', emoji: '⚡', variant: 'legend', how: '3 MVPs en 3 mesos seguits.', boost: 10, rarity: 'Llegendària' },
  { id: 'bdo', name: "Pilota d'Or de Tibu", emoji: '🥇', variant: 'bdo', how: 'Més MVPs de l\'any (desempat: menys antis, més entrenos).', boost: 12, rarity: 'Llegendària' },
  { id: 'fang', name: 'Pilota de Fang', emoji: '💩', variant: 'fang', how: 'Més antis de l\'any.', boost: -10, rarity: 'Maleïda' },
  { id: 'redempcio', name: 'Redempció', emoji: '😇', variant: 'ach', how: 'Anti un mes i MVP el mes següent.', boost: 4, rarity: 'Èpica' },
  { id: 'doblecara', name: 'Doble Cara', emoji: '🎭', variant: 'ach', how: 'MVP i anti el mateix any.', boost: 0, rarity: 'Rara' },
  { id: 'rata', name: 'Rata de Gimnàs', emoji: '🐀', variant: 'ach', how: '200 entrenos al gym en un any.', boost: 5, rarity: 'Èpica' },
  { id: 'centurio', name: 'Centurió', emoji: '💯', variant: 'ach', how: '100 entrenos al gym en un any.', boost: 2, rarity: 'Comuna' },
  { id: 'totterreny', name: 'Tot Terreny', emoji: '🚵', variant: 'ach', how: '100 entrenos fora del gym en un any.', boost: 2, rarity: 'Rara' },
  { id: 'ferro', name: 'Home de Ferro', emoji: '🦾', variant: 'ach', how: '3 mesos seguits amb 12+ entrenos al gym.', boost: 3, rarity: 'Rara' },
  { id: 'perfecte', name: 'Mes Perfecte', emoji: '🔥', variant: 'ach', how: '20+ entrenos (gym + fora) en un sol mes.', boost: 3, rarity: 'Rara' },
  { id: 'exemplar', name: 'Ciutadà Exemplar', emoji: '🗳️', variant: 'ach', how: 'Vota 6 mesos seguits sense rebre cap anti.', boost: 3, rarity: 'Èpica' },
  { id: 'fantasma', name: 'Fantasma', emoji: '👻', variant: 'ghost', how: 'Un mes sencer sense cap entreno.', boost: -5, rarity: 'Maleïda' },
]

export interface CardUnlock {
  def: CardDef
  memberId: string
  label: string // mes o any
  sortKey: string
}

const consecutive = (ids: string[], n: number) => {
  const s = [...new Set(ids)].sort()
  const hits: string[] = []
  for (let i = 0; i + n - 1 < s.length; i++) if (s[i + n - 1] === shiftMonth(s[i], n - 1)) hits.push(s[i + n - 1])
  return hits
}

export function unlockedCards(db: DB): CardUnlock[] {
  const out: CardUnlock[] = []
  const def = (id: string) => CARD_DEFS.find((d) => d.id === id)!
  const push = (id: string, memberId: string, key: string, label?: string) =>
    out.push({ def: def(id), memberId, sortKey: key, label: label ?? (key.length === 7 ? monthLabel(key) : key) })

  const closed = closedMonths(db).map((m) => m.id)
  const years = [...new Set([...db.trainings.map((t) => t.date.slice(0, 4)), ...closed.map((m) => m.slice(0, 4))])].sort()
  const start = appStartMonth(db)
  const vm = votingMonths(db)
  // Mesos amb entrenaments registrats dia a dia
  const trainingMonths = [...new Set(db.trainings.filter((t) => !t.baseline).map((t) => monthKey(t.date)))].sort()

  for (const m of db.members) {
    const { mvp, anti } = awardsOf(db, m.id)
    const mvpM = mvp.map((a) => a.month_id)
    const antiM = anti.map((a) => a.month_id)

    mvp.forEach((a) => push('totm', m.id, a.month_id))
    anti.forEach((a) => push('antim', m.id, a.month_id))
    if (mvp.length >= 3) push('icona', m.id, mvp[2].month_id)
    if (anti.length >= 3) push('nongrata', m.id, anti[2].month_id)
    consecutive(mvpM, 3).forEach((k) => push('hattrick', m.id, k))
    antiM.filter((k) => mvpM.includes(shiftMonth(k, 1))).forEach((k) => push('redempcio', m.id, shiftMonth(k, 1)))

    for (const y of years) {
      if (mvpM.some((k) => k.startsWith(y)) && antiM.some((k) => k.startsWith(y))) push('doblecara', m.id, y)
      const t = yearTotals(db, m.id, Number(y))
      if (t.gym >= 200) push('rata', m.id, y)
      if (t.gym >= 100) push('centurio', m.id, y)
      if (t.fora >= 100) push('totterreny', m.id, y)
    }

    const ironMonths = trainingMonths.filter((k) => monthTotals(db, m.id, k).gym >= 12)
    consecutive(ironMonths, 3).forEach((k) => push('ferro', m.id, k))
    trainingMonths.forEach((k) => {
      const t = monthTotals(db, m.id, k)
      if (t.gym + t.fora >= 20) push('perfecte', m.id, k)
    })
    closed.filter((k) => k >= start).forEach((k) => {
      const t = monthTotals(db, m.id, k)
      if (t.gym + t.fora === 0) push('fantasma', m.id, k)
    })

    let streak = 0
    for (const k of vm) {
      const ok = db.voters.some((v) => v.month_id === k && v.member_id === m.id) && !antiM.includes(k)
      streak = ok ? streak + 1 : 0
      if (streak === 6) push('exemplar', m.id, k)
    }
  }

  // Premis anuals: quan el desembre està tancat
  for (const y of years) {
    if (!closed.includes(`${y}-12`)) continue
    const rows = db.members.map((m) => {
      const aw = db.awards.filter((a) => a.member_id === m.id && a.month_id.startsWith(y))
      return { m, mvp: aw.filter((a) => a.type === 'mvp').length, anti: aw.filter((a) => a.type === 'anti').length, gym: yearTotals(db, m.id, Number(y)).gym }
    })
    const bdo = [...rows].sort((a, b) => b.mvp - a.mvp || a.anti - b.anti || b.gym - a.gym)[0]
    if (bdo?.mvp) push('bdo', bdo.m.id, y)
    const fang = [...rows].sort((a, b) => b.anti - a.anti || a.mvp - b.mvp || a.gym - b.gym)[0]
    if (fang?.anti) push('fang', fang.m.id, y)
  }

  return out.sort((a, b) => b.sortKey.localeCompare(a.sortKey))
}

export const cardKey = (u: Pick<CardUnlock, 'def' | 'sortKey'>) => `${u.def.id}:${u.sortKey}`

/** Foto d'una carta concreta (si n'hi ha) o la foto base del membre */
export function photoFor(db: DB, member: Member, key?: string) {
  return (key && db.cardPhotos.find((p) => p.member_id === member.id && p.card_key === key)?.url) || member.photo_url
}

/** Carta "principal" d'un membre: la millor especial recent o la base */
export function featuredCard(
  db: DB,
  member: Member,
  unlocks: CardUnlock[],
): { variant: CardVariant; label?: string; boost: number; title?: string; key?: string } {
  const last = closedMonths(db).at(-1)?.id
  const mine = unlocks.filter((u) => u.memberId === member.id)
  const recent = (id: string) => mine.find((u) => u.def.id === id && (u.sortKey === last || u.sortKey === last?.slice(0, 4)))
  for (const id of ['bdo', 'fang', 'totm', 'antim']) {
    const u = recent(id)
    if (u) return { variant: u.def.variant, label: u.label, boost: u.def.boost, title: u.def.name, key: cardKey(u) }
  }
  return { variant: rating(db, member.id).tier, boost: 0 }
}

export function palmares(db: DB) {
  return db.members
    .map((m) => {
      const { mvp, anti } = awardsOf(db, m.id)
      return { member: m, mvp: mvp.length, anti: anti.length, balance: mvp.length - anti.length }
    })
    .sort((a, b) => b.mvp - a.mvp || a.anti - b.anti || a.member.name.localeCompare(b.member.name))
}

export const displayName = (m?: Member | null) => (m ? m.nickname || m.name : '¿?')
export const memberById = (db: DB, id: string) => db.members.find((m) => m.id === id)

export function awardNames(db: DB, list: Award[]) {
  return list.map((a) => displayName(memberById(db, a.member_id))).join(' i ')
}
