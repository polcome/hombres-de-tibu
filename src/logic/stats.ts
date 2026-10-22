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
  com: number // comportament (antis de l'any)
  con: number // constància: setmanes amb 2+ entrenos
  tier: Tier
}

export type Tier = 'bronze' | 'silver' | 'silvershiny' | 'gold' | 'goldshiny'

/** Nivell de la carta base segons la mitjana */
export const TIERS: [Tier, number, string][] = [
  ['goldshiny', 80, 'Or brillant'],
  ['gold', 75, 'Or'],
  ['silvershiny', 70, 'Plata brillant'],
  ['silver', 65, 'Plata'],
  ['bronze', 0, 'Bronze'],
]
export const tierOf = (overall: number): Tier => TIERS.find(([, min]) => overall >= min)![0]

export const STAT_LABELS: [keyof Rating, string, string][] = [
  ['ent', 'ENT', "Entrenos al gym acumulats de l'any (236 = 99)"],
  ['fora', 'FOR', "Entrenos fora del gym acumulats de l'any (192 = 99) + èxits esportius de l'any"],
  ['mvp', 'MVP', "MVPs guanyats aquest any"],
  ['com', 'COM', "Comportament: antis rebuts aquest any"],
  ['con', 'CON', "Constància: setmanes de l'any amb 2+ entrenos. Progressiva: com més setmanes complertes, més alta pot arribar"],
]

/** Pes de cada estadística a la mitjana */
export const WEIGHTS = { ent: 0.35, fora: 0.1, mvp: 0.2, com: 0.2, con: 0.15 }

/** Punts que suma cada èxit esportiu a FOR (l'any natural de l'èxit) */
export const ACHIEVEMENT_FOR_BONUS: Record<AchievementKind, number> = { ascens: 12, mitja: 12, hyrox: 15, marato: 25 }

/** Valoració d'un membre a final del mes indicat (o avui). Tot es compta dins l'any natural: l'1 de gener es torna a començar. */
export function rating(db: DB, memberId: string, asOfMonth?: string): Rating {
  const asOf = asOfMonth ? lastDayOf(asOfMonth) : todayISO()
  const asOfM = monthKey(asOf)
  const year = Number(asOf.slice(0, 4))
  // Entrenos acumulats de l'any fins a la data. El recompte inicial cobreix de l'1 de gener fins a la seva
  // data: per a una data anterior se'n compta només la part proporcional.
  const t = { gym: 0, fora: 0 }
  for (const x of db.trainings) {
    if (x.member_id !== memberId || !x.date.startsWith(String(year))) continue
    if (!x.baseline) {
      if (x.date <= asOf) t[x.kind] += x.count
    } else t[x.kind] += x.count * Math.min(1, monthsElapsed(asOf) / monthsElapsed(x.date))
  }

  const aw = db.awards.filter((a) => a.member_id === memberId && a.month_id <= asOfM && a.month_id.startsWith(String(year)))
  const mvps = aw.filter((a) => a.type === 'mvp').length
  const antis = aw.filter((a) => a.type === 'anti').length

  const exitBonus = db.achievements
    .filter((a) => a.member_id === memberId && a.date <= asOf && a.date.startsWith(String(year)))
    .reduce((sum, a) => sum + ACHIEVEMENT_FOR_BONUS[a.kind], 0)

  const r = {
    // Es van omplint durant l'any: 236 de gym o 192 fora = 99
    ent: clamp(40 + t.gym / 4, 30),
    fora: clamp(35 + t.fora / 3 + exitBonus, 30),
    mvp: clamp(55 + 11 * mvps),
    com: clamp(88 - 13 * antis),
    con: consistency(db, memberId, asOf),
  }
  const overall = Math.round(WEIGHTS.ent * r.ent + WEIGHTS.fora * r.fora + WEIGHTS.mvp * r.mvp + WEIGHTS.com * r.com + WEIGHTS.con * r.con)
  return { ...r, overall, tier: tierOf(overall) }
}

const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
/** Dilluns de la setmana d'una data */
function weekStart(iso: string) {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return isoDate(d)
}
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + n)
  return isoDate(d)
}

/** Setmanes "virtuals" al 50% que s'afegeixen a la constància: amb poques setmanes no es pot tenir una nota alta */
const CON_PRIOR_WEEKS = 12

/**
 * Constància: setmanes senceres de l'any (que comencen dins l'any, i des que es fa servir l'app)
 * amb 2 o més entrenos (gym o fora). És progressiva: es compta com si hi hagués 12 setmanes més
 * a mitges, així un 3/3 val menys que un 30/30. Sense setmanes encara: 70.
 */
