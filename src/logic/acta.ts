import type { DB } from '../types'
import { deMonth, monthLabel } from './months'
import { awardsOf, displayName, fmtTotals, memberById, monthTotals, winnersOf } from './stats'

// Random amb llavor: la mateixa acta surt igual cada cop que es genera
function rng(seed: string) {
  let h = 2166136261
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

const MVP_INTROS = [
  'Amb la força d\'un press banca de 140kg, el Consell ha parlat:',
  'Que sonin les campanes, que plori la mare, que se n\'assabenti el barri:',
  'Després d\'una deliberació més tensa que una sèrie de sentadilles al fallo:',
  'Ni Cristiano en els seus millors anys. El poble ha triat:',
  'Amb el cor a la mà i la proteïna a l\'altra, proclamem:',
]
const ANTI_INTROS = [
  'I ara, el moment que tothom esperava. Amb tota la vergonya del món:',
  'Que tremoli. Que s\'amagui. Que canviï de número. L\'anti del mes és:',
  'Ni el seu entrenador personal el defensaria. El poble ha condemnat:',
  'La comunitat s\'ha pronunciat, i no ha estat amable:',
  'Amb la mateixa delicadesa que un dia de cames sense escalfar:',
]
const MVP_CLOSERS = [
  'Que el seu nom s\'escrigui amb lletres d\'or al vestidor.',
  'El grup s\'inclina. Ara no et vinguis amunt.',
  'Edit de cara obligatori, si us plau.',
  'Gaudeix-ho, que d\'aquí a un mes ningú se\'n recordarà.',
]
const ANTI_CLOSERS = [
  'S\'espera un comunicat de disculpa abans de divendres.',
  'L\'edit de la teva cara ja està en producció.',
  'Recordatori: aquest mes encara et pots redimir. O no.',
  'Que serveixi d\'exemple per a les futures generacions.',
]

export function generateActa(db: DB, monthId: string) {
  const r = rng(monthId)
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)]
  const name = (id: string) => displayName(memberById(db, id))
  const { mvp, anti } = winnersOf(db, monthId)
  const ballots = db.ballots.filter((b) => b.month_id === monthId && !b.annulled)
  const voterIds = new Set(db.voters.filter((v) => v.month_id === monthId).map((v) => v.member_id))
  const active = db.members.filter((m) => m.active)
  const morosos = active.filter((m) => !voterIds.has(m.id))

  const L: string[] = []
  L.push(`📜 *ACTA OFICIAL · ${monthLabel(monthId).toUpperCase()}*`)
  L.push(`_Los Hombres de Tibu · Consell Suprem_`)
  L.push('')
  if (ballots.length) L.push(`Reunit el Consell amb ${ballots.length} vots vàlids de ${active.length} membres, es fa públic el veredicte del mes ${deMonth(monthId)}:`)
  else L.push(`Es fa públic el veredicte del mes ${deMonth(monthId)}:`)
  L.push('')

  const section = (title: string, list: typeof mvp, intro: string, closer: string, reasonKey: 'mvp' | 'anti') => {
    L.push(title)
    if (!list.length) {
      L.push('Desert. Ningú ha estat prou digne (o prou indigne).')
      L.push('')
      return
    }
    L.push(intro)
    for (const a of list) {
      const total = awardsOf(db, a.member_id)[reasonKey].length
      L.push(`👉 *${name(a.member_id).toUpperCase()}*${a.votes != null ? ` (${a.votes} vot${a.votes === 1 ? '' : 's'})` : ''} · ${reasonKey === 'mvp' ? 'MVP' : 'anti'} número ${total}`)
      const reasons = ballots
        .filter((b) => (reasonKey === 'mvp' ? b.mvp_id : b.anti_id) === a.member_id)
        .map((b) => (reasonKey === 'mvp' ? b.mvp_reason : b.anti_reason))
      if (reasons.length) {
        L.push('Motius del poble:')
        reasons.slice(0, 4).forEach((x) => L.push(`  › "${x}"`))
      }
    }
    if (list.length > 1) L.push('Empat! Es reparteixen la glòria (o la vergonya).')
    L.push(closer)
    L.push('')
  }
  section('🏆 *MVP DEL MES*', mvp, pick(MVP_INTROS), pick(MVP_CLOSERS), 'mvp')
  section('🤡 *ANTI-MVP DEL MES*', anti, pick(ANTI_INTROS), pick(ANTI_CLOSERS), 'anti')

  // Mencions especials (només si hi ha entrenos registrats a l'app aquest mes)
  const rows = active.map((m) => ({ m, t: monthTotals(db, m.id, monthId) })).map((x) => ({ ...x, sum: x.t.gym + x.t.fora }))
  if (rows.some((x) => x.sum > 0)) {
    const top = [...rows].sort((a, b) => b.t.gym - a.t.gym || b.sum - a.sum)[0]
    const ghosts = rows.filter((x) => x.sum === 0)
    L.push('🏋️ *MENCIONS ESPECIALS*')
    L.push(`🐀 Rata del mes: ${displayName(top.m)} amb ${fmtTotals(top.t)} entrenos`)
    if (ghosts.length) L.push(`👻 Fantasmes (0 entrenos): ${ghosts.map((x) => displayName(x.m)).join(', ')}`)
    L.push('')
  }

  if (ballots.length && morosos.length) {
    L.push(`🐌 *Morosos que no han votat:* ${morosos.map(displayName).join(', ')}. Ho tindrem en compte.`)
    L.push('')
  }

  const lider = [...active]
    .map((m) => ({ m, n: awardsOf(db, m.id).mvp.length }))
    .sort((a, b) => b.n - a.n)
  if (lider[0]?.n) L.push(`📊 Lidera el palmarès: ${displayName(lider[0].m)} amb ${lider[0].n} MVP${lider[0].n > 1 ? 's' : ''}.`)
  L.push('')
  L.push('Signat: El Consell Suprem dels Hombres de Tibu 🦈')
  return L.join('\n')
}

