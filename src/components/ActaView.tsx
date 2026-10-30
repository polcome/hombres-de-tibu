import type { ReactNode } from 'react'

/** Format de WhatsApp en línia: *negreta*, _cursiva_, ~ratllat~ (i **negreta** per si la IA fa markdown) */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g).map((part, i) => {
    if (/^\*\*.+\*\*$/.test(part)) return <b key={i}>{part.slice(2, -2)}</b>
    if (/^\*.+\*$/.test(part)) return <b key={i}>{part.slice(1, -1)}</b>
    if (/^_.+_$/.test(part)) return <i key={i}>{part.slice(1, -1)}</i>
    if (/^~.+~$/.test(part)) return <s key={i}>{part.slice(1, -1)}</s>
    return part
  })
}

const plain = (s: string) => s.replace(/^#+\s*/, '').replace(/\*\*?|_|~/g, '').trim()

type Line = { kind: 'title' | 'sub' | 'h' | 'quote' | 'li' | 'sign' | 'p'; text: string }

function classify(text: string): Line[] {
  const lines = text.split('\n')
  const out: (Line | null)[] = []
  let titled = false
  lines.forEach((raw, i) => {
    const l = raw.trim()
    if (!l) return out.push(null)
    if (!titled) {
      titled = true
      return out.push({ kind: 'title', text: plain(l) })
    }
    // Subtítol just a sota del títol (_Los Hombres de Tibu · Consell Suprem_)
    if (out.length === 1 && /^_.+_$/.test(l)) return out.push({ kind: 'sub', text: plain(l) })
    if (/^(signat|firmat|atentament)/i.test(l) || (i >= lines.length - 3 && /consell suprem/i.test(l))) return out.push({ kind: 'sign', text: l })
    if (/^#+\s/.test(l) || /^[^\w"«]*\*[^*]+\*[^\w]*$/u.test(l)) return out.push({ kind: 'h', text: l.replace(/^#+\s*/, '') })
    if (/^(›|>)\s?/.test(l)) return out.push({ kind: 'quote', text: l.replace(/^(›|>)\s?/, '') })
    if (/^([-•·]|\d+\.)\s/.test(l)) return out.push({ kind: 'li', text: l.replace(/^([-•·])\s/, '') })
    out.push({ kind: 'p', text: l })
  })
  return out.filter((x): x is Line => x !== null)
}

/** L'acta publicada amb format visual (el text és el de WhatsApp) */
export function ActaView({ text, label }: { text: string; label: string }) {
  const lines = classify(text)
  // Si el títol ja diu que és l'acta, no ho repetim a dalt
  const kicker = /acta/i.test(lines[0]?.text ?? '') ? label : `Acta oficial · ${label}`
  return (
    <article className="acta-doc">
      <div className="acta-seal" aria-hidden>
        🦈
      </div>
      <div className="acta-kicker">{kicker}</div>
      {lines.map((l, i) => {
        const c = inline(l.text)
        switch (l.kind) {
          case 'title':
            return (
              <h2 key={i} className="acta-title">
                {l.text}
              </h2>
            )
          case 'sub':
            return (
              <div key={i} className="acta-sub">
                {l.text}
              </div>
            )
          case 'h':
            return (
              <h3 key={i} className="acta-h">
                {c}
              </h3>
            )
          case 'quote':
            return (
              <blockquote key={i} className="acta-quote">
                {c}
              </blockquote>
            )
          case 'li':
            return (
              <div key={i} className="acta-li">
                {c}
              </div>
            )
          case 'sign':
            return (
              <div key={i} className="acta-sign">
                {c}
              </div>
            )
          default:
            return <p key={i}>{c}</p>
        }
      })}
    </article>
  )
}
