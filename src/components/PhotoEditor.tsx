import { useEffect, useRef, useState } from 'react'

const VIEW = 280 // mida del visor (px)
const OUT = 700 // mida de la imatge final (px)

interface Props {
  src: string
  onCancel: () => void
  onSave: (image: Blob) => void | Promise<void>
}

/** Editor per encuadrar: arrossegar per moure, zoom (roda, pessic o barra) i girar */
export function PhotoEditor({ src, onCancel, onSave }: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [rot, setRot] = useState(0)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [saving, setSaving] = useState(false)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ dist: number; zoom: number } | null>(null)

  useEffect(() => {
    const i = new Image()
    i.crossOrigin = 'anonymous'
    i.onload = () => setImg(i)
    i.onerror = () => setErr("No s'ha pogut carregar la imatge")
    i.src = src
  }, [src])

  const turned = rot % 180 !== 0
  const w = img ? (turned ? img.naturalHeight : img.naturalWidth) : 1
  const h = img ? (turned ? img.naturalWidth : img.naturalHeight) : 1
  const base = Math.max(VIEW / w, VIEW / h) // escala per omplir el visor

  const onDown = (e: React.PointerEvent) => {
    ;(e.target as Element).setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom }
    }
  }
  const onMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      setZoom(Math.min(5, Math.max(0.5, (pinch.current.zoom * d) / pinch.current.dist)))
    } else if (pointers.current.size === 1) {
      setPos((p) => ({ x: p.x + e.clientX - prev.x, y: p.y + e.clientY - prev.y }))
    }
  }
  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
  }

  const save = async () => {
    if (!img) return
    setSaving(true)
    try {
      const k = OUT / VIEW
      const c = document.createElement('canvas')
      c.width = c.height = OUT
      const ctx = c.getContext('2d')!
      ctx.fillStyle = '#111'
      ctx.fillRect(0, 0, OUT, OUT)
      ctx.translate(OUT / 2 + pos.x * k, OUT / 2 + pos.y * k)
      ctx.rotate((rot * Math.PI) / 180)
      const s = base * zoom * k
      ctx.scale(s, s)
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
      const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.88))
      if (!blob) throw new Error("No s'ha pogut generar la imatge")
      await onSave(blob)
    } catch (e) {
      setErr((e as Error).message)
      setSaving(false)
    }
  }

  return (
    <div className="modal" onClick={onCancel}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3>✂️ Encuadrar foto</h3>
        <p className="muted small">Arrossega per moure-la. Fes zoom amb la barra, la roda o pessigant.</p>
        <div
          className="cropper"
          style={{ width: VIEW, height: VIEW }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onWheel={(e) => setZoom((z) => Math.min(5, Math.max(0.5, z * (e.deltaY < 0 ? 1.08 : 0.92))))}
        >
          {img && (
            <img
              src={src}
              alt=""
              draggable={false}
              style={{
                width: img.naturalWidth * base * zoom,
                height: img.naturalHeight * base * zoom,
                transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) rotate(${rot}deg)`,
              }}
            />
          )}
          <div className="cropper-guide" />
        </div>
        <div className="row">
          <span>➖</span>
          <input type="range" min={0.5} max={5} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
          <span>➕</span>
        </div>
        <div className="row wrap center">
          <button type="button" className="btn" onClick={() => setRot((r) => (r + 90) % 360)}>
            ↻ Girar
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setZoom(1)
              setPos({ x: 0, y: 0 })
              setRot(0)
            }}
          >
            Centrar
          </button>
        </div>
        {err && <div className="error">⚠️ {err}</div>}
        <div className="row">
          <button type="button" className="btn grow" onClick={onCancel}>
            Cancel·lar
          </button>
          <button type="button" className="btn btn-primary grow" disabled={!img || saving} onClick={save}>
            {saving ? 'Pujant…' : 'Desar foto'}
          </button>
        </div>
      </div>
    </div>
  )
}
