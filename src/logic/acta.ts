import type { DB } from '../types'
import { deMonth, monthLabel } from './months'
import { awardsOf, displayName, fmtTotals, memberById, monthTotals, unlockedCards, winnersOf } from './stats'

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

  // Els mesos sense registre de votants (antics o de prova) no tenen morosos
  if (voterIds.size && morosos.length) {
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

/** Estils per a l'acta amb IA. L'automàtica (en tancar el mes) va rotant: no repeteix estil fins al cap de 2 anys */
const AI_STYLES = [
  "crònica esportiva èpica i exagerada, com un narrador de futbol desfasat",
  "sentència judicial solemne del Tribunal Suprem de Tibu, amb fets provats i condemnes absurdes",
  "documental de natura, com si el grup fossin animals salvatges observats al seu hàbitat (el gimnàs)",
  "notícia d'última hora de telenotícies, amb connexions en directe i testimonis inventats que no aporten fets nous",
  "retransmissió d'un combat de boxa amb presentació a l'americana",
  "llegenda medieval narrada per un trobador, amb herois, traïdors i profecies",
  "informe confidencial dels serveis secrets, amb parts censurades",
  "gala dels Oscars amb discurs d'agraïment i catifa vermella",
  "parte meteorològic on cada membre és un fenomen del temps",
  "previa i post-partit d'un programa de tertúlia esportiva on tothom crida",
  "gala d'expulsió d'un reality show tipus Gran Germà, amb el presentador allargant el suspens",
  "homilia d'una missa solemne, amb lectures, sermó i pregàries pels pecadors del grup",
  "prospecte d'un medicament, amb composició, indicacions, contraindicacions i efectes secundaris",
  "ressenyes de TripAdvisor, amb estrelles i opinions de clients indignats o entusiasmats",
  "conte infantil per anar a dormir, amb moralina final",
  "episodi d'un podcast de true crime, investigant els fets amb misteri i tensió",
  "butlletí oficial del Parlament amb una llei aprovada per votació, articles i disposicions",
  "carta astral i horòscop, on els astres expliquen el que ha passat al grup",
  "subhasta d'art, on els guanyadors són peces de col·lecció que es liciten",
  "tràiler d'una pel·lícula de Hollywood amb veu en off d'«en un món on…»",
  "retransmissió d'una cursa de Fórmula 1, amb boxes, avançaments i sancions",
  "receptari de cuina, amb ingredients, passos de la recepta i emplatat final",
  "partida d'escacs comentada per un gran mestre molt intens",
  "obituari i esquela solemne de la dignitat de l'anti-MVP, amb honors al MVP",
]

/** Estil fix per a cada mes, rotant per la llista */
export function styleFor(monthId: string) {
  const [y, m] = monthId.split('-').map(Number)
  return AI_STYLES[(y * 12 + m) % AI_STYLES.length]
}

/** Prompt per a la IA (automàtica amb Gemini o per enganxar a ChatGPT/Claude) */
export function aiPrompt(db: DB, monthId: string, style = AI_STYLES[Math.floor(Math.random() * AI_STYLES.length)]) {
  const name = (id: string) => displayName(memberById(db, id))
  const { mvp, anti } = winnersOf(db, monthId)
  const ballots = db.ballots.filter((b) => b.month_id === monthId && !b.annulled)
  const exps = db.expedients.filter((e) => e.month_id === monthId)
  const active = db.members.filter((m) => m.active)
  const voterIds = new Set(db.voters.filter((v) => v.month_id === monthId).map((v) => v.member_id))
  const reacts = (id: string) => (db.expedientReactions ?? []).filter((r) => r.expedient_id === id).map((r) => r.emoji)
  const rows = active.map((m) => ({ m, t: monthTotals(db, m.id, monthId) })).sort((a, b) => b.t.gym + b.t.fora - (a.t.gym + a.t.fora))
  const cards = unlockedCards(db).filter((u) => u.sortKey.startsWith(monthId))
  const winnerLine = (list: typeof mvp, type: 'mvp' | 'anti') =>
    list.map((a) => `${name(a.member_id)} (${a.votes != null ? `${a.votes} vots; ` : ''}${awardsOf(db, a.member_id)[type].length}a vegada en total)`).join(' i ') || 'desert'

  return [
    `Ets el cronista oficial de "Los Hombres de Tibu", un grup de ${active.length} amics del gimnàs. Cada mes voten un MVP (el millor) i un anti-MVP (el pitjor), amb un motiu cadascun, i tenen un dossier on s'obren expedients (mèrits i faltes) als companys.`,
    `Escriu l'acta oficial ${deMonth(monthId)} en català col·loquial de Catalunya, molt divertida, original i amb mala llet sana (és tot comèdia entre amics).`,
    `Aquest mes fes-la en format de: ${style}.`,
    '',
    'Instruccions:',
    "- Interpreta i comenta els motius i els expedients amb gràcia: relaciona'ls entre ells, troba-hi el punt còmic, fes servir ironia i exageració. No els copiïs tots literalment: cita'n només algun de molt bo.",
    "- No t'inventis fets nous sobre ningú: només pots exagerar o interpretar el que hi ha aquí sota.",
    "- Deixa ben clar qui és el MVP i qui és l'anti-MVP (si hi ha empat, tots els que surten).",
    '- Format per a WhatsApp: títol amb emoji, negretes amb *un asterisc* a cada costat, paràgrafs curts, emojis amb moderació. Res de markdown amb # ni **.',
    '- Entre 200 i 350 paraules. Acaba amb una signatura del Consell Suprem dels Hombres de Tibu 🦈.',
    "- Respon només amb el text de l'acta.",
    '',
    `MVP: ${winnerLine(mvp, 'mvp')}`,
    `Anti-MVP: ${winnerLine(anti, 'anti')}`,
    // Els mesos antics no tenen registre de votants
    voterIds.size
      ? `Han votat ${voterIds.size} de ${active.length}.${active.some((m) => !voterIds.has(m.id)) ? ` No han votat: ${active.filter((m) => !voterIds.has(m.id)).map(displayName).join(', ')}.` : ''}`
      : '',
    '',
    'Motius de les paperetes (anònimes):',
    ...(ballots.length ? ballots.map((b) => `- MVP per a ${name(b.mvp_id)}: "${b.mvp_reason}" | Anti per a ${name(b.anti_id)}: "${b.anti_reason}"`) : ['- (cap)']),
    '',
    'Expedients del dossier aquest mes:',
    ...(exps.length
      ? exps.map((e) => {
          const r = reacts(e.id)
          const cs = db.comments.filter((c) => c.expedient_id === e.id).map((c) => `"${c.text}"`)
          return `- [${e.kind === 'merit' ? 'MÈRIT' : 'FALTA'}] ${name(e.target_id)}: "${e.text}"${r.length ? ` (reaccions: ${r.join('')})` : ''}${cs.length ? ` · comentaris: ${cs.slice(0, 3).join(', ')}` : ''}`
        })
      : ['- (cap)']),
    '',
    rows.some((x) => x.t.gym + x.t.fora > 0)
      ? `Entrenos del mes (gym i, entre parèntesis, fora): ${rows.map((x) => `${displayName(x.m)} ${fmtTotals(x.t)}`).join(', ')}.`
      : '',
    cards.length ? `Cartes especials guanyades aquest mes: ${cards.map((u) => `${u.def.name} (${name(u.memberId)})`).join(', ')}.` : '',
  ]
    .filter((l, k, a) => l !== '' || a[k - 1] !== '')
    .join('\n')
}

/** Recompte en el format de sempre del WhatsApp */
export function whatsappCount(db: DB, year: number, totals: (id: string) => { gym: number; fora: number }) {
  const lines = db.members.filter((m) => m.active).map((m) => {
    const t = totals(m.id)
    return `${m.name}: ${t.gym}${t.fora ? ` (${t.fora})` : ''}`
  })
  return [`🏋️ Recompte Entrenos ${year}`, ...lines].join('\n')
}
