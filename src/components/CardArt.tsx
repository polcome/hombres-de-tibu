import { useId, type ReactNode } from 'react'
import type { CardVariant } from '../logic/stats'

/*
 * Plantilles de les cartes. Cada disseny és un SVG (viewBox 200×286) que fa de
 * fons i forma de la carta ('bg') i, si cal, ornaments per sobre de la foto ('fg').
 * Zona de la foto: x 62–162, y 32–132 (centre 112, 82).
 */

const W = 200
const H = 286

const SHAPES = {
  shield:
    'M100 3 C128 3 158 8 189 16 Q195 18 195 24 L195 232 Q195 244 184 250 L100 283 L16 250 Q5 244 5 232 L5 24 Q5 18 11 16 C42 8 72 3 100 3 Z',
  shieldIn:
    'M100 10 C127 10 155 14 184 22 Q188 23 188 28 L188 229 Q188 239 179 244 L100 275 L21 244 Q12 239 12 229 L12 28 Q12 23 16 22 C45 14 73 10 100 10 Z',
  icon: 'M100 1 L118 9 C142 10 166 13 190 18 Q195 19 195 25 L195 230 Q195 243 183 249 L100 284 L17 249 Q5 243 5 230 L5 25 Q5 19 10 18 C34 13 58 10 82 9 Z',
  iconIn:
    'M100 9 L115 15 C138 16 161 19 184 24 Q188 25 188 30 L188 227 Q188 238 178 243 L100 276 L22 243 Q12 238 12 227 L12 30 Q12 25 16 24 C39 19 62 16 85 15 Z',
  ghost:
    'M100 5 C158 5 193 22 193 62 L193 262 Q182 250 170 262 Q158 274 146 262 Q134 250 122 262 Q110 274 100 262 Q88 250 76 262 Q64 274 52 262 Q40 250 28 262 Q18 272 7 262 L7 62 C7 22 42 5 100 5 Z',
  bib: 'M14 6 H186 Q195 6 195 15 V271 Q195 280 186 280 H14 Q5 280 5 271 V15 Q5 6 14 6 Z',
  plate: 'M22 4 H178 L196 22 V264 L178 282 H22 L4 264 V22 Z',
  plateIn: 'M25 11 H175 L189 25 V261 L175 275 H25 L11 261 V25 Z',
}

type Shape = keyof typeof SHAPES

const SHAPE_OF: Partial<Record<CardVariant, Shape>> = {
  icon: 'icon',
  antiicon: 'icon',
  ghost: 'ghost',
  ghostking: 'ghost',
  mitja: 'bib',
  marato: 'bib',
  hyrox: 'plate',
}

const STARS: [number, number, number][] = [
  [30, 150, 3],
  [176, 44, 2.5],
  [24, 200, 2],
  [178, 168, 3.5],
  [40, 30, 2],
  [166, 210, 2],
  [150, 24, 1.8],
  [18, 110, 1.6],
  [186, 112, 2.2],
]
const star = (x: number, y: number, r: number, fill: string, key?: number | string) => (
  <path
    key={key}
    d={`M${x} ${y - r * 2.4} L${x + r * 0.6} ${y - r * 0.6} L${x + r * 2.4} ${y} L${x + r * 0.6} ${y + r * 0.6} L${x} ${y + r * 2.4} L${x - r * 0.6} ${y + r * 0.6} L${x - r * 2.4} ${y} L${x - r * 0.6} ${y - r * 0.6} Z`}
    fill={fill}
  />
)

/** Branca de llorer (costat esquerre; es fa mirall per a la dreta) */
function laurel(cx: number, cy: number, r: number, color: string, opacity = 1, broken = false) {
  const leaves: ReactNode[] = []
  for (let i = 0; i < 9; i++) {
    if (broken && (i === 3 || i === 6)) continue
    const a = (200 + i * 15) * (Math.PI / 180)
    const x = cx + r * Math.cos(a)
    const y = cy + r * Math.sin(a)
    const rot = (a * 180) / Math.PI + 90 + 25
    leaves.push(<ellipse key={i} cx={x} cy={y} rx={3.2} ry={8} transform={`rotate(${rot} ${x} ${y})`} fill={color} />)
  }
  return (
    <g opacity={opacity}>
      <g>{leaves}</g>
      <g transform={`translate(${cx * 2} 0) scale(-1 1)`}>{leaves}</g>
    </g>
  )
}

function rays(cx: number, cy: number, n: number, color: string, opacity: number, len = 260, width = 6) {
  return (
    <g opacity={opacity}>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2
        const a1 = a - (width * Math.PI) / 360
        const a2 = a + (width * Math.PI) / 360
        return (
          <path
            key={i}
            d={`M${cx} ${cy} L${cx + len * Math.cos(a1)} ${cy + len * Math.sin(a1)} L${cx + len * Math.cos(a2)} ${cy + len * Math.sin(a2)} Z`}
            fill={color}
          />
        )
      })}
    </g>
  )
}

