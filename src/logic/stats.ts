import type { AchievementKind, Award, DB, Member } from '../types'
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

// ---------------------------------------------------------------------------
// Valoració tipus FIFA
// ---------------------------------------------------------------------------

export interface Rating {
  overall: number
  ent: number // entrenament al gym
  fora: number // activitat fora del gym (+ èxits esportius)
  mvp: number // palmarès MVP
  com: number // comportament (antis dels últims 12 mesos)
  tier: 'bronze' | 'silver' | 'gold'
}

export const STAT_LABELS: [keyof Rating, string, string][] = [
  ['ent', 'ENT', "Entrenos al gym (mitjana mensual de l'any)"],
  ['fora', 'FOR', 'Entrenos fora del gym (mitjana mensual) + èxits esportius dels últims 12 mesos'],
  ['mvp', 'MVP', 'MVPs guanyats en total'],
  ['com', 'COM', 'Comportament: antis dels últims 12 mesos'],
]

/** Pes de cada estadística a la mitjana */
export const WEIGHTS = { ent: 0.4, fora: 0.1, mvp: 0.25, com: 0.25 }

/** Punts que suma cada èxit esportiu a FOR (durant 12 mesos) */
export const ACHIEVEMENT_FOR_BONUS: Record<AchievementKind, number> = { ascens: 12, mitja: 12, hyrox: 15, marato: 25 }

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

  const exitBonus = db.achievements
    .filter((a) => a.member_id === memberId && monthKey(a.date) <= asOfM && monthKey(a.date) > shiftMonth(asOfM, -12))
    .reduce((sum, a) => sum + ACHIEVEMENT_FOR_BONUS[a.kind], 0)

  const r = {
    ent: clamp(40 + (t.gym / elapsed) * 3, 30),
    fora: clamp(35 + (t.fora / elapsed) * 4 + exitBonus, 30),
    mvp: clamp(55 + 11 * mvps),
    com: clamp(88 - 13 * antis12),
  }
  const overall = Math.round(WEIGHTS.ent * r.ent + WEIGHTS.fora * r.fora + WEIGHTS.mvp * r.mvp + WEIGHTS.com * r.com)
  return { ...r, overall, tier: overall >= 75 ? 'gold' : overall >= 65 ? 'silver' : 'bronze' }
}

// ---------------------------------------------------------------------------
// Cartes especials (col·leccionables)
// ---------------------------------------------------------------------------

export type CardVariant =
  | 'gold'
  | 'silver'
  | 'bronze'
  | 'totm'
  | 'anti'
  | 'icon'
  | 'antiicon'
  | 'hattrick'
  | 'bdo'
  | 'beach'
  | 'redemption'
  | 'twoface'
  | 'gymrat'
  | 'centurion'
  | 'offroad'
  | 'ironman'
  | 'superman'
  | 'ghost'
  | 'ghostking'
  | 'ascens'
  | 'mitja'
  | 'marato'
  | 'hyrox'

export interface CardDef {
  id: string
  name: string
  emoji: string
  variant: CardVariant
  how: string
  boost: number // punts que suma (o resta) a la mitjana a la carta especial
  rarity: 'Comuna' | 'Rara' | 'Èpica' | 'Llegendària' | 'Maleïda'
  /** automàtica (es desbloqueja sola) o manual (l'assigna l'admin) */
  auto: boolean
}

