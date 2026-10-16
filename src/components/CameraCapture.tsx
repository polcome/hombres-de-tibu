import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  onCapture: (image: Blob) => void
  onCancel: () => void
  /** Si el navegador no deixa fer servir la càmera */
  onUnavailable: () => void
}

export const cameraSupported = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

/** Càmera dins l'app (getUserMedia): funciona encara que el mòbil ignori capture="environment" */
export function CameraCapture({ onCapture, onCancel, onUnavailable }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [ready, setReady] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setReady(false)
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1920 } }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop())
        stream.current = s
        if (video.current) {
          video.current.srcObject = s
          video.current.play().catch(() => {})
        }
      })
      .catch((e: DOMException) => {
        if (cancelled) return
        if (e.name === 'NotAllowedError') setErr("Has de donar permís a la càmera al navegador (icona del cadenat a la barra d'adreces).")
        else onUnavailable()
      })
    return () => {
      cancelled = true
      stream.current?.getTracks().forEach((t) => t.stop())
      stream.current = null
    }
  }, [facing, onUnavailable])

  const shoot = () => {
    const v = video.current
    if (!v || !v.videoWidth) return
    const c = document.createElement('canvas')
    c.width = v.videoWidth
    c.height = v.videoHeight
    const ctx = c.getContext('2d')!
    if (facing === 'user') {
      // La frontal es veu en mirall: la desem igual que es veu
      ctx.translate(c.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(v, 0, 0)
    c.toBlob((b) => b && onCapture(b), 'image/jpeg', 0.85)
  }

  return createPortal(
    <div className="camera">
      <video ref={video} playsInline muted onLoadedMetadata={() => setReady(true)} className={facing === 'user' ? 'mirror' : ''} />
      {err && <div className="camera-err error">⚠️ {err}</div>}
      <div className="camera-bar">
        <button type="button" className="camera-btn" onClick={onCancel} aria-label="Cancel·lar">
          ✕
        </button>
        <button type="button" className="camera-shutter" disabled={!ready} onClick={shoot} aria-label="Fer foto" />
        <button
          type="button"
          className="camera-btn"
          onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
          aria-label="Girar càmera"
        >
          🔄
        </button>
      </div>
    </div>,
    document.body,
  )
}