/** Prompt per enganxar a ChatGPT/Claude i que faci una acta més elaborada */
export function aiPrompt(db: DB, monthId: string) {
  const name = (id: string) => displayName(memberById(db, id))
  const { mvp, anti } = winnersOf(db, monthId)
  const ballots = db.ballots.filter((b) => b.month_id === monthId && !b.annulled)
  const exps = db.expedients.filter((e) => e.month_id === monthId)
  return [
    `Ets el cronista oficial d'un grup d'amics del gimnàs anomenat "Los Hombres de Tibu". Cada mes votem un MVP i un anti-MVP. Escriu, en català col·loquial i en to èpic, sarcàstic i molt divertit (estil crònica esportiva exagerada), l'acta proclamant els guanyadors ${deMonth(monthId)}. Format per a WhatsApp (negretes amb *asteriscs*, emojis), màxim 250 paraules. No t'inventis fets: fes servir només aquests.`,
    '',
    `MVP: ${mvp.map((a) => `${name(a.member_id)} (${a.votes ?? '?'} vots)`).join(', ') || 'desert'}`,
    `Anti-MVP: ${anti.map((a) => `${name(a.member_id)} (${a.votes ?? '?'} vots)`).join(', ') || 'desert'}`,
    '',
    'Motius dels vots:',
    ...ballots.map((b) => `- MVP ${name(b.mvp_id)}: ${b.mvp_reason} | Anti ${name(b.anti_id)}: ${b.anti_reason}`),
    '',
    'Expedients del mes:',
    ...exps.map((e) => `- [${e.kind === 'merit' ? 'MÈRIT' : 'FALTA'}] ${name(e.target_id)}: ${e.text}`),
  ].join('\n')
}

/** Recompte en el format de sempre del WhatsApp */
export function whatsappCount(db: DB, year: number, totals: (id: string) => { gym: number; fora: number }) {
  const lines = db.members.filter((m) => m.active).map((m) => {
    const t = totals(m.id)
    return `${m.name}: ${t.gym}${t.fora ? ` (${t.fora})` : ''}`
  })
  return [`🏋️ Recompte Entrenos ${year}`, ...lines].join('\n')
}
