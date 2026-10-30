import { Link, useParams } from 'react-router-dom'
import { useStore } from '../store'
import { monthLabel } from '../logic/months'
import { displayName, memberById } from '../logic/stats'
import { aiPrompt, generateActa } from '../logic/acta'
import { appUrl } from './Home'
import { ActaView } from '../components/ActaView'
import { CopyButton, Section, WhatsAppButton } from '../components/ui'

export default function MonthPage() {
  const { id = '' } = useParams()
  const { db } = useStore()
  const month = db.months.find((m) => m.id === id)
  if (!month) return <p>Aquest mes no existeix.</p>
  if (month.status !== 'closed')
    return (
      <Section title={monthLabel(id)}>
        <p>Aquest mes encara no està tancat. Els resultats es publicaran quan l'admin tanqui la votació.</p>
      </Section>
    )

  const acta = month.acta?.trim() || generateActa(db, id)
  const ballots = db.ballots.filter((b) => b.month_id === id)
  const name = (mid: string) => displayName(memberById(db, mid))

  return (
    <div className="stack">
      <Section title={`📜 Acta · ${monthLabel(id)}`}>
        <ActaView text={acta} label={monthLabel(id)} />
        <div className="row wrap">
          <CopyButton text={acta}>📋 Copiar per WhatsApp</CopyButton>
          <WhatsAppButton text={`${acta}\n\n👉 ${appUrl()}#/mes/${id}`}>Enviar al grup</WhatsAppButton>
          <CopyButton text={aiPrompt(db, id)}>🤖 Copiar prompt per a IA</CopyButton>
        </div>
        <p className="muted small">
          "Prompt per a IA": enganxa'l a ChatGPT o Claude i et farà una altra versió de l'acta.
        </p>
      </Section>

      {ballots.length > 0 && (
        <Section title={`🗳️ Vots anònims (${ballots.filter((b) => !b.annulled).length})`}>
          <div className="stack-sm">
            {ballots.map((b, i) => (
              <div key={b.id} className={`ballot ${b.annulled ? 'annulled' : ''}`}>
                <div className="muted small">Papereta #{i + 1} {b.annulled && '· ANUL·LADA'}</div>
                <div>
                  🏆 <b>{name(b.mvp_id)}</b>: {b.mvp_reason}
                </div>
                <div>
                  🤡 <b>{name(b.anti_id)}</b>: {b.anti_reason}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
      <Link to="/palmares">← Palmarès</Link>
    </div>
  )
}