export function consistency(db: DB, memberId: string, asOf: string) {
  const logged = db.trainings.filter((t) => !t.baseline)
  if (!logged.length) return 70
  const first = weekStart(logged.reduce((m, t) => (t.date < m ? t.date : m), logged[0].date))
  const end = weekStart(addDays(asOf, 1)) // la setmana en curs no compta fins que acaba
  // Primera setmana que comença dins l'any
  let from = weekStart(`${asOf.slice(0, 4)}-01-01`)
  if (from < `${asOf.slice(0, 4)}-01-01`) from = addDays(from, 7)
  if (from < first) from = first
  const weeks: string[] = []
  for (let w = from; w < end; w = addDays(w, 7)) weeks.push(w)
  if (!weeks.length) return 70
  const perWeek = new Map<string, number>()
  for (const t of logged) if (t.member_id === memberId) perWeek.set(weekStart(t.date), (perWeek.get(weekStart(t.date)) ?? 0) + t.count)
  const good = weeks.filter((w) => (perWeek.get(w) ?? 0) >= 2).length
  const pct = (good + CON_PRIOR_WEEKS / 2) / (weeks.length + CON_PRIOR_WEEKS)
  return clamp(40 + 59 * pct)
}

// ---------------------------------------------------------------------------
// Cartes especials (col·leccionables)
// ---------------------------------------------------------------------------

export type CardVariant =
  | Tier
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

export type CardLevel = 'plus' | 'ultra'

export interface CardDef {
  id: string
  name: string
  emoji: string
  variant: CardVariant
  how: string
  boost: number // punts que suma (o resta) a la mitjana a la carta especial
  rarity: 'Comuna' | 'Rara' | 'Èpica' | 'Llegendària' | 'Mítica' | 'Maleïda'
  /** automàtica (es desbloqueja sola) o manual (l'assigna l'admin) */
  auto: boolean
  /** Versions més difícils d'una carta: comparteixen disseny i `family` */
  level?: CardLevel
  family?: string
}

