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

type Preset = 'confetti' | 'gold' | 'rain' | 'sparkles' | 'embers' | 'noses' | 'ghosts' | 'dust' | 'rats'
/** Famílies amb escena pròpia abans de la carta (la resta va directa a la carta) */
const SCENES = ['totm', 'antim', 'fantasma', 'reifantasma', 'centurio', 'rata']
const FAMILY_PRESET: Record<string, Preset> = { totm: 'gold', antim: 'noses', fantasma: 'ghosts', reifantasma: 'ghosts', centurio: 'dust', rata: 'rats' }
/** Partícules de la carta final: les PLUS i ULTRA mantenen les seves; la resta, les de la família o del tema */
const presetOf = (def: CardDef, theme: Theme): Preset =>
  def.level === 'ultra' ? 'embers' : def.level === 'plus' ? 'sparkles' : (FAMILY_PRESET[def.family ?? def.id] ?? (theme === 'cursed' ? 'rain' : 'confetti'))
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
  const family = def.family ?? def.id
  const hasScene = SCENES.includes(family)
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

  // Revelació pas a pas: intro → stats → nom → foto → escena de la carta (si en té) → carta
  useEffect(() => {
    if (stage !== 'reveal') return
    const times = hasScene ? [0, 1300, 2700, 3700, 4900, 7900] : [0, 1300, 2700, 3700, 4900]
    const ids = times.map((t, i) => setTimeout(() => setStep(hasScene ? i + 1 : i === 4 ? 6 : i + 1), t))
    return () => ids.forEach(clearTimeout)
  }, [stage, hasScene])
  useEffect(() => {
    if (step === 5 && (family === 'antim' || family === 'centurio')) vibrate(80)
    if (step === 6) vibrate([30, 60, 30])
  }, [step, family])

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
    <div className={`pack-overlay pack-${theme} ${stage === 'cut' && theme === 'cursed' ? 'pack-shake' : ''}`} onClick={() => stage === 'reveal' && step < 6 && setStep(6)}>
      <div className="pack-beams" />
      {stage === 'reveal' && step >= 6 && <Particles preset={presetOf(def, theme)} />}
      {stage === 'reveal' && step === 5 && <CardScene family={family} />}

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

      {stage === 'reveal' && step >= 6 && (
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

/** Escena pròpia de cada família, entre la revelació i la carta */
function CardScene({ family }: { family: string }) {
  const rows = [0, 1, 2, 3, 4]
  switch (family) {
    case 'totm':
      return (
        <div className="scene scene-totm">
          <div className="spot spot-l" />
          <div className="spot spot-r" />
          <div className="scene-big scene-rise">🏆</div>
          <div className="scene-text">TIBU OF THE MONTH</div>
        </div>
      )
    case 'antim':
      return (
        <div className="scene scene-antim">
          <div className="scene-big scene-pop">🤡</div>
          <div className="scene-honk">📯 MEC MEC!</div>
          <div className="scene-text">ANTI-MVP DEL MES</div>
        </div>
      )
    case 'fantasma':
    case 'reifantasma':
      return (
        <div className={`scene scene-ghost ${family === 'reifantasma' ? 'scene-ghostking' : ''}`}>
          <div className="fog fog-1" />
          <div className="fog fog-2" />
          {rows.map((i) => (
            <div key={i} className="ghost-fly" style={{ top: `${12 + i * 17}%`, animationDelay: `${i * 0.35}s`, animationDirection: i % 2 ? 'reverse' : 'normal' }}>
              👻
            </div>
          ))}
          <div className="scene-big scene-float">
            {family === 'reifantasma' && <span className="ghost-crown">👑</span>}👻
          </div>
          <div className="scene-text">{family === 'reifantasma' ? 'EL REI FANTASMA' : 'ON ERES?'}</div>
        </div>
      )
    case 'centurio':
      return (
        <div className="scene scene-centurio">
          <div className="column column-l">🏛️</div>
          <div className="column column-r">🏛️</div>
          <div className="scene-roman">C</div>
          <div className="scene-text">CENT ENTRENOS</div>
        </div>
      )
    case 'rata':
      return (
        <div className="scene scene-rata">
          {rows.map((i) => (
            <div key={i} className="rat-run" style={{ top: `${15 + i * 15}%`, animationDelay: `${i * 0.25}s` }}>
              🐀
            </div>
          ))}
          <div className="scene-big scene-pop">🐀</div>
          <div className="scene-text">GYMRAT</div>
        </div>
      )
    default:
      return null
  }
}

/** Partícules de la carta final segons la família o el tema */
function Particles({ preset }: { preset: Preset }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current!
    const ctx = c.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const W = (c.width = innerWidth * dpr)
    const H = (c.height = innerHeight * dpr)
    const colors: Record<Preset, string[]> = {
      confetti: ['#f5c542', '#ffe08a', '#ff6b9a', '#6be4ff', '#9b7bff', '#5cf28f'],
      gold: ['#f5c542', '#ffe08a', '#fff4c2', '#d9a21b'],
      rain: ['#3a3a44', '#5b1f24', '#8a2b2b', '#1c1c22'],
      sparkles: ['#c9a6ff', '#9b7bff', '#ffffff', '#e5d4ff'],
      embers: ['#ff7a18', '#ffb347', '#ff3d00', '#fff1a8'],
      noses: ['#e8202a', '#ff4b4b', '#c4121b'],
      ghosts: ['#ffffff'],
      dust: ['#e8e4da', '#cfc8b8', '#ffffff', '#a8a294'],
      rats: ['#ffffff'],
    }
    const emojis: Partial<Record<Preset, string[]>> = { ghosts: ['👻'], rats: ['🐀', '🧀', '🏋️'] }
    type P = { x: number; y: number; vx: number; vy: number; s: number; r: number; vr: number; c: string; e?: string; life: number }
    const rnd = (a: number, b: number) => a + Math.random() * (b - a)
    const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]
    const make = (burst: boolean): P => {
      const base = { r: Math.random() * 6, vr: rnd(-0.15, 0.15), c: pick(colors[preset]), life: 1 }
      switch (preset) {
        case 'rain':
          return { ...base, x: rnd(0, W), y: -20 * dpr, vx: -0.5 * dpr, vy: rnd(6, 12) * dpr, s: rnd(1, 3) * dpr }
        case 'embers':
          return { ...base, x: rnd(0, W), y: H + 10, vx: rnd(-1, 1) * dpr, vy: -rnd(2, 6) * dpr, s: rnd(3, 8) * dpr }
        case 'noses':
          return { ...base, x: rnd(0, W), y: -20 * dpr, vx: rnd(-0.5, 0.5) * dpr, vy: rnd(2, 5) * dpr, s: rnd(10, 18) * dpr }
        case 'ghosts':
          return { ...base, e: '👻', x: rnd(0, W), y: H + 30 * dpr, vx: rnd(-0.6, 0.6) * dpr, vy: -rnd(0.8, 2) * dpr, s: rnd(18, 34) * dpr, life: rnd(0.4, 0.9) }
        case 'dust':
          return { ...base, x: rnd(0, W), y: -10 * dpr, vx: rnd(-0.3, 0.3) * dpr, vy: rnd(0.5, 1.6) * dpr, s: rnd(2, 5) * dpr }
        case 'rats':
          return { ...base, e: pick(emojis.rats!), x: rnd(0, W), y: -30 * dpr, vx: rnd(-0.6, 0.6) * dpr, vy: rnd(2, 4) * dpr, s: rnd(20, 30) * dpr }
        default: {
          const a = Math.random() * Math.PI * 2
          const v = (burst ? rnd(6, 16) : rnd(1, 3)) * dpr
          return {
            ...base,
            x: burst ? W / 2 : rnd(0, W),
            y: burst ? H * 0.42 : -20 * dpr,
            vx: burst ? Math.cos(a) * v : rnd(-0.5, 0.5) * dpr,
            vy: burst ? Math.sin(a) * v - 4 * dpr : v,
            s: rnd(4, 9) * dpr,
            vr: rnd(-0.15, 0.15),
          }
        }
      }
    }
    const bursty = preset === 'confetti' || preset === 'gold' || preset === 'sparkles'
    let ps: P[] = bursty ? Array.from({ length: 170 }, () => make(true)) : []
    const rate = preset === 'rain' ? 6 : preset === 'ghosts' || preset === 'rats' ? 0.25 : preset === 'noses' ? 0.6 : 2
    let acc = 0
    let frame = 0
    let raf = 0
    const tick = () => {
      frame++
      ctx.clearRect(0, 0, W, H)
      if (frame < 600 && ps.length < 260) for (acc += rate; acc >= 1; acc--) ps.push(make(false))
      ps = ps.filter((p) => p.y < H + 60 * dpr && p.y > -80 * dpr && p.life > 0)
      for (const p of ps) {
        p.x += p.vx
        p.y += p.vy
        if (bursty) {
          p.vy += 0.18 * dpr
          p.vx *= 0.99
        }
        if (preset === 'noses' && p.y > H - p.s && p.vy > 0) p.vy *= -0.55 // els nassos boten
        if (preset === 'noses') p.vy += 0.15 * dpr
        if (preset === 'embers') p.life -= 0.006
        if (preset === 'ghosts') p.x += Math.sin((frame + p.s) / 25) * 0.8 * dpr
        p.r += p.vr
        ctx.save()
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life))
        ctx.fillStyle = p.c
        ctx.translate(p.x, p.y)
        if (p.e) {
          ctx.font = `${p.s}px serif`
          ctx.fillText(p.e, 0, 0)
        } else if (preset === 'rain') ctx.fillRect(0, 0, p.s, p.s * 8)
        else if (preset === 'embers' || preset === 'sparkles' || preset === 'noses' || preset === 'dust') {
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
  }, [preset])
  return <canvas ref={ref} className="pack-particles" />
}
