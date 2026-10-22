import { forwardRef } from 'react'
import type { Member } from '../types'
import { STAT_LABELS, displayName, type CardVariant, type Rating } from '../logic/stats'
import { hue } from './Avatar'
import { CardArt } from './CardArt'
import './fifa.css'

interface Props {
  member: Member
  rating: Rating
  variant: CardVariant
  boost?: number
  label?: string
  title?: string
  emoji?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  locked?: boolean
  /** Foto específica d'aquesta carta (si no, la foto base) */
  photo?: string | null
}

const TAG: Record<CardVariant, string> = {
  goldshiny: 'OR ✦',
  gold: 'OR',
  silvershiny: 'PLATA ✦',
  silver: 'PLATA',
  bronze: 'BRONZE',
  totm: 'TOTM',
  anti: 'RIOTA',
  icon: 'ICONA',
  antiicon: 'ANTI-ICONA',
  hattrick: 'HAT-TRICK',
  bdo: "PILOTA D'OR",
  beach: 'PLATJA',
  redemption: 'REDEMPTION',
  twoface: 'DOBLE CARA',
  gymrat: 'GYMRAT',
  centurion: 'CENTURIÓ',
  offroad: '4x4',
  ironman: 'IRONMAN',
  superman: 'SUPERMAN',
  ghost: 'FANTASMA',
  ghostking: 'REI FANTASMA',
  ascens: 'ASCENS',
  mitja: 'MITJA',
  marato: 'MARATÓ',
  hyrox: 'HYROX',
}

export const FifaCard = forwardRef<HTMLDivElement, Props>(function FifaCard(
  { member, rating, variant, boost = 0, label, title, emoji, size = 'md', locked, photo },
  ref,
) {
  const ovr = Math.max(1, Math.min(99, rating.overall + boost))
  const name = displayName(member)
  const src = photo === undefined ? member.photo_url : photo
  return (
    <div ref={ref} className={`fifa fifa-${variant} fifa-${size} ${locked ? 'fifa-locked' : ''}`}>
      <CardArt variant={variant} layer="bg" />
      <div className="fifa-photo">
        {src ? (
          <img src={src} alt={name} crossOrigin="anonymous" />
        ) : (
          <span style={{ background: hue(name) }}>{name.slice(0, 1).toUpperCase()}</span>
        )}
      </div>
      <CardArt variant={variant} layer="fg" />
      <div className="fifa-top">
        <div className="fifa-ovr">{ovr}</div>
        <div className="fifa-pos">{TAG[variant]}</div>
        {emoji && <div className="fifa-emoji">{emoji}</div>}
      </div>
      <div className="fifa-name">{name}</div>
      {title && <div className="fifa-title">{title}</div>}
      <div className="fifa-stats">
        {STAT_LABELS.map(([k, l]) => (
          <div key={k}>
            <b>{rating[k] as number}</b> {l}
          </div>
        ))}
      </div>
      {label && <div className="fifa-label">{label}</div>}
    </div>
  )
})