const BASE_DEFS: CardDef[] = [
  { id: 'totm', name: 'Tibu of the Month', emoji: '🏆', variant: 'totm', how: "Guanya el MVP d'un mes.", boost: 3, rarity: 'Rara', auto: true },
  { id: 'antim', name: 'Anti-MVP', emoji: '🤡', variant: 'anti', how: "Guanya l'anti-MVP d'un mes.", boost: -3, rarity: 'Maleïda', auto: true },
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

/** Llindars de les versions PLUS i ULTRA (el que compta depèn de la carta) */
export const LEVEL_RULES: Record<string, { plus: [number, string, number]; ultra: [number, string, number] }> = {
  icona: { plus: [6, 'Acumula 6 MVPs.', 9], ultra: [10, 'Acumula 10 MVPs.', 13] },
  nongrata: { plus: [6, 'Acumula 6 antis.', -9], ultra: [10, 'Acumula 10 antis.', -13] },
  hattrick: { plus: [4, '4 MVPs en 4 mesos seguits.', 13], ultra: [5, '5 MVPs en 5 mesos seguits.', 16] },
  doblecara: { plus: [2, '2 MVPs i 2 antis el mateix any.', 0], ultra: [3, '3 MVPs i 3 antis el mateix any.', 0] },
  rata: { plus: [225, '225 entrenos al gym en un any.', 7], ultra: [250, '250 entrenos al gym en un any.', 10] },
  totterreny: { plus: [150, '150 entrenos fora del gym en un any.', 4], ultra: [200, '200 entrenos fora del gym en un any.', 6] },
  ferro: { plus: [5, '5 mesos seguits amb 15+ entrenos al gym.', 6], ultra: [8, '8 mesos seguits amb 15+ entrenos al gym.', 9] },
  superman: { plus: [5, '5 mesos seguits amb 20+ entrenos al gym.', 10], ultra: [8, '8 mesos seguits amb 20+ entrenos al gym.', 14] },
  fantasma: { plus: [2, '2 mesos seguits sense trepitjar el gym.', -6], ultra: [3, '3 mesos seguits sense trepitjar el gym.', -9] },
  reifantasma: { plus: [2, '2 mesos seguits sense cap entreno.', -11], ultra: [3, '3 mesos seguits sense cap entreno.', -15] },
}

const BASE_RULE: Record<string, number> = { icona: 3, nongrata: 3, hattrick: 3, doblecara: 1, rata: 200, totterreny: 100, ferro: 3, superman: 3, fantasma: 1, reifantasma: 1 }

// Els ids es mantenen encara que canviï el nom: les fotos de cartes hi van lligades
export const CARD_DEFS: CardDef[] = BASE_DEFS.flatMap((d) => {
  const rules = LEVEL_RULES[d.id]
  if (!rules) return [d]
  const cursed = d.rarity === 'Maleïda'
  return [
    { ...d, family: d.id },
    ...(['plus', 'ultra'] as const).map((level) => ({
      ...d,
      id: `${d.id}-${level}`,
      name: `${d.name} ${level.toUpperCase()}`,
      how: rules[level][1],
      boost: rules[level][2],
      rarity: cursed ? ('Maleïda' as const) : level === 'plus' ? ('Llegendària' as const) : ('Mítica' as const),
      level,
      family: d.id,
    })),
  ]
})

export interface CardUnlock {
  def: CardDef
  memberId: string
  label: string // mes, any o esdeveniment
  sortKey: string // 'YYYY', 'YYYY-MM' o 'YYYY-MM-DD'
  /** Clau per a la foto de la carta (si no, `${def.id}:${sortKey}`) */
  key?: string
}

/**
 * Mes amb què es calcula la valoració d'una carta: el de la carta (queda "congelada").
 * Les anuals, o les d'abans que hi hagi dades a l'app, fan servir la valoració actual.
 */
export function unlockMonth(db: DB, u: Pick<CardUnlock, 'sortKey'>) {
  if (u.sortKey.length < 7) return undefined
  const firstYear = db.trainings.reduce((y, t) => (t.date.slice(0, 4) < y ? t.date.slice(0, 4) : y), '9999')
  if (u.sortKey.slice(0, 4) < firstYear) return undefined
  return u.sortKey.slice(0, 7)
}

/** Mesos on s'arriba a una ratxa de n mesos seguits (una carta per cada n mesos de ratxa) */
const streakHits = (ids: string[], n: number) => {
  const s = [...new Set(ids)].sort()
  const hits: string[] = []
  let run = 0
  s.forEach((k, i) => {
    run = i > 0 && k === shiftMonth(s[i - 1], 1) ? run + 1 : 1
    if (run % n === 0) hits.push(k)
  })
  return hits
}

export function unlockedCards(db: DB): CardUnlock[] {
  const out: CardUnlock[] = []
  const def = (id: string) => CARD_DEFS.find((d) => d.id === id)!
  const push = (id: string, memberId: string, key: string, label?: string) =>
    out.push({ def: def(id), memberId, sortKey: key, label: label ?? (key.length === 7 ? monthLabel(key) : key) })
  /** Base, PLUS i ULTRA d'una família: `need` dona el llindar de cada nivell */
  const levels = (family: string, fn: (need: number, id: string) => void) => {
    fn(BASE_RULE[family], family)
    fn(LEVEL_RULES[family].plus[0], `${family}-plus`)
    fn(LEVEL_RULES[family].ultra[0], `${family}-ultra`)
  }

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
    levels('icona', (n, id) => mvp.length >= n && push(id, m.id, mvp[n - 1].month_id))
    levels('nongrata', (n, id) => anti.length >= n && push(id, m.id, anti[n - 1].month_id))
    levels('hattrick', (n, id) => streakHits(mvpM, n).forEach((k) => push(id, m.id, k)))
    antiM.filter((k) => mvpM.includes(shiftMonth(k, 1))).forEach((k) => push('redempcio', m.id, shiftMonth(k, 1)))

    for (const y of years) {
      const mvpY = mvpM.filter((k) => k.startsWith(y)).length
      const antiY = antiM.filter((k) => k.startsWith(y)).length
      levels('doblecara', (n, id) => mvpY >= n && antiY >= n && push(id, m.id, y))
      const t = yearTotals(db, m.id, Number(y))
      levels('rata', (n, id) => t.gym >= n && push(id, m.id, y))
      if (t.gym >= 100) push('centurio', m.id, y)
      levels('totterreny', (n, id) => t.fora >= n && push(id, m.id, y))
    }

    const gymMonths = (min: number) => trainingMonths.filter((k) => monthTotals(db, m.id, k).gym >= min)
    levels('ferro', (n, id) => streakHits(gymMonths(15), n).forEach((k) => push(id, m.id, k)))
    levels('superman', (n, id) => streakHits(gymMonths(20), n).forEach((k) => push(id, m.id, k)))

    // Fantasmes: només mesos tancats des que es fa servir l'app. Si la ratxa és de Rei, no compta com a Fantasma.
    const ghostable = closed.filter((k) => k >= start)
    const noGym = ghostable.filter((k) => monthTotals(db, m.id, k).gym === 0)
    const nothing = ghostable.filter((k) => {
      const t = monthTotals(db, m.id, k)
      return t.gym + t.fora === 0
    })
    levels('reifantasma', (n, id) => streakHits(nothing, n).forEach((k) => push(id, m.id, k)))
    levels('fantasma', (n, id) => {
      const king = new Set(streakHits(nothing, n))
      streakHits(noGym, n)
        .filter((k) => !king.has(k))
        .forEach((k) => push(id, m.id, k))
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