// Els ids es mantenen encara que canviï el nom: les fotos de cartes hi van lligades
export const CARD_DEFS: CardDef[] = [
  { id: 'totm', name: 'Tibu of the Month', emoji: '🏆', variant: 'totm', how: "Guanya el MVP d'un mes.", boost: 3, rarity: 'Rara', auto: true },
  { id: 'antim', name: 'Riota del Mes', emoji: '🤡', variant: 'anti', how: "Guanya l'anti-MVP d'un mes.", boost: -3, rarity: 'Maleïda', auto: true },
  { id: 'icona', name: 'Icona', emoji: '👑', variant: 'icon', how: 'Acumula 3 MVPs.', boost: 6, rarity: 'Èpica', auto: true },
  { id: 'nongrata', name: 'Anti-Icona', emoji: '😈', variant: 'antiicon', how: 'Acumula 3 antis. Persona non grata oficial.', boost: -6, rarity: 'Maleïda', auto: true },
  { id: 'hattrick', name: 'Hat-trick', emoji: '⚽', variant: 'hattrick', how: '3 MVPs en 3 mesos seguits.', boost: 10, rarity: 'Llegendària', auto: true },
  { id: 'bdo', name: "Pilota d'Or de Tibu", emoji: '🥇', variant: 'bdo', how: "Més MVPs de l'any (desempat: menys antis, més entrenos).", boost: 12, rarity: 'Llegendària', auto: true },
  { id: 'fang', name: 'Pilota de Platja', emoji: '🏖️', variant: 'beach', how: "Més antis de l'any.", boost: -10, rarity: 'Maleïda', auto: true },
  { id: 'redempcio', name: 'Redemption', emoji: '😇', variant: 'redemption', how: 'Anti un mes i MVP el mes següent.', boost: 4, rarity: 'Èpica', auto: true },
  { id: 'doblecara', name: 'Doble Cara', emoji: '🎭', variant: 'twoface', how: 'MVP i anti el mateix any.', boost: 0, rarity: 'Rara', auto: true },
  { id: 'rata', name: 'GymRat', emoji: '🐀', variant: 'gymrat', how: '200 entrenos al gym en un any.', boost: 5, rarity: 'Èpica', auto: true },
  { id: 'centurio', name: 'Centurió', emoji: '🏛️', variant: 'centurion', how: '100 entrenos al gym en un any.', boost: 2, rarity: 'Comuna', auto: true },
  { id: 'totterreny', name: '4x4', emoji: '🚙', variant: 'offroad', how: '100 entrenos fora del gym en un any.', boost: 2, rarity: 'Rara', auto: true },
  { id: 'ferro', name: 'IronMan', emoji: '🦾', variant: 'ironman', how: '3 mesos seguits amb 15+ entrenos al gym.', boost: 4, rarity: 'Èpica', auto: true },
  { id: 'superman', name: 'SuperMan', emoji: '🦸', variant: 'superman', how: '3 mesos seguits amb 20+ entrenos al gym.', boost: 7, rarity: 'Llegendària', auto: true },
  { id: 'fantasma', name: 'Fantasma', emoji: '👻', variant: 'ghost', how: 'Un mes sencer sense trepitjar el gym.', boost: -4, rarity: 'Maleïda', auto: true },
  { id: 'reifantasma', name: 'Rei Fantasma', emoji: '👑', variant: 'ghostking', how: 'Un mes sencer sense cap entreno, ni al gym ni fora.', boost: -8, rarity: 'Maleïda', auto: true },
  // Èxits esportius: manuals, els assigna l'admin
  { id: 'exit-ascens', name: 'Ascens', emoji: '🏆', variant: 'ascens', how: "Campió de lliga o ascens amb l'equip.", boost: 0, rarity: 'Èpica', auto: false },
  { id: 'exit-mitja', name: 'Mitja Marató', emoji: '🏃', variant: 'mitja', how: 'Acaba una mitja marató (21,1 km).', boost: 0, rarity: 'Èpica', auto: false },
  { id: 'exit-marato', name: 'Marató', emoji: '🏅', variant: 'marato', how: 'Acaba una marató (42,2 km).', boost: 0, rarity: 'Llegendària', auto: false },
  { id: 'exit-hyrox', name: 'Hyrox', emoji: '🏋️', variant: 'hyrox', how: 'Acaba una competició Hyrox.', boost: 0, rarity: 'Èpica', auto: false },
]

export interface CardUnlock {
  def: CardDef
  memberId: string
  label: string // mes, any o esdeveniment
  sortKey: string // 'YYYY', 'YYYY-MM' o 'YYYY-MM-DD'
  /** Clau per a la foto de la carta (si no, `${def.id}:${sortKey}`) */
  key?: string
}

/** Mes de referència d'una carta per calcular-ne la valoració */
export const unlockMonth = (u: Pick<CardUnlock, 'sortKey'>) => (u.sortKey.length >= 7 ? u.sortKey.slice(0, 7) : undefined)

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

    const gymMonths = (min: number) => trainingMonths.filter((k) => monthTotals(db, m.id, k).gym >= min)
    consecutive(gymMonths(15), 3).forEach((k) => push('ferro', m.id, k))
    consecutive(gymMonths(20), 3).forEach((k) => push('superman', m.id, k))

    // Fantasmes: només mesos tancats des que es fa servir l'app
    closed
      .filter((k) => k >= start)
      .forEach((k) => {
        const t = monthTotals(db, m.id, k)
        if (t.gym + t.fora === 0) push('reifantasma', m.id, k)
        else if (t.gym === 0) push('fantasma', m.id, k)
      })
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

  // Èxits esportius (manuals)
  for (const a of db.achievements) {
    if (!db.members.some((m) => m.id === a.member_id)) continue
    out.push({ def: def(`exit-${a.kind}`), memberId: a.member_id, sortKey: a.date, label: a.event, key: `exit:${a.id}` })
  }

  return out.sort((a, b) => b.sortKey.localeCompare(a.sortKey))
}

export const cardKey = (u: Pick<CardUnlock, 'def' | 'sortKey' | 'key'>) => u.key ?? `${u.def.id}:${u.sortKey}`

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
