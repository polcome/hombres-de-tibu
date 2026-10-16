import type { Member } from '../types'
import { displayName } from '../logic/stats'

const COLORS = ['#7c3aed', '#2563eb', '#db2777', '#059669', '#d97706', '#dc2626', '#0891b2', '#4f46e5', '#65a30d']

export function hue(s: string) {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0
  return COLORS[Math.abs(h) % COLORS.length]
}

export function Avatar({ member, size = 36 }: { member?: Member | null; size?: number }) {
  const name = displayName(member)
  if (member?.photo_url)
    return <img className="avatar" src={member.photo_url} alt={name} style={{ width: size, height: size }} />
  return (
    <span className="avatar" style={{ width: size, height: size, background: hue(name), fontSize: size * 0.42 }}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  )
}
