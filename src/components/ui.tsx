import { useState, type ReactNode } from 'react'
import type { Member } from '../types'
import { displayName } from '../logic/stats'

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}

export function CopyButton({ text, children = 'Copiar', className = 'btn' }: { text: string; children?: ReactNode; className?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        if (await copyText(text)) {
          setDone(true)
          setTimeout(() => setDone(false), 1500)
        }
      }}
    >
      {done ? '✅ Copiat!' : children}
    </button>
  )
}

export function WhatsAppButton({ text, children = 'Enviar per WhatsApp' }: { text: string; children?: ReactNode }) {
  return (
    <a className="btn btn-wa" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
      💬 {children}
    </a>
  )
}

export function MemberSelect({
  members,
  value,
  onChange,
  placeholder = 'Tria algú…',
  exclude = [],
}: {
  members: Member[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
  exclude?: string[]
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {members
        .filter((m) => m.active && !exclude.includes(m.id))
        .map((m) => (
          <option key={m.id} value={m.id}>
            {displayName(m)}
          </option>
        ))}
    </select>
  )
}

export const ErrorMsg = ({ err }: { err: string | null }) => (err ? <div className="error">⚠️ {err}</div> : null)

export function Section({ title, right, children }: { title: ReactNode; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{title}</h2>
        {right}
      </div>
      {children}
    </section>
  )
}
