import { useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { compressImage } from '../logic/image'
import { CameraCapture, cameraSupported } from './CameraCapture'

export type PickedPhoto = { blob: Blob; url: string }

/** Botó per adjuntar una foto: fer-la ara amb la càmera de l'app o triar-la de la galeria */
export function PhotoPicker({
  value,
  onChange,
  label = '📷 Adjuntar foto',
  title = 'Foto',
  max = 1080,
  quality = 0.75,
}: {
  value: PickedPhoto | null
  onChange: (p: PickedPhoto | null) => void
  label?: string
  title?: string
  max?: number
  quality?: number
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const [chooser, setChooser] = useState(false)
  const [camera, setCamera] = useState(false)

  const apply = async (f: Blob) => {
    const blob = await compressImage(f, max, quality)
    if (value) URL.revokeObjectURL(value.url)
    onChange({ blob, url: URL.createObjectURL(blob) })
  }
  const choose = (src: 'camera' | 'gallery') => {
    setChooser(false)
    if (src === 'camera' && cameraSupported()) setCamera(true)
    else (src === 'camera' ? cameraInput : fileInput).current?.click()
  }
  // Si la càmera de l'app no està disponible, provem amb la del sistema
  const cameraFallback = useCallback(() => {
    setCamera(false)
    cameraInput.current?.click()
  }, [])
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f) await apply(f)
  }

  return (
    <div className="proof-pick">
      {value ? (
        <>
          <img src={value.url} alt={title} />
          <div className="stack-sm">
            <span className="small ok">✓ Foto adjuntada</span>
            <div className="row">
              <button type="button" className="btn" onClick={() => setChooser(true)}>
                Canviar
              </button>
              <button
                type="button"
                className="btn danger"
                onClick={() => {
                  URL.revokeObjectURL(value.url)
                  onChange(null)
                }}
              >
                🗑
              </button>
            </div>
          </div>
        </>
      ) : (
        <button type="button" className="btn grow" onClick={() => setChooser(true)}>
          {label}
        </button>
      )}
      <input ref={fileInput} type="file" accept="image/*" hidden onChange={onFile} />
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
      {camera && (
        <CameraCapture
          onCancel={() => setCamera(false)}
          onUnavailable={cameraFallback}
          onCapture={(b) => {
            setCamera(false)
            apply(b)
          }}
        />
      )}
      {chooser &&
        createPortal(
          <div className="modal sheet" onClick={() => setChooser(false)}>
            <div className="sheet-box" onClick={(e) => e.stopPropagation()}>
              <div className="muted small center">{title}</div>
              <button type="button" className="btn btn-primary btn-big" onClick={() => choose('camera')}>
                📸 Fer foto ara
              </button>
              <button type="button" className="btn btn-big" onClick={() => choose('gallery')}>
                🖼️ Triar de la galeria
              </button>
              <button type="button" className="btn" onClick={() => setChooser(false)}>
                Cancel·lar
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
