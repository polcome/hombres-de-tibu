// Textos del registre d'activitat (només el veu el superadmin)
import type { AuditEntry, DB } from '../types'
import { displayName, memberById } from './stats'
import { monthLabel } from './months'

type Row = Record<string, unknown>
export interface AuditLine {
  who: string
  text: string
  /** Esborrar o tocar coses d'un altre: es marca en vermell */
  danger: boolean
}

const quote = (t: unknown) => `«${String(t ?? '').slice(0, 90)}${String(t ?? '').length > 90 ? '…' : ''}»`

export function describeAudit(db: DB, e: AuditEntry): AuditLine {
  const name = (id: unknown) => (id ? displayName(memberById(db, String(id))) || '¿?' : '¿?')
  const who = e.anonymous ? 'Anònim' : e.actor_id ? name(e.actor_id) : 'Sistema (SQL)'
  const o = (e.old_data ?? {}) as Row
  const n = (e.new_data ?? {}) as Row
  const d = e.op === 'DELETE' ? o : n
  const other = (memberId: unknown) => !!e.actor_id && memberId !== e.actor_id
  const out = (text: string, danger = false): AuditLine => ({ who, text, danger })

  switch (e.tbl) {
    case 'trainings': {
      const what = `${d.kind === 'gym' ? 'gym' : 'fora'} ×${d.count} del ${String(d.date)}${d.baseline ? ' (recompte inicial)' : ''}`
      if (e.op === 'INSERT') return other(d.member_id) ? out(`ha afegit un entreno a ${name(d.member_id)}: ${what}`) : out(`ha apuntat un entreno: ${what}`)
      if (e.op === 'DELETE')
        return other(d.member_id) ? out(`🗑 ha esborrat un entreno de ${name(d.member_id)}: ${what}`, true) : out(`ha tret el seu entreno: ${what}`)
      return out(`ha modificat un entreno de ${name(d.member_id)}: ${what}`, other(d.member_id))
    }
    case 'expedients': {
      const what = `${d.kind === 'merit' ? 'mèrit' : 'falta'} a ${name(d.target_id)} ${quote(d.text)}`
      if (e.op === 'INSERT') return out(`📁 ha obert un expedient${d.author ? ` signat «${d.author}»` : ''}: ${what}`)
      if (e.op === 'DELETE') return e.anonymous ? out(`ha esborrat el seu propi expedient: ${what}`) : out(`🗑 ha esborrat un expedient: ${what}`, true)
      return out(`ha modificat un expedient: ${what}`, true)
    }
    case 'comments': {
      const what = `${d.author ? `de «${d.author}» ` : ''}${quote(d.text)}`
      if (e.op === 'INSERT') return out(`💬 ha comentat un expedient: ${what}`)
      if (e.op === 'DELETE') return e.anonymous ? out(`ha esborrat el seu propi comentari: ${what}`) : out(`🗑 ha esborrat un comentari: ${what}`, true)
      return out(`ha modificat un comentari: ${what}`, true)
    }
    case 'members': {
      if (e.op === 'INSERT') return out(`ha afegit el membre ${String(n.name)}`)
      if (e.op === 'DELETE') return out(`🗑 ha esborrat el membre ${String(o.name)}`, true)
      const m = String(n.name ?? o.name)
      const ch: string[] = []
      let danger = false
      if (o.is_admin !== n.is_admin) ch.push(n.is_admin ? 'li ha donat admin' : "li ha tret l'admin")
      if (o.active !== n.active) {
        ch.push(n.active ? "l'ha activat" : "l'ha desactivat")
        danger ||= !n.active
      }
      if (o.name !== n.name || o.nickname !== n.nickname) ch.push(`li ha canviat el nom (${String(o.name)} → ${String(n.name)})`)
      if (o.photo_url !== n.photo_url) ch.push(n.photo_url ? 'li ha canviat la foto' : 'li ha tret la foto')
      if (o.auth_id !== n.auth_id) {
        if (!n.auth_id) {
          ch.push('li ha reiniciat el compte (contrasenya)')
          danger ||= other(o.id)
        } else return out(`ha activat el seu compte`)
      }
      if (!ch.length) return out(`ha modificat ${m}`)
      return out(`${m}: ${ch.join(', ')}`, danger)
    }
    case 'months': {
      const m = monthLabel(String(d.id))
      if (e.op === 'INSERT') return out(`ha obert el mes ${m}`)
      if (e.op === 'DELETE') return out(`🗑 ha esborrat el mes ${m}`, true)
      const ch: string[] = []
      if (o.status !== n.status) ch.push(n.status === 'voting' ? 'ha obert la votació' : n.status === 'closed' ? 'ha tancat el mes' : 'ha tornat el mes a "en joc"')
      if (o.deadline !== n.deadline) ch.push('ha canviat la data límit')
      if (o.acta !== n.acta) ch.push(n.acta ? "ha canviat l'acta" : "ha tornat a l'acta automàtica")
      return out(`${m}: ${ch.join(', ') || 'canvis'}`)
    }
    case 'awards': {
      const what = `${d.type === 'mvp' ? '🏆 MVP' : '🤡 anti'} de ${monthLabel(String(d.month_id))}: ${name(d.member_id)}`
      return e.op === 'DELETE' ? out(`ha tret ${what}`) : out(`ha posat ${what}`)
    }
    case 'achievements':
      return e.op === 'DELETE'
        ? out(`🗑 ha tret l'èxit «${String(o.event)}» a ${name(o.member_id)}`, true)
        : out(`ha donat l'èxit «${String(n.event)}» (${String(n.kind)}) a ${name(n.member_id)}`)
    case 'card_photos':
      return e.op === 'DELETE' ? out(`ha tret la foto de la carta ${String(o.card_key)} de ${name(o.member_id)}`) : out(`ha posat la foto de la carta ${String(n.card_key)} de ${name(n.member_id)}`)
    case 'voters':
      return e.op === 'DELETE'
        ? out(`🗑 ha esborrat el vot de ${name(o.member_id)} (${monthLabel(String(o.month_id))})`, true)
        : out(`${name(n.member_id)} ha votat (${monthLabel(String(n.month_id))})`)
    default:
      return out(`${e.op} a ${e.tbl}`)
  }
}
