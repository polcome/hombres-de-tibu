import type { DB, Month } from '../types'

export const MONTH_NAMES = ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre']

const pad = (n: number) => String(n).padStart(2, '0')

export const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
export const monthKey = (iso: string) => iso.slice(0, 7)
export const currentMonthKey = () => monthKey(todayISO())

export function monthLabel(id: string, short = false) {
  const [y, m] = id.split('-').map(Number)
  const name = MONTH_NAMES[m - 1]
  return short ? `${name.slice(0, 3)} ${String(y).slice(2)}` : `${name} ${y}`
}

/** "d'octubre" / "de març" */
export function deMonth(id: string) {
  const name = MONTH_NAMES[Number(id.split('-')[1]) - 1].toLowerCase()
  return /^[aeiouàèéíòóú]/.test(name) ? `d'${name}` : `de ${name}`
}

export function shiftMonth(id: string, delta: number) {
  const [y, m] = id.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export function lastDayOf(id: string) {
  const [y, m] = id.split('-').map(Number)
  return `${id}-${pad(new Date(y, m, 0).getDate())}`
}

/** Mesos transcorreguts de l'any fins a la data (fraccionari) */
export function monthsElapsed(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return m - 1 + d / new Date(y, m, 0).getDate()
}

/** El mes "en joc": l'últim que no està tancat */
export function activeMonth(db: DB): Month | null {
  const open = db.months.filter((m) => m.status !== 'closed')
  return open.length ? open[open.length - 1] : null
}

export const closedMonths = (db: DB) => db.months.filter((m) => m.status === 'closed').sort((a, b) => a.id.localeCompare(b.id))

export function formatDeadline(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleString('ca-ES', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}

export function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'ara mateix'
  if (s < 3600) return `fa ${Math.floor(s / 60)} min`
  if (s < 86400) return `fa ${Math.floor(s / 3600)} h`
  if (s < 86400 * 7) return `fa ${Math.floor(s / 86400)} dies`
  return new Date(iso).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' })
}
