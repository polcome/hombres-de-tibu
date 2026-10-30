import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { toPng } from 'html-to-image'
import { FifaCard } from './FifaCard'
import { PhotoControls } from './PhotoControls'
import { api } from '../api'
import { useStore } from '../store'
import type { DB } from '../types'
import { cardKey, displayName, focusOf, statLabel, memberById, photoFor, rating, unlockMonth, type CardDef, type CardUnlock } from '../logic/stats'

type CardProps = Omit<ComponentProps<typeof FifaCard>, 'size' | 'ref'>

interface Props {
  card: CardProps
  def?: CardDef
  /** Clau de la foto d'una carta especial (`card_photos`). Sense clau és la carta base i es canvia la foto base. */
  photoKey?: string
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
    focus: focusOf(u.def),
    label: u.label,
    title: u.def.name,
    emoji: u.def.emoji,
    photo: photoFor(db, m, cardKey(u)),
  }
}

/** Embolcalla una carta: en clicar-la s'obre en gran en un pop-up */
export function CardZoom({ card, def, photoKey, children }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="card-zoom-trigger" onClick={() => setOpen(true)} aria-label="Veure carta en gran">
        {children}
      </button>
      {open && <CardModal card={card} def={def} photoKey={photoKey} onClose={() => setOpen(false)} />}
    </>
  )
}

function CardModal({ card, def, photoKey, onClose }: { card: CardProps; def?: CardDef; photoKey?: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const { db, me } = useStore()
  const m = card.member
  // Foto de carta especial: només admins. Foto base: admins i el mateix membre.
  const canPhoto = photoKey ? me?.is_admin : me?.is_admin || me?.id === m.id
  const ownPhoto = photoKey ? db.cardPhotos.find((p) => p.member_id === m.id && p.card_key === photoKey)?.url : m.photo_url

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
              {def.boost !== 0 && ` ${def.boost > 0 ? '+' : ''}${def.boost} a la mitjana (sobretot a ${focusOf(def).map(statLabel).join(' i ')}).`}
            </div>
            <div className="small">
              Aconseguida per <b>{displayName(card.member)}</b>
              {card.label && <> · {card.label}</>}
            </div>
          </div>
        )}
        {canPhoto && (
          <div className="card-modal-photo">
            <div className="muted small">{photoKey ? '📷 Foto d\'aquesta carta (només admins)' : '📷 Foto de la carta base'}</div>
            <PhotoControls
              url={ownPhoto}
              compact
              onChange={(img) => (photoKey ? api.setCardPhoto(m.id, photoKey, img) : api.setPhoto(m.id, img))}
            />
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
