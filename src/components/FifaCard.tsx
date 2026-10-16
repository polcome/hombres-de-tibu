import { forwardRef } from 'react'
import type { Member } from '../types'
import { STAT_LABELS, displayName, type CardVariant, type Rating } from '../logic/stats'
import { hue } from './Avatar'

interface Props {
  member: Member
  rating: Rating
  variant: CardVariant
  boost?: number
  label?: string
  title?: string
  emoji?: string
  size?: 'sm' | 'md' | 'lg'
  locked?: boolean
}

const TAG: Record<CardVariant, string> = {
  gold: 'OR',
  silver: 'PLATA',
  bronze: 'BRONZE',
  totm: 'TOTM',
  anti: 'ANTI',
  icon: 'ICONA',
  villain: 'NON GRATA',
  legend: 'LLEGENDA',
  bdo: "PILOTA D'OR",
  fang: 'FANG',
  ach: 'ASSOLIMENT',
  ghost: 'FANTASMA',
}

export const FifaCard = forwardRef<HTMLDivElement, Props>(function FifaCard(
  { member, rating, variant, boost = 0, label, title, emoji, size = 'md', locked },
  ref,
) {
  const ovr = Math.max(1, Math.min(99, rating.overall + boost))
  const name = displayName(member)
  return (
    <div ref={ref} className={`fifa fifa-${variant} fifa-${size} ${locked ? 'fifa-locked' : ''}`}>
      <div className="fifa-shine" />
      <div className="fifa-top">
        <div className="fifa-ovr">{ovr}</div>
        <div className="fifa-pos">{TAG[variant]}</div>
        {emoji && <div className="fifa-emoji">{emoji}</div>}
      </div>
      <div className="fifa-photo">
        {member.photo_url ? (
          <img src={member.photo_url} alt={name} crossOrigin="anonymous" />
        ) : (
          <span style={{ background: hue(name) }}>{name.slice(0, 1).toUpperCase()}</span>
        )}
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
