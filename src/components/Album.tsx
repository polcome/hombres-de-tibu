import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../api'
import { useStore } from '../store'
import type { Member } from '../types'
import { CARD_DEFS, cardKey, displayName, rating, type CardDef, type CardUnlock } from '../logic/stats'
import { CardZoom, unlockProps } from './CardZoom'
import { FifaCard } from './FifaCard'
import { PhotoControls } from './PhotoControls'

/** Pàgines de l'àlbum: una per família de cartes (base + PLUS + ULTRA) i una per als èxits esportius */
export interface AlbumPage {
  key: string
  title: string
  emoji: string
  how: string
  defs: CardDef[]
}

export const ALBUM_PAGES: AlbumPage[] = [
  ...CARD_DEFS.filter((d) => d.auto && !d.level).map((d) => ({
    key: d.id,
    title: d.name,
    emoji: d.emoji,
    how: d.how,
    defs: CARD_DEFS.filter((x) => x.id === d.id || (d.family && x.family === d.family && x.level)),
  })),
  {
    key: 'exits',
    title: 'Èxits esportius',
    emoji: '🏅',
    how: "Les dona l'admin a qui aconsegueix una fita esportiva.",
    defs: CARD_DEFS.filter((d) => !d.auto),
  },
]

export const albumProgress = (unlocks: CardUnlock[], memberId: string) => {
  const got = new Set(unlocks.filter((u) => u.memberId === memberId).map((u) => u.def.id))
  return { got: got.size, total: CARD_DEFS.length, ids: got }
}

const LOCKED: Member = { id: 'locked', slug: 'locked', name: '???', nickname: null, photo_url: null, is_admin: false, active: true }

export function Album({ member, unlocks, onClose }: { member: Member; unlocks: CardUnlock[]; onClose: () => void }) {
  const { db, me } = useStore()
  const [page, setPage] = useState(0)
  const [dir, setDir] = useState<'next' | 'prev'>('next')
  const touch = useRef<{ x: number; y: number } | null>(null)
  const mine = unlocks.filter((u) => u.memberId === member.id)
  const { got, total, ids } = albumProgress(unlocks, member.id)
  const pages = ALBUM_PAGES.length + 1 // + portada
  const r = rating(db, member.id)
  const name = displayName(member)

  const go = (to: number) => {
    if (to < 0 || to >= pages || to === page) return
    setDir(to > page ? 'next' : 'prev')
    setPage(to)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') go(page + 1)
      if (e.key === 'ArrowLeft') go(page - 1)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  })

  const current = page > 0 ? ALBUM_PAGES[page - 1] : null

  return createPortal(
    <div className="album-backdrop" onClick={onClose}>
      <button type="button" className="card-modal-close" onClick={onClose} aria-label="Tancar">
        ✕
      </button>
      <div
        className="album"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          if (!touch.current) return
          const dx = e.changedTouches[0].clientX - touch.current.x
          const dy = e.changedTouches[0].clientY - touch.current.y
          touch.current = null
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(page + (dx < 0 ? 1 : -1))
        }}
      >
        <div key={page} className={`album-page album-${dir}`}>
          {page === 0 ? (
            <div className="album-cover">
              <div className="album-cover-kicker">🦈 Hombres de Tibu · Àlbum oficial</div>
              <h2>Col·lecció de {name}</h2>
              <FifaCard member={member} rating={r} variant={r.tier} size="lg" />
              <div className="album-progress">
                <div className="album-progress-bar">
                  <div style={{ width: `${(got / total) * 100}%` }} />
                </div>
                <b>
                  {got}/{total} cromos
                </b>
              </div>
              <div className="album-index">
                {ALBUM_PAGES.map((p, i) => {
                  const n = p.defs.filter((d) => ids.has(d.id)).length
                  return (
                    <button key={p.key} type="button" className={n ? 'has' : ''} onClick={() => go(i + 1)}>
                      <span>{p.emoji}</span> {p.title}
                      <small>{n ? `${n}/${p.defs.length}` : '🔒'}</small>
                    </button>
                  )
                })}
              </div>
              <p className="muted small center">Llisca o fes servir les fletxes per passar pàgina →</p>
            </div>
          ) : (
            current && (
              <div className="album-sheet">
                <div className="album-sheet-head">
                  <span className="album-sheet-emoji">{current.emoji}</span>
                  <div>
                    <h3>{current.title}</h3>
                    <p className="muted small">{current.how}</p>
                  </div>
                </div>
                <div className={`album-slots ${current.defs.length === 1 ? 'single' : ''}`}>
                  {current.defs.map((d) => {
                    const have = mine.filter((u) => u.def.id === d.id)
                    return (
                      <div key={d.id} className={`album-slot ${have.length ? 'got' : 'empty'} ${d.level ? `slot-${d.level}` : ''}`}>
                        <div className="album-slot-label">
                          {d.level === 'plus' ? '★ PLUS' : d.level === 'ultra' ? '🔥 ULTRA' : d.auto ? 'BASE' : d.name}
                          {have.length > 1 && <span className="album-count">×{have.length}</span>}
                        </div>
                        {have.length === 0 ? (
                          <>
                            <div className="album-locked">
                              <FifaCard member={LOCKED} rating={r} variant={d.variant} level={d.level} title={d.name} emoji={d.emoji} size="sm" photo={null} />
                              <span>🔒</span>
                            </div>
                            <div className="album-slot-how">{d.how}</div>
                          </>
                        ) : (
                          <div className="album-stack">
                            {have.map((u) => (
                              <div key={cardKey(u)} className="card-with-ctl">
                                <CardZoom card={unlockProps(db, u)} def={u.def} photoKey={cardKey(u)}>
                                  <FifaCard {...unlockProps(db, u)} size="sm" />
                                </CardZoom>
                                {me?.is_admin && (
                                  <PhotoControls
                                    compact
                                    removeLabel="Tornar a la foto base"
                                    url={db.cardPhotos.find((p) => p.member_id === member.id && p.card_key === cardKey(u))?.url}
                                    onChange={(img) => api.setCardPhoto(member.id, cardKey(u), img)}
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          )}
          <div className="album-folio">{page === 0 ? '' : `${page} / ${pages - 1}`}</div>
        </div>
        <div className="album-nav">
          <button type="button" className="btn" disabled={page === 0} onClick={() => go(page - 1)} aria-label="Pàgina anterior">
            ‹
          </button>
          <button type="button" className="link" onClick={() => go(0)}>
            {page === 0 ? 'Portada' : '📖 Índex'}
          </button>
          <button type="button" className="btn" disabled={page === pages - 1} onClick={() => go(page + 1)} aria-label="Pàgina següent">
            ›
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
