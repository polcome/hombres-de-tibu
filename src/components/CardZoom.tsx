import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { toPng } from 'html-to-image'
import { FifaCard } from './FifaCard'
import type { DB } from '../types'
import { cardKey, displayName, memberById, photoFor, rating, unlockMonth, type CardDef, type CardUnlock } from '../logic/stats'

type CardProps = Omit<ComponentProps<typeof FifaCard>, 'size' | 'ref'>

interface Props {
  card: CardProps
  def?: CardDef
  children: ReactNode
}

/** Props de la carta d'un assoliment desbloquejat */
export function unlockProps(db: DB, u: CardUnlock): CardProps {
  const m = memberById(db, u.memberId)!
  return {
    member: m,
    rating: rating(db, m.id, unlockMonth(db, u)),
    level: u.def.level,
    variant: u.def.variant,
    boost: u.def.boost,
    label: u.label,
    title: u.def.name,
    emoji: u.def.emoji,
    photo: photoFor(db, m, cardKey(u)),
  }
}

/** Embolcalla una carta: en clicar-la s'obre en gran en un pop-up */
export function CardZoom({ card, def, children }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="card-zoom-trigger" onClick={() => setOpen(true)} aria-label="Veure carta en gran">
        {children}
      </button>
      {open && <CardModal card={card} def={def} onClose={() => setOpen(false)} />}
    </>
  )
}

function CardModal({ card, def, onClose }: { card: CardProps; def?: CardDef; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const download = async () => {
    if (!ref.current) return
    const url = await toPng(ref.current, { pixelRatio: 3, cacheBust: true })
    const a = document.createElement('a')
    a.href = url
    a.download = `${def?.id ?? 'carta'}-${card.member.slug}${card.label ? '-' + card.label.replace(/\s+/g, '-').toLowerCase() : ''}.png`
    a.click()
  }

  return createPortal(
    <div className="modal card-modal" onClick={onClose}>
      <button type="button" className="card-modal-close" onClick={onClose} aria-label="Tancar">
        ✕
      </button>
      <div className="card-modal-body" onClick={(e) => e.stopPropagation()}>
        <div className="card-modal-card">
          <FifaCard ref={ref} {...card} size="xl" />
        </div>
        {def && (
          <div className="card-modal-info">
            <div className="card-modal-title">
              {def.emoji} {def.name} <span className={`rarity rarity-${def.rarity}`}>{def.rarity}</span>
            </div>
            <div className="muted small">
              {def.how}
              {def.boost !== 0 && ` ${def.boost > 0 ? '+' : ''}${def.boost} a la mitjana i a cada estadística.`}
            </div>
            <div className="small">
              Aconseguida per <b>{displayName(card.member)}</b>
              {card.label && <> · {card.label}</>}
            </div>
          </div>
        )}
        <div className="row wrap center">
          <button type="button" className="btn" onClick={download}>
            📥 Descarregar
          </button>
          <Link to={`/jugador/${card.member.slug}`} className="btn" onClick={onClose}>
            👤 Veure perfil
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  )
}
