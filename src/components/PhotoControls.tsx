import { useRef, useState } from 'react'
import { PhotoEditor } from './PhotoEditor'
import { ErrorMsg } from './ui'
import { useAction } from '../store'

interface Props {
  url: string | null | undefined
  /** Desa la nova imatge (o null per treure-la) */
  onChange: (image: Blob | null) => Promise<unknown>
  compact?: boolean
  removeLabel?: string
}

/** Botons pujar / encuadrar / treure foto, amb editor */
export function PhotoControls({ url, onChange, compact, removeLabel = 'Treure' }: Props) {
  const { run, busy, err } = useAction()
  const [editing, setEditing] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  const close = () => {
    if (editing?.startsWith('blob:')) URL.revokeObjectURL(editing)
    setEditing(null)
  }

  return (
    <>
      <div className={`row wrap ${compact ? 'photo-ctl-compact' : ''}`}>
        <button type="button" className="btn" disabled={busy} onClick={() => input.current?.click()}>
          📷 {url ? 'Canviar' : 'Pujar foto'}
        </button>
        {url && (
          <>
            <button type="button" className="btn" disabled={busy} onClick={() => setEditing(url)} title="Tornar a encuadrar">
              ✂️{compact ? '' : ' Encuadrar'}
            </button>
            <button
              type="button"
              className="btn danger"
              disabled={busy}
              onClick={() => confirm('Treure aquesta foto?') && run(() => onChange(null))}
              title={removeLabel}
            >
              🗑{compact ? '' : ` ${removeLabel}`}
            </button>
          </>
        )}
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) setEditing(URL.createObjectURL(f))
            e.target.value = ''
          }}
        />
      </div>
      <ErrorMsg err={err} />
      {editing && (
        <PhotoEditor
          src={editing}
          onCancel={close}
          onSave={async (blob) => {
            if (await run(() => onChange(blob))) close()
            else throw new Error("No s'ha pogut desar la foto")
          }}
        />
      )}
    </>
  )
}
