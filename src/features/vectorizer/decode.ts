import { LIMITS, SUPPORTED_LABEL } from './limits'
import { sniffImage, type ImageKind } from './sniff'

export class InputError extends Error {}

export interface SourceInfo {
  name: string
  bytes: number
  kind: ImageKind
  width: number
  height: number
}

export interface LoadedSource {
  info: SourceInfo
  /** Object URL of a bounded-size PNG preview (never the multi-megapixel original). */
  previewUrl: string
  /** Pixels of the decoded base canvas, bounded by LIMITS.maxWorkingEdge. */
  baseWidth: number
  baseHeight: number
  /** Resizes the cached base image to the working size and reads pixels once (transferable buffer). */
  readPixels(width: number, height: number): ArrayBuffer
  release(): void
}

const REJECT_MESSAGES: Partial<Record<ImageKind, string>> = {
  svg: 'SVG files are already vector graphics. Choose a PNG, JPG, or WebP image instead.',
  gif: 'GIF files are not supported yet. Convert the image to PNG, JPG, or WebP first.',
  heic: 'HEIC/HEIF photos are not supported yet. Export the image as JPG or PNG first.',
  pdf: 'PDF files are not supported. Export the page as PNG or JPG first.',
  tiff: 'TIFF files are not supported. Export the image as PNG or JPG first.',
  bmp: 'BMP files are not supported. Export the image as PNG or JPG first.',
}

const formatMB = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`

export function checkBrowserSupport(): string | null {
  if (typeof createImageBitmap !== 'function') return 'This browser cannot decode images locally (createImageBitmap is unavailable). Try a current version of Chrome, Edge, Firefox, or Safari.'
  if (typeof Worker === 'undefined') return 'This browser does not support Web Workers, which VectorMint needs to trace images without freezing the page.'
  return null
}

async function inspect(file: File): Promise<SourceInfo> {
  if (file.size === 0) throw new InputError('This file is empty.')
  if (file.size > LIMITS.maxFileBytes) throw new InputError(`This file is ${formatMB(file.size)}. The limit is ${formatMB(LIMITS.maxFileBytes)}.`)
  const head = new Uint8Array(await file.slice(0, 256 * 1024).arrayBuffer())
  const sniffed = sniffImage(head)
  const reject = REJECT_MESSAGES[sniffed.kind]
  if (reject) throw new InputError(reject)
  if (sniffed.kind === 'unknown') throw new InputError(`This doesn't look like a supported image. Use ${SUPPORTED_LABEL}.`)
  if (sniffed.animated) throw new InputError('Animated images are not supported. Export a single frame as PNG, JPG, or WebP first.')

  let { width, height } = sniffed
  if (!width || !height) {
    // Header not parsed (e.g. AVIF): decode once just to learn the size; this also proves it decodes.
    try {
      const bmp = await createImageBitmap(file)
      width = bmp.width; height = bmp.height
      bmp.close()
    } catch {
      throw new InputError('This image could not be decoded. It may be corrupt, or your browser may not support this format.')
    }
  }
  if (width < 1 || height < 1) throw new InputError('This image has invalid dimensions.')
  if (width * height > LIMITS.maxSourcePixels) {
    throw new InputError(`This image is ${width} × ${height} (${(width * height / 1e6).toFixed(1)} megapixels). The limit is ${LIMITS.maxSourcePixels / 1e6} megapixels.`)
  }
  return { name: file.name, bytes: file.size, kind: sniffed.kind, width, height }
}

function canvas2d(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new InputError('This browser could not create a drawing surface for the image.')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  return { canvas, ctx }
}

/** Validates and decodes a file exactly once, into a base canvas bounded by the largest working edge. */
export async function loadSource(file: File): Promise<LoadedSource> {
  const unsupported = checkBrowserSupport()
  if (unsupported) throw new InputError(unsupported)
  const info = await inspect(file)

  const scale = Math.min(1, LIMITS.maxWorkingEdge / Math.max(info.width, info.height))
  const bw = Math.max(1, Math.round(info.width * scale))
  const bh = Math.max(1, Math.round(info.height * scale))

  let bitmap: ImageBitmap
  try {
    // Resize while decoding where supported so a large image is never fully materialised.
    bitmap = scale < 1
      ? await createImageBitmap(file, { resizeWidth: bw, resizeHeight: bh, resizeQuality: 'high' })
      : await createImageBitmap(file)
  } catch {
    try { bitmap = await createImageBitmap(file) } catch {
      throw new InputError('This image could not be decoded. It may be corrupt, or your browser may not support this format.')
    }
  }
  const { canvas, ctx } = canvas2d(bw, bh)
  ctx.drawImage(bitmap, 0, 0, bw, bh)
  bitmap.close()

  const previewBlob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'))
  if (!previewBlob) throw new InputError('This image could not be prepared for preview.')
  const previewUrl = URL.createObjectURL(previewBlob)
  let released = false

  return {
    info,
    previewUrl,
    baseWidth: bw,
    baseHeight: bh,
    readPixels(width, height) {
      if (released) throw new Error('Source has been released.')
      if (width === bw && height === bh) return ctx.getImageData(0, 0, bw, bh).data.buffer as ArrayBuffer
      const scratch = canvas2d(width, height)
      scratch.ctx.drawImage(canvas, 0, 0, width, height)
      const buf = scratch.ctx.getImageData(0, 0, width, height).data.buffer as ArrayBuffer
      scratch.canvas.width = 0; scratch.canvas.height = 0
      return buf
    },
    release() {
      if (released) return
      released = true
      URL.revokeObjectURL(previewUrl)
      canvas.width = 0; canvas.height = 0
    },
  }
}
