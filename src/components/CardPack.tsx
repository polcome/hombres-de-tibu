import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { FifaCard } from './FifaCard'
import { unlockProps } from './CardZoom'
import { api } from '../api'
import { useStore } from '../store'
import { STAT_LABELS, boostedStats, cardKey, displayName, unlockedCards, type CardDef, type StatKey } from '../logic/stats'
import { hue } from './Avatar'

type CardProps = Omit<ComponentProps<typeof FifaCard>, 'size' | 'ref'>
type Theme = 'gold' | 'cursed' | 'plus' | 'ultra'

const themeOf = (def: CardDef): Theme => (def.rarity === 'Maleïda' ? 'cursed' : def.level === 'ultra' ? 'ultra' : def.level === 'plus' ? 'plus' : 'gold')
const vibrate = (p: number | number[]) => navigator.vibrate?.(p)

/**
 * Vigila les cartes del membre que ha entrat: les noves (no vistes) s'obren com un sobre.
 * El primer cop marca com a vistes totes les que ja tenia, perquè només surtin les que guanyi a partir d'ara.
 */
export function PackWatcher() {
  const { db, me } = useStore()
  const [seen, setSeen] = useState<Set<string> | null>(null)

  useEffect(() => {
    setSeen(null)
    if (!me) return
    let alive = true
    api.seenCards().then(
      (keys) => alive && keys && setSeen(new Set(keys)),
      () => {},
    )
    return () => {
      alive = false
    }
  }, [me?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const mine = useMemo(() => (me ? unlockedCards(db).filter((u) => u.memberId === me.id) : []), [db, me])

  // Primera vegada: tot el que ja tenia queda com a vist, sense animació
  useEffect(() => {
    if (!seen || seen.has('__init__')) return
    const keys = [...mine.map(cardKey), '__init__']
    setSeen(new Set(keys))
    api.markCardsSeen(keys).catch(() => {})
  }, [seen, mine])

  if (!seen || !seen.has('__init__')) return null
  const queue = mine.filter((u) => !seen.has(cardKey(u)))
  if (!queue.length) return null
  const u = queue[0]
  return (
    <PackOpening
      key={cardKey(u)}
      card={unlockProps(db, u)}
      def={u.def}
      remaining={queue.length - 1}
      onDone={() => {
        const k = cardKey(u)
        setSeen(new Set([...seen, k]))
        api.markCardsSeen([k]).catch(() => {})
      }}
    />
  )
}

/** Sobre que es talla lliscant el dit i revelació de la carta, estil FIFA */
export function PackOpening({ card, def, remaining = 0, onDone }: { card: CardProps; def: CardDef; remaining?: number; onDone: () => void }) {
  const theme = themeOf(def)
  const nav = useNavigate()
  const [stage, setStage] = useState<'pack' | 'cut' | 'reveal'>('pack')
  const [step, setStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const start = useRef<number | null>(null)
  const packRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const cut = () => {
    if (stage !== 'pack') return
    setProgress(1)
    setStage('cut')
    vibrate(theme === 'cursed' ? [60, 40, 120] : 40)
    setTimeout(() => setStage('reveal'), 750)
  }

  // Revelació pas a pas: intro → stats → nom → foto → carta
  useEffect(() => {
    if (stage !== 'reveal') return
    const times = [0, 1300, 2700, 3700, 4900]
    const ids = times.map((t, i) => setTimeout(() => setStep(i + 1), t))
    return () => ids.forEach(clearTimeout)
  }, [stage])
  useEffect(() => {
    if (step === 5) vibrate([30, 60, 30])
  }, [step])

  const stats = boostedStats(card.rating, card.boost ?? 0, card.focus)
  const ovr = Math.max(1, Math.min(99, card.rating.overall + (card.boost ?? 0)))
  const name = displayName(card.member)
  const photo = card.photo === undefined ? card.member.photo_url : card.photo

  const onMove = (x: number) => {
    if (start.current == null || !packRef.current) return
    const p = Math.max(0, Math.min(1, (x - start.current) / (packRef.current.offsetWidth * 0.7)))
    setProgress(p)
    if (p >= 1) {
      start.current = null
      cut()
    }
  }

  return createPortal(
    <div className={`pack-overlay pack-${theme} ${stage === 'cut' && theme === 'cursed' ? 'pack-shake' : ''}`} onClick={() => stage === 'reveal' && step < 5 && setStep(5)}>
      <div className="pack-beams" />
      {stage === 'reveal' && step >= 5 && <Particles theme={theme} />}

      {stage !== 'reveal' && (
        <div className="pack-stage">
          <div
            ref={packRef}
            className={`pack ${stage === 'cut' ? 'pack-open' : ''}`}
            onPointerDown={(e) => {
              start.current = e.clientX
              ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
            }}
            onPointerMove={(e) => onMove(e.clientX)}
            onPointerUp={() => {
              start.current = null
              if (stage === 'pack') setProgress(0)
            }}
          >
            <div className="pack-top">
              <div className="pack-cutline" style={{ width: `${progress * 100}%` }} />
            </div>
            <div className="pack-body">
              <div className="pack-logo">🦈</div>
              <div className="pack-brand">HOMBRES DE TIBU</div>
              <div className="pack-sub">{theme === 'cursed' ? 'Sobre maleït' : def.level ? `Sobre ${def.level.toUpperCase()}` : 'Sobre especial'}</div>
              <div className="pack-shine" />
            </div>
          </div>
          {stage === 'pack' && (
            <>
              <div className="pack-hint">👉 Llisca el dit per obrir el sobre</div>
              <button type="button" className="link pack-skip" onClick={cut}>
                o toca aquí
              </button>
            </>
          )}
          {stage === 'cut' && <div className="pack-flash" />}
        </div>
      )}

      {stage === 'reveal' && step < 5 && (
        <div className="walkout">
          {step >= 1 && (
            <div className="walkout-intro">
              <div className="walkout-emoji">{def.emoji}</div>
              <span className={`rarity rarity-${def.rarity}`}>{def.rarity}</span>
            </div>
          )}
          {step >= 2 && (
            <div className="walkout-stats">
              <div className="walkout-ovr">{ovr}</div>
              {STAT_LABELS.map(([k, l], i) => (
                <div key={k} className="walkout-stat" style={{ animationDelay: `${i * 0.18}s` }}>
                  <b>{stats[k as StatKey]}</b> {l}
                </div>
              ))}
            </div>
          )}
          {step >= 3 && (
            <div className="walkout-name">
              <div>{name}</div>
              <small>{card.title ?? def.name}</small>
            </div>
          )}
          {step >= 4 && (
            <div className="walkout-photo">{photo ? <img src={photo} alt={name} /> : <span style={{ background: hue(name) }}>{name.slice(0, 1).toUpperCase()}</span>}</div>
          )}
          <div className="walkout-tap muted small">Toca per saltar</div>
        </div>
      )}

      {stage === 'reveal' && step >= 5 && (
        <div className="pack-final" onClick={(e) => e.stopPropagation()}>
          <div className="pack-final-title">{theme === 'cursed' ? '💀 Has rebut una carta maleïda' : '🎉 Nova carta!'}</div>
          <div className="pack-card">
            <FifaCard {...card} size="xl" />
          </div>
          <div className="small center">
            <b>
              {def.emoji} {def.name}
            </b>{' '}
            · {def.how}
          </div>
          <div className="row wrap center">
            <button type="button" className="btn btn-primary" onClick={onDone}>
              {remaining > 0 ? `Següent sobre (${remaining}) →` : 'Genial!'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                onDone()
                nav(`/jugador/${card.member.slug}`)
              }}
            >
              📒 Veure a l'àlbum
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}

/** Partícules segons el sobre: confeti, pluja maleïda, espurnes liles o flames */
function Particles({ theme }: { theme: Theme }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current!
    const ctx = c.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const W = (c.width = innerWidth * dpr)
    const H = (c.height = innerHeight * dpr)
    const colors = {
      gold: ['#f5c542', '#ffe08a', '#ff6b9a', '#6be4ff', '#9b7bff', '#5cf28f'],
      cursed: ['#3a3a44', '#5b1f24', '#8a2b2b', '#1c1c22'],
      plus: ['#c9a6ff', '#9b7bff', '#ffffff', '#e5d4ff'],
      ultra: ['#ff7a18', '#ffb347', '#ff3d00', '#fff1a8'],
    }[theme]
    type P = { x: number; y: number; vx: number; vy: number; s: number; r: number; vr: number; c: string; life: number }
    const make = (burst: boolean): P => {
      const c0 = colors[Math.floor(Math.random() * colors.length)]
      if (theme === 'cursed') return { x: Math.random() * W, y: -20 * dpr, vx: -0.5 * dpr, vy: (6 + Math.random() * 6) * dpr, s: (1 + Math.random() * 2) * dpr, r: 0, vr: 0, c: c0, life: 1 }
      if (theme === 'ultra') return { x: Math.random() * W, y: H + 10, vx: (Math.random() - 0.5) * 2 * dpr, vy: -(2 + Math.random() * 4) * dpr, s: (3 + Math.random() * 5) * dpr, r: 0, vr: 0, c: c0, life: 1 }
      const a = Math.random() * Math.PI * 2
      const v = (burst ? 6 + Math.random() * 10 : 1 + Math.random() * 2) * dpr
      return {
        x: burst ? W / 2 : Math.random() * W,
        y: burst ? H * 0.42 : -20 * dpr,
        vx: burst ? Math.cos(a) * v : (Math.random() - 0.5) * dpr,
        vy: burst ? Math.sin(a) * v - 4 * dpr : v,
        s: (4 + Math.random() * 5) * dpr,
        r: Math.random() * 6,
        vr: (Math.random() - 0.5) * 0.3,
        c: c0,
        life: 1,
      }
    }
    let ps: P[] = theme === 'gold' || theme === 'plus' ? Array.from({ length: 160 }, () => make(true)) : []
    let frame = 0
    let raf = 0
    const tick = () => {
      frame++
      ctx.clearRect(0, 0, W, H)
      if (frame < 600 && ps.length < 260) for (let i = 0; i < (theme === 'cursed' ? 6 : 2); i++) ps.push(make(false))
      ps = ps.filter((p) => p.y < H + 40 && p.y > -60 * dpr && p.life > 0)
      for (const p of ps) {
        p.x += p.vx
        p.y += p.vy
        if (theme === 'gold' || theme === 'plus') {
          p.vy += 0.18 * dpr
          p.vx *= 0.99
          p.r += p.vr
        }
        if (theme === 'ultra') p.life -= 0.006
        ctx.save()
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life))
        ctx.fillStyle = p.c
        ctx.translate(p.x, p.y)
        if (theme === 'cursed') ctx.fillRect(0, 0, p.s, p.s * 8)
        else if (theme === 'ultra' || theme === 'plus') {
          ctx.beginPath()
          ctx.arc(0, 0, p.s / 2, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.rotate(p.r)
          ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2)
        }
        ctx.restore()
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [theme])
  return <canvas ref={ref} className="pack-particles" />
}
