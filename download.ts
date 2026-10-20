/** User-gesture downloads. Callers must invoke these directly from a click handler. */

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Keep the URL alive long enough for the browser to start the save.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function canShareFile(blob: Blob, filename: string): boolean {
  try {
    const f = new File([blob], filename, { type: 'image/svg+xml' })
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [f] })
  } catch { return false }
}

export async function shareFile(blob: Blob, filename: string): Promise<void> {
  const f = new File([blob], filename, { type: 'image/svg+xml' })
  try { await navigator.share({ files: [f], title: filename }) } catch (e) {
    if ((e as DOMException).name !== 'AbortError') throw e
  }
}

export function openBlobInNewTab(blob: Blob) {
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener')
  setTimeout(() => URL.revokeObjectURL(url), 5 * 60_000)
}
