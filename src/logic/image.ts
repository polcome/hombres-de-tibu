/** Redueix una foto (màx. `max` px de costat) i la comprimeix a JPEG */
export async function compressImage(file: Blob, max = 1080, quality = 0.75): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = () => rej(new Error("No s'ha pogut llegir la foto"))
      i.src = url
    })
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
    const c = document.createElement('canvas')
    c.width = Math.round(img.naturalWidth * k)
    c.height = Math.round(img.naturalHeight * k)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', quality))
    if (!blob) throw new Error("No s'ha pogut comprimir la foto")
    return blob
  } finally {
    URL.revokeObjectURL(url)
  }
}