const football = (x: number, y: number, r: number, key?: number) => (
  <g key={key}>
    <circle cx={x} cy={y} r={r} fill="#fff" stroke="#111" strokeWidth={r * 0.12} />
    <path
      d={`M${x} ${y - r * 0.45} L${x + r * 0.43} ${y - r * 0.14} L${x + r * 0.27} ${y + r * 0.36} L${x - r * 0.27} ${y + r * 0.36} L${x - r * 0.43} ${y - r * 0.14} Z`}
      fill="#111"
    />
  </g>
)

interface Ctx {
  id: (s: string) => string
  url: (s: string) => string
  shape: string
  inner: string
}

/** Fons per a cada disseny */
const BG: Record<CardVariant, (c: Ctx) => ReactNode> = {
  // ---------- Bàsiques: senzilles ----------
  gold: (c) => base(c, '#fbe9a1', '#d4a53a', '#9c7317'),
  silver: (c) => base(c, '#f4f6f9', '#b9c1ca', '#7d8792'),
  bronze: (c) => base(c, '#f0c49b', '#b8743f', '#7c461f'),

  // ---------- MVP del mes ----------
  totm: (c) => (
    <>
      <defs>
        <linearGradient id={c.id('g')} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#1b2f6e" />
          <stop offset="1" stopColor="#050a1f" />
        </linearGradient>
        <radialGradient id={c.id('glow')} cx="0.56" cy="0.3" r="0.45">
          <stop offset="0" stopColor="#f5c84c" stopOpacity="0.55" />
          <stop offset="1" stopColor="#f5c84c" stopOpacity="0" />
        </radialGradient>
        <clipPath id={c.id('clip')}>
          <path d={c.shape} />
        </clipPath>
      </defs>
      <path d={c.shape} fill={c.url('g')} />
      <path d={c.shape} fill={c.url('glow')} />
      <g clipPath={c.url('clip')}>{rays(112, 82, 24, '#f5c84c', 0.07)}</g>
      {STARS.map(([x, y, r], i) => star(x, y, r, '#f5c84c', i))}
      <path d={c.inner} fill="none" stroke="#f5c84c" strokeWidth="2.5" />
      <path d={c.shape} fill="none" stroke="#fff3c4" strokeWidth="1" opacity="0.6" />
      <text x="100" y="244" textAnchor="middle" fontSize="38" fontWeight="900" fill="#f5c84c" opacity="0.08" letterSpacing="4">
        TOTM
      </text>
    </>
  ),

  // ---------- Anti del mes: carpa de circ ----------
  anti: (c) => (
    <>
      <defs>
        <linearGradient id={c.id('dark')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.25" stopColor="#1a0505" stopOpacity="0" />
          <stop offset="0.75" stopColor="#1a0505" stopOpacity="0.92" />
        </linearGradient>
        <clipPath id={c.id('clip')}>
          <path d={c.shape} />
        </clipPath>
      </defs>
      <g clipPath={c.url('clip')}>
        <rect width={W} height={H} fill="#f3e3c3" />
        {Array.from({ length: 12 }, (_, i) => {
          const a1 = Math.PI * (0.05 + (i / 12) * 0.9)
          const a2 = Math.PI * (0.05 + ((i + 0.5) / 12) * 0.9)
          return (
            <path
              key={i}
              d={`M100 -10 L${100 + 400 * Math.cos(a1)} ${-10 + 400 * Math.sin(a1)} L${100 + 400 * Math.cos(a2)} ${-10 + 400 * Math.sin(a2)} Z`}
              fill="#c8102e"
            />
          )
        })}
        {/* vora de la carpa */}
        <path d="M0 0 H200 V14 Q187 26 175 14 Q162 26 150 14 Q137 26 125 14 Q112 26 100 14 Q87 26 75 14 Q62 26 50 14 Q37 26 25 14 Q12 26 0 14 Z" fill="#8a0b1f" />
        <rect width={W} height={H} fill={c.url('dark')} />
        {[
          [30, 60, '#f5c84c'],
          [170, 70, '#2bb3ff'],
          [22, 180, '#7dff6b'],
          [182, 150, '#f5c84c'],
          [45, 230, '#ff7ad9'],
          [160, 235, '#2bb3ff'],
        ].map(([x, y, f], i) => (
          <rect key={i} x={x as number} y={y as number} width="5" height="9" rx="1" fill={f as string} transform={`rotate(${i * 37} ${x} ${y})`} />
        ))}
      </g>
      <path d={c.inner} fill="none" stroke="#f5c84c" strokeWidth="1.5" strokeDasharray="4 3" />
    </>
  ),

  // ---------- Icona: estil icones del FIFA ----------
  icon: (c) => (
    <>
      <defs>
        <linearGradient id={c.id('g')} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#fffdf5" />
          <stop offset="0.6" stopColor="#f3e8c8" />
          <stop offset="1" stopColor="#e2cf98" />
        </linearGradient>
        <linearGradient id={c.id('gold')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f9e08b" />
          <stop offset="0.5" stopColor="#b8892a" />
          <stop offset="1" stopColor="#f3d16b" />
        </linearGradient>
        <clipPath id={c.id('clip')}>
          <path d={c.shape} />
        </clipPath>
      </defs>
      <path d={c.shape} fill={c.url('g')} />
      <g clipPath={c.url('clip')}>{rays(112, 82, 36, '#c9a24a', 0.12)}</g>
      {laurel(112, 86, 62, '#c9a24a', 0.9)}
      <path d={c.shape} fill="none" stroke={c.url('gold')} strokeWidth="5" />
      <path d={c.inner} fill="none" stroke={c.url('gold')} strokeWidth="1.6" />
      <path d="M100 14 L106 20 L100 26 L94 20 Z" fill={c.url('gold')} />
      <path d="M40 236 H160" stroke={c.url('gold')} strokeWidth="1" />
    </>
  ),

  // ---------- Anti-Icona: la icona maleïda ----------
  antiicon: (c) => (
    <>
      <defs>
        <linearGradient id={c.id('g')} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#2a0b35" />
          <stop offset="1" stopColor="#060108" />
        </linearGradient>
        <radialGradient id={c.id('glow')} cx="0.56" cy="0.3" r="0.5">
          <stop offset="0" stopColor="#ff2a4f" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ff2a4f" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d={c.shape} fill={c.url('g')} />
      <path d={c.shape} fill={c.url('glow')} />
      {laurel(112, 86, 62, '#7a1020', 0.9, true)}
      {/* esquerdes */}
      <path d="M150 8 L140 40 L152 60 L138 95 M140 40 L122 52 M30 150 L48 170 L40 196 L58 230 M48 170 L70 176" stroke="#ff2a4f" strokeWidth="1.2" fill="none" opacity="0.6" />
      <path d={c.shape} fill="none" stroke="#6b0f1f" strokeWidth="5" />
      <path d={c.inner} fill="none" stroke="#ff2a4f" strokeWidth="1.2" strokeDasharray="14 4 3 4" />
    </>
  ),

  // ---------- Hat-trick: gespa i tres pilotes ----------
  hattrick: (c) => (
    <>
      <defs>
        <clipPath id={c.id('clip')}>
          <path d={c.shape} />
        </clipPath>
        <linearGradient id={c.id('shade')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <g clipPath={c.url('clip')}>
        {Array.from({ length: 10 }, (_, i) => (
          <rect key={i} x="0" y={i * 29} width={W} height="29" fill={i % 2 ? '#1f7a33' : '#25913d'} />
        ))}
        <circle cx="100" cy="286" r="58" fill="none" stroke="#fff" strokeWidth="2" opacity="0.5" />
        <path d="M0 228 H200" stroke="#fff" strokeWidth="2" opacity="0.5" />
        <rect x="55" y="-2" width="90" height="34" fill="none" stroke="#fff" strokeWidth="2" opacity="0.5" />
        <rect width={W} height={H} fill={c.url('shade')} />
        <path d="M150 -5 L118 120 L140 118 L104 260 L176 92 L150 96 L178 -5 Z" fill="#ffe14d" opacity="0.22" />
      </g>
      {[0, 1, 2].map((i) => football(168, 36 + i * 22, 8, i))}
      <path d={c.inner} fill="none" stroke="#ffe14d" strokeWidth="2" />
    </>
  ),

  // ---------- Pilota d'Or ----------
  bdo: (c) => (
    <>
      <defs>
        <radialGradient id={c.id('g')} cx="0.56" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#fff8d0" />
          <stop offset="0.45" stopColor="#f2c230" />
          <stop offset="1" stopColor="#9a6a00" />
        </radialGradient>
        <radialGradient id={c.id('ball')} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fffbe0" />
          <stop offset="0.5" stopColor="#f0b90b" />
          <stop offset="1" stopColor="#8a5a00" />
        </radialGradient>
        <clipPath id={c.id('clip')}>
          <path d={c.shape} />
        </clipPath>
      </defs>
      <path d={c.shape} fill={c.url('g')} />
      <g clipPath={c.url('clip')}>
        {rays(112, 82, 30, '#fff6c0', 0.35)}
        <circle cx="112" cy="84" r="64" fill={c.url('ball')} opacity="0.55" />
        <path d="M60 60 Q112 40 164 60 M52 98 Q112 120 172 98 M112 20 Q90 84 112 148" stroke="#8a5a00" strokeWidth="1.5" fill="none" opacity="0.35" />
      </g>
      {STARS.slice(0, 6).map(([x, y, r], i) => star(x, y, r * 1.2, '#fff', i))}
      <path d={c.shape} fill="none" stroke="#fff" strokeWidth="3" />
      <path d={c.inner} fill="none" stroke="#8a5a00" strokeWidth="1.2" />
    </>
  ),

  // ---------- Pilota de Platja: la vergonya de l'any ----------
  beach: (c) => (
    <>
      <defs>
        <linearGradient id={c.id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5ec8ff" />
          <stop offset="1" stopColor="#c7efff" />
        </linearGradient>
        <clipPath id={c.id('clip')}>
          <path d={c.shape} />
        </clipPath>
        <clipPath id={c.id('ballclip')}>
          <circle cx="112" cy="86" r="66" />
        </clipPath>
      </defs>
      <g clipPath={c.url('clip')}>
        <rect width={W} height={H} fill={c.url('sky')} />
        <circle cx="30" cy="34" r="16" fill="#ffd93b" />
        {rays(30, 34, 12, '#ffd93b', 0.6, 30, 8)}
        {/* pilota de platja gegant */}
        <g clipPath={c.url('ballclip')} opacity="0.95">
          {['#ff4757', '#fff', '#ffd32a', '#fff', '#1e90ff', '#fff'].map((f, i) => {
            const a1 = (i / 6) * Math.PI * 2 - Math.PI / 2
            const a2 = ((i + 1) / 6) * Math.PI * 2 - Math.PI / 2
            return <path key={i} d={`M112 86 L${112 + 90 * Math.cos(a1)} ${86 + 90 * Math.sin(a1)} L${112 + 90 * Math.cos(a2)} ${86 + 90 * Math.sin(a2)} Z`} fill={f} />
          })}
          <circle cx="112" cy="86" r="10" fill="#fff" />
        </g>
        {/* mar i sorra */}
        <path d="M0 166 Q25 158 50 166 T100 166 T150 166 T200 166 V200 H0 Z" fill="#1aa3d9" />
        <path d="M0 176 Q25 168 50 176 T100 176 T150 176 T200 176" stroke="#fff" strokeWidth="2" fill="none" opacity="0.7" />
        <path d="M0 196 Q50 186 100 196 T200 192 V290 H0 Z" fill="#f2d49b" />
        {[
          [30, 230],
          [70, 250],
          [130, 240],
          [170, 222],
          [100, 268],
          [50, 210],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.6" fill="#c9a66b" />
        ))}
      </g>
      <path d={c.inner} fill="none" stroke="#fff" strokeWidth="2" />
    </>
  ),

  // ---------- Redemption: de la foscor a la llum ----------
  redemption: (c) => (
    <>
      <defs>
        <linearGradient id={c.id('g')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff7d6" />
          <stop offset="0.45" stopColor="#c7b6ff" />
          <stop offset="1" stopColor="#140b2e" />
        </linearGradient>
        <clipPath id={c.id('clip')}>
          <path d={c.shape} />
        </clipPath>
      </defs>
      <path d={c.shape} fill={c.url('g')} />
      <g clipPath={c.url('clip')}>
        {rays(112, -40, 18, '#fff', 0.35, 400, 4)}
        {/* ales */}
        {[-1, 1].map((s) => (
          <g key={s} transform={s === 1 ? 'translate(224 0) scale(-1 1)' : ''} opacity="0.55">
            {[0, 1, 2, 3].map((i) => (
              <ellipse key={i} cx={58 - i * 9} cy={70 + i * 9} rx="7" ry="24" transform={`rotate(${40 + i * 8} ${58 - i * 9} ${70 + i * 9})`} fill="#fff" />
            ))}
          </g>
        ))}
      </g>
      <path d={c.inner} fill="none" stroke="#fff" strokeWidth="1.6" opacity="0.8" />
    </>
  ),

  // ---------- Doble Cara: meitat MVP, meitat anti ----------
  twoface: (c) => (
    <>
      <defs>
        <linearGradient id={c.id('l')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe08a" />
          <stop offset="1" stopColor="#b8862a" />
        </linearGradient>
        <linearGradient id={c.id('r')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a0d1a" />
          <stop offset="1" stopColor="#12030a" />
        </linearGradient>
        <clipPath id={c.id('clip')}>
          <path d={c.shape} />
        </clipPath>
      </defs>
      <g clipPath={c.url('clip')}>
        <rect width={W} height={H} fill={c.url('l')} />
        <path d="M112 0 L104 30 L118 55 L102 86 L120 118 L100 150 L116 186 L98 220 L112 290 H210 V0 Z" fill={c.url('r')} />
        <path d="M112 0 L104 30 L118 55 L102 86 L120 118 L100 150 L116 186 L98 220 L112 290" stroke="#fff" strokeWidth="1.5" fill="none" opacity="0.8" />
        <text x="44" y="250" textAnchor="middle" fontSize="30" opacity="0.18">
          😇
        </text>
        <text x="160" y="250" textAnchor="middle" fontSize="30" opacity="0.25">
          😈
        </text>
      </g>
      <path d={c.inner} fill="none" stroke="#fff" strokeWidth="1.4" opacity="0.7" />
    </>
  ),

  // ---------- GymRat: formigó, discos i neó ----------
  gymrat: (c) => (
    <>
      <defs>
        <linearGradient id={c.id('g')} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#3a3d42" />
          <stop offset="1" stopColor="#141518" />
        </linearGradient>
        <clipPath id={c.id('clip')}>
          <path d={c.shape} />
        </clipPath>
      </defs>
      <path d={c.shape} fill={c.url('g')} />
      <g clipPath={c.url('clip')}>
        {Array.from({ length: 60 }, (_, i) => (
          <circle key={i} cx={(i * 53) % 200} cy={(i * 97) % 286} r={0.8 + (i % 3) * 0.4} fill="#fff" opacity="0.06" />
        ))}
        {/* discos de pes */}
        {[
          [12, 52, 34],
          [194, 236, 40],
        ].map(([x, y, r], i) => (
          <g key={i} opacity="0.55">
            <circle cx={x} cy={y} r={r} fill="#1b1c1f" stroke="#9cff57" strokeWidth="1.5" />
            <circle cx={x} cy={y} r={r * 0.65} fill="none" stroke="#555" strokeWidth="3" />
            <circle cx={x} cy={y} r={r * 0.18} fill="#9cff57" />
          </g>
        ))}
        {/* manuelles */}
        {[
          [40, 238],
          [160, 50],
        ].map(([x, y], i) => (
          <g key={i} opacity="0.18" transform={`rotate(-25 ${x} ${y})`}>
            <rect x={x - 18} y={y - 2} width="36" height="4" fill="#9cff57" />
            <rect x={x - 22} y={y - 8} width="6" height="16" rx="1" fill="#9cff57" />
            <rect x={x + 16} y={y - 8} width="6" height="16" rx="1" fill="#9cff57" />
          </g>
        ))}
      </g>
      <path d={c.inner} fill="none" stroke="#9cff57" strokeWidth="1.8" />
      <path d={c.shape} fill="none" stroke="#9cff57" strokeWidth="1" opacity="0.4" />
    </>
  ),

  // ---------- Centurió: Roma ----------
  centurion: (c) => (
    <>
      <defs>
        <linearGradient id={c.id('g')} x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0" stopColor="#a3141c" />
          <stop offset="1" stopColor="#3d0508" />
        </linearGradient>
        <clipPath id={c.id('clip')}>
          <path d={c.shape} />
        </clipPath>
      </defs>
      <path d={c.shape} fill={c.url('g')} />
      <g clipPath={c.url('clip')}>
        <text x="112" y="140" textAnchor="middle" fontSize="150" fontFamily="Georgia, serif" fontWeight="700" fill="#e9c46a" opacity="0.1">
          C
        </text>
        {/* columnes */}
        {[18, 182].map((x) => (
          <g key={x} opacity="0.45" fill="#e9c46a">
            <rect x={x - 7} y="40" width="14" height="5" />
            {[-4, 0, 4].map((d) => (
              <rect key={d} x={x + d - 1} y="45" width="2" height="150" opacity="0.8" />
            ))}
            <rect x={x - 7} y="195" width="14" height="5" />
          </g>
        ))}
        {/* greca */}
        <path
          d="M20 232 h12 v-8 h-8 v4 h4 M36 232 h12 v-8 h-8 v4 h4 M52 232 h12 v-8 h-8 v4 h4 M68 232 h12 v-8 h-8 v4 h4 M84 232 h12 v-8 h-8 v4 h4 M100 232 h12 v-8 h-8 v4 h4 M116 232 h12 v-8 h-8 v4 h4 M132 232 h12 v-8 h-8 v4 h4 M148 232 h12 v-8 h-8 v4 h4 M164 232 h12 v-8 h-8 v4 h4"
          stroke="#e9c46a"
          strokeWidth="1.4"
          fill="none"
          opacity="0.7"
        />
      </g>
      {laurel(112, 86, 62, '#e9c46a', 0.55)}
      <path d={c.inner} fill="none" stroke="#e9c46a" strokeWidth="2" />
    </>
  ),

  // ---------- 4x4: fang i rodades ----------
  offroad: (c) => (
    <>
      <defs>
        <linearGradient id={c.id('g')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6b7a3a" />
          <stop offset="1" stopColor="#2f3518" />
        </linearGradient>
        <clipPath id={c.id('clip')}>
          <path d={c.shape} />
        </clipPath>
      </defs>
      <path d={c.shape} fill={c.url('g')} />
      <g clipPath={c.url('clip')}>
        {/* corbes de nivell */}
        {[0, 1, 2, 3, 4].map((i) => (
          <ellipse key={i} cx="150" cy="60" rx={20 + i * 22} ry={12 + i * 14} fill="none" stroke="#d8d29b" strokeWidth="0.8" opacity="0.25" />
        ))}
        {/* rodades */}
        {[34, 70].map((x) => (
          <g key={x} transform={`rotate(-18 ${x} 140)`} opacity="0.3">
            {Array.from({ length: 16 }, (_, i) => (
              <rect key={i} x={x} y={i * 20 - 20} width="16" height="10" rx="2" fill="#1e2110" transform={`skewY(-20)`} />
            ))}
          </g>
        ))}
        {/* esquitxos de fang */}
        {[
          [170, 200, 12],
          [184, 224, 6],
          [150, 236, 5],
          [24, 40, 9],
          [40, 28, 4],
          [180, 140, 4],
        ].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="#4a3519" opacity="0.8" />
        ))}
        <path d="M150 214 q8 -18 26 -14 q14 4 10 22 q-6 16 -24 12 q-16 -4 -12 -20 z" fill="#4a3519" opacity="0.85" />
      </g>
      <path d={c.inner} fill="none" stroke="#d8d29b" strokeWidth="1.6" strokeDasharray="10 3" />
    </>
  ),

  // ---------- IronMan: armadura ----------
  ironman: (c) => (
    <>
      <defs>
        <linearGradient id={c.id('red')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e3342f" />
          <stop offset="0.5" stopColor="#8e0e0e" />
          <stop offset="1" stopColor="#c62020" />
        </linearGradient>
        <linearGradient id={c.id('gold')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe08a" />
          <stop offset="1" stopColor="#c08a1e" />
        </linearGradient>
        <radialGradient id={c.id('arc')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.4" stopColor="#8ff3ff" />
          <stop offset="1" stopColor="#1cc7ff" stopOpacity="0" />
        </radialGradient>
        <clipPath id={c.id('clip')}>
          <path d={c.shape} />
        </clipPath>
      </defs>
      <path d={c.shape} fill={c.url('red')} />
      <g clipPath={c.url('clip')}>
        {/* plaques daurades */}
        <path d="M40 20 L100 12 L160 20 L150 46 L100 40 L50 46 Z" fill={c.url('gold')} opacity="0.85" />
        <path d="M5 150 L50 140 L60 200 L5 214 Z M195 150 L150 140 L140 200 L195 214 Z" fill={c.url('gold')} opacity="0.5" />
        <path d="M0 110 L60 120 M200 110 L140 120 M30 240 L100 220 L170 240" stroke="#3b0505" strokeWidth="1.5" fill="none" opacity="0.6" />
        {[30, 170].map((x) => (
          <circle key={x} cx={x} cy="128" r="2" fill="#3b0505" />
        ))}
      </g>
      {/* reactor */}
      <circle cx="170" cy="40" r="16" fill={c.url('arc')} />
      <circle cx="170" cy="40" r="8" fill="none" stroke="#e8fbff" strokeWidth="2" />
      <path d={c.inner} fill="none" stroke={c.url('gold')} strokeWidth="2.2" />
    </>
  ),

  // ---------- SuperMan: capa i escut ----------
  superman: (c) => (
    <>
      <defs>
        <linearGradient id={c.id('g')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a6ff2" />
          <stop offset="1" stopColor="#0b2a7a" />
        </linearGradient>
        <clipPath id={c.id('clip')}>
          <path d={c.shape} />
        </clipPath>
      </defs>
      <path d={c.shape} fill={c.url('g')} />
      <g clipPath={c.url('clip')}>
        {rays(112, 82, 20, '#fff', 0.06)}
        {/* escut en diamant */}
        <path d="M112 18 L170 40 L112 150 L54 40 Z" fill="#ffd21f" stroke="#d7141a" strokeWidth="6" opacity="0.9" />
        <text x="112" y="104" textAnchor="middle" fontSize="70" fontWeight="900" fill="#d7141a" opacity="0.5">
          T
        </text>
        {/* capa */}
        <path d="M-10 170 Q40 150 100 168 T210 160 V300 H-10 Z" fill="#c8101a" />
        <path d="M-10 170 Q40 150 100 168 T210 160" stroke="#ff5a5f" strokeWidth="2" fill="none" />
        <path d="M30 200 Q70 190 90 290 M140 190 Q160 220 150 290" stroke="#8a0a10" strokeWidth="1.5" fill="none" opacity="0.6" />
      </g>
      <path d={c.inner} fill="none" stroke="#ffd21f" strokeWidth="2" />
    </>
  ),

  // ---------- Fantasma: llençol ----------
  ghost: (c) => (
    <>
      <defs>
        <linearGradient id={c.id('g')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4f7ff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#b9c3dc" stopOpacity="0.75" />
        </linearGradient>
        <clipPath id={c.id('clip')}>
          <path d={c.shape} />
        </clipPath>
      </defs>
      <path d={c.shape} fill={c.url('g')} />
      <g clipPath={c.url('clip')} opacity="0.5">
        <path d="M-10 120 Q40 100 90 124 T210 110" stroke="#fff" strokeWidth="10" fill="none" opacity="0.6" />
        <path d="M-10 200 Q50 180 110 204 T210 190" stroke="#fff" strokeWidth="14" fill="none" opacity="0.5" />
        <ellipse cx="40" cy="60" rx="5" ry="8" fill="#2b3245" opacity="0.35" />
        <ellipse cx="58" cy="60" rx="5" ry="8" fill="#2b3245" opacity="0.35" />
      </g>
      <path d={c.shape} fill="none" stroke="#8d97b3" strokeWidth="1.5" strokeDasharray="5 4" />
    </>
  ),

  // ---------- Rei Fantasma ----------
  ghostking: (c) => (
    <>
      <defs>
        <linearGradient id={c.id('g')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2d1b4e" />
          <stop offset="1" stopColor="#0b0614" />
        </linearGradient>
        <radialGradient id={c.id('glow')} cx="0.56" cy="0.3" r="0.55">
          <stop offset="0" stopColor="#6dff8b" stopOpacity="0.4" />
          <stop offset="1" stopColor="#6dff8b" stopOpacity="0" />
        </radialGradient>
        <clipPath id={c.id('clip')}>
          <path d={c.shape} />
        </clipPath>
      </defs>
      <path d={c.shape} fill={c.url('g')} />
      <path d={c.shape} fill={c.url('glow')} />
      <g clipPath={c.url('clip')} opacity="0.5">
        <path d="M-10 140 Q40 120 90 144 T210 130" stroke="#6dff8b" strokeWidth="6" fill="none" opacity="0.35" />
        <path d="M-10 210 Q50 190 110 214 T210 200" stroke="#6dff8b" strokeWidth="9" fill="none" opacity="0.25" />
      </g>
      <path d={c.shape} fill="none" stroke="#6dff8b" strokeWidth="1.5" strokeDasharray="5 4" />
    </>
  ),

  // ---------- Èxits esportius ----------
  ascens: (c) => (
    <>
      <defs>
        <linearGradient id={c.id('g')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f6b45" />
          <stop offset="1" stopColor="#063522" />
        </linearGradient>
        <clipPath id={c.id('clip')}>
          <path d={c.shape} />
        </clipPath>
      </defs>
      <path d={c.shape} fill={c.url('g')} />
      <g clipPath={c.url('clip')}>
        {/* fletxes d'ascens */}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <path key={i} d={`M-20 ${300 - i * 44} L100 ${240 - i * 44} L220 ${300 - i * 44}`} stroke="#f5c84c" strokeWidth="10" fill="none" opacity="0.07" />
        ))}
        {/* trofeu */}
        <g opacity="0.16" fill="#f5c84c">
          <path d="M82 30 H142 V60 Q142 96 112 104 Q82 96 82 60 Z" />
          <path d="M82 38 Q60 38 62 56 Q64 72 84 74 M142 38 Q164 38 162 56 Q160 72 140 74" stroke="#f5c84c" strokeWidth="5" fill="none" />
          <rect x="106" y="104" width="12" height="18" />
          <rect x="94" y="122" width="36" height="8" />
        </g>
        {/* confeti */}
        {Array.from({ length: 22 }, (_, i) => (
          <rect
            key={i}
            x={(i * 37) % 196}
            y={(i * 61) % 150}
            width="4"
            height="7"
            rx="1"
            fill={['#f5c84c', '#fff', '#ff5a5f', '#4fc3ff'][i % 4]}
            transform={`rotate(${i * 29} ${(i * 37) % 196} ${(i * 61) % 150})`}
            opacity="0.85"
          />
        ))}
      </g>
      <path d={c.inner} fill="none" stroke="#f5c84c" strokeWidth="2" />
    </>
  ),

  mitja: (c) => bib(c, '#ff6b1a', '#ffb37a', '21K'),
  marato: (c) => bib(c, '#1747c9', '#f5c84c', '42K'),

  hyrox: (c) => (
    <>
      <defs>
        <pattern id={c.id('hz')} width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="10" height="20" fill="#ffd600" />
          <rect x="10" width="10" height="20" fill="#111" />
        </pattern>
        <linearGradient id={c.id('g')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a2a2a" />
          <stop offset="1" stopColor="#0c0c0c" />
        </linearGradient>
        <clipPath id={c.id('clip')}>
          <path d={c.shape} />
        </clipPath>
      </defs>
      <path d={c.shape} fill={c.url('g')} />
      <g clipPath={c.url('clip')}>
        <rect x="0" y="0" width={W} height="20" fill={c.url('hz')} />
        <rect x="0" y="262" width={W} height="24" fill={c.url('hz')} />
        <text x="112" y="132" textAnchor="middle" fontSize="96" fontWeight="900" fill="#ffd600" opacity="0.07" letterSpacing="-4">
          HX
        </text>
        {/* kettlebell */}
        <g opacity="0.15" fill="#ffd600">
          <circle cx="30" cy="238" r="11" />
          <path d="M23 229 Q23 218 30 218 Q37 218 37 229" stroke="#ffd600" strokeWidth="4" fill="none" />
        </g>
      </g>
      {[
        [20, 30],
        [180, 30],
        [20, 252],
        [180, 252],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="4" fill="#666" stroke="#ffd600" strokeWidth="1" />
          <path d={`M${x - 2.5} ${y} H${x + 2.5}`} stroke="#222" strokeWidth="1.2" />
        </g>
      ))}
      <path d={SHAPES.plateIn} fill="none" stroke="#ffd600" strokeWidth="1.5" />
    </>
  ),
}

function base(c: Ctx, light: string, mid: string, dark: string) {
  return (
    <>
      <defs>
        <linearGradient id={c.id('g')} x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="0.55" stopColor={mid} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
        <pattern id={c.id('p')} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <rect width="1" height="8" fill="#fff" opacity="0.18" />
        </pattern>
      </defs>
      <path d={c.shape} fill={c.url('g')} />
      <path d={c.shape} fill={c.url('p')} />
      <path d={c.inner} fill="none" stroke={dark} strokeWidth="1.2" opacity="0.5" />
    </>
  )
}

/** Dorsal de cursa (mitja i marató) */
function bib(c: Ctx, color: string, accent: string, km: string) {
  return (
    <>
      <defs>
        <clipPath id={c.id('clip')}>
          <path d={c.shape} />
        </clipPath>
      </defs>
      <path d={c.shape} fill="#fbfbf7" />
      <g clipPath={c.url('clip')}>
        <rect x="0" y="0" width={W} height="30" fill={color} />
        <rect x="0" y="30" width={W} height="4" fill={accent} />
        <rect x="0" y="252" width={W} height="34" fill={color} />
        <rect x="0" y="248" width={W} height="4" fill={accent} />
        <text x="112" y="150" textAnchor="middle" fontSize="88" fontWeight="900" fill={color} opacity="0.12" letterSpacing="-3">
          {km}
        </text>
        {/* línia de carretera */}
        <path d="M0 240 H200" stroke="#bbb" strokeWidth="2" strokeDasharray="10 8" />
        {/* xip */}
        <rect x="150" y="214" width="34" height="16" rx="2" fill="#ddd" stroke="#bbb" />
        <path d="M154 218 h26 M154 222 h26 M154 226 h26" stroke="#bbb" strokeWidth="1" />
      </g>
      <path d={c.shape} fill="none" stroke="#d6d6cf" strokeWidth="1.5" />
    </>
  )
}

/** Ornaments per sobre de la foto */
const FG: Partial<Record<CardVariant, (c: Ctx) => ReactNode>> = {
  redemption: () => (
    <g>
      <ellipse cx="112" cy="30" rx="30" ry="7" fill="none" stroke="#fff3a8" strokeWidth="4" />
      <ellipse cx="112" cy="30" rx="30" ry="7" fill="none" stroke="#ffd84d" strokeWidth="1.5" />
    </g>
  ),
  ghostking: () => (
    <path d="M88 36 L92 18 L102 28 L112 12 L122 28 L132 18 L136 36 Z" fill="#ffd84d" stroke="#8a6200" strokeWidth="1.2" />
  ),
  antiicon: () => (
    <g fill="#c1121f" stroke="#4a0008" strokeWidth="1">
      <path d="M76 44 Q66 22 78 10 Q78 28 90 38 Z" />
      <path d="M148 44 Q158 22 146 10 Q146 28 134 38 Z" />
    </g>
  ),
  mitja: () => pins(),
  marato: () => (
    <>
      {pins()}
      <g transform="translate(0 0)">{laurel(100, 250, 22, '#f5c84c', 0.9)}</g>
    </>
  ),
}

const pins = () => (
  <g>
    {[
      [18, 18],
      [182, 18],
      [18, 268],
      [182, 268],
    ].map(([x, y], i) => (
      <g key={i}>
        <circle cx={x} cy={y} r="5" fill="#fff" stroke="#999" strokeWidth="1" />
        <path d={`M${x - 4} ${y + 3} L${x + 9} ${y - 6}`} stroke="#b5b5b5" strokeWidth="1.6" strokeLinecap="round" />
      </g>
    ))}
  </g>
)

export function CardArt({ variant, layer }: { variant: CardVariant; layer: 'bg' | 'fg' }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const draw = layer === 'bg' ? BG[variant] : FG[variant]
  if (!draw) return null
  const shape = SHAPE_OF[variant] ?? 'shield'
  const inner = shape === 'icon' ? SHAPES.iconIn : shape === 'plate' ? SHAPES.plateIn : shape === 'shield' ? SHAPES.shieldIn : SHAPES[shape]
  const ctx: Ctx = {
    id: (s) => `${uid}${s}`,
    url: (s) => `url(#${uid}${s})`,
    shape: SHAPES[shape],
    inner,
  }
  return (
    <svg className={`fifa-art fifa-art-${layer}`} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      {draw(ctx)}
    </svg>
  )
}
