/** Content-based image sniffing (no DOM). The file extension is never trusted on its own. */

export type ImageKind = 'png' | 'jpeg' | 'webp' | 'avif' | 'gif' | 'svg' | 'heic' | 'pdf' | 'tiff' | 'bmp' | 'unknown'

export interface Sniffed {
  kind: ImageKind
  animated: boolean
  /** Header-declared dimensions (EXIF-orientation corrected for JPEG), if cheaply readable. */
  width?: number
  height?: number
}

const ascii = (b: Uint8Array, start: number, len: number) => String.fromCharCode(...b.subarray(start, start + len))
const u32be = (b: Uint8Array, o: number) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0

function sniffPng(b: Uint8Array): Sniffed {
  const width = u32be(b, 16), height = u32be(b, 20)
  let animated = false
  let o = 8
  while (o + 8 <= b.length) {
    const len = u32be(b, o)
    const type = ascii(b, o + 4, 4)
    if (type === 'acTL') { animated = true; break }
    if (type === 'IDAT') break
    o += 12 + len
  }
  return { kind: 'png', animated, width, height }
}

function jpegOrientation(b: Uint8Array, start: number, end: number): number {
  // start points at the "Exif\0\0" marker inside an APP1 segment
  const t = start + 6
  if (t + 8 > end) return 1
  const le = b[t] === 0x49
  const u16 = (o: number) => (le ? b[o] | (b[o + 1] << 8) : (b[o] << 8) | b[o + 1])
  const u32 = (o: number) => (le ? (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0 : u32be(b, o))
  const ifd = t + u32(t + 4)
  if (ifd + 2 > end) return 1
  const n = u16(ifd)
  for (let i = 0; i < n; i++) {
    const e = ifd + 2 + i * 12
    if (e + 12 > end) break
    if (u16(e) === 0x0112) return u16(e + 8)
  }
  return 1
}

function sniffJpeg(b: Uint8Array): Sniffed {
  let o = 2
  let orientation = 1
  while (o + 4 < b.length) {
    if (b[o] !== 0xff) { o++; continue }
    const marker = b[o + 1]
    if (marker === 0xff) { o++; continue }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { o += 2; continue }
    const len = (b[o + 2] << 8) | b[o + 3]
    if (marker === 0xe1 && ascii(b, o + 4, 4) === 'Exif') orientation = jpegOrientation(b, o + 4, o + 2 + len)
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
    if (isSof) {
      let height = (b[o + 5] << 8) | b[o + 6]
      let width = (b[o + 7] << 8) | b[o + 8]
      if (orientation >= 5 && orientation <= 8) [width, height] = [height, width]
      return { kind: 'jpeg', animated: false, width, height }
    }
    o += 2 + len
  }
  return { kind: 'jpeg', animated: false }
}

function sniffWebp(b: Uint8Array): Sniffed {
  const chunk = ascii(b, 12, 4)
  const d = 20
  if (chunk === 'VP8X') {
    const animated = (b[d] & 0x02) !== 0
    const width = 1 + (b[d + 4] | (b[d + 5] << 8) | (b[d + 6] << 16))
    const height = 1 + (b[d + 7] | (b[d + 8] << 8) | (b[d + 9] << 16))
    return { kind: 'webp', animated, width, height }
  }
  if (chunk === 'VP8 ') {
    return { kind: 'webp', animated: false, width: (b[d + 6] | (b[d + 7] << 8)) & 0x3fff, height: (b[d + 8] | (b[d + 9] << 8)) & 0x3fff }
  }
  if (chunk === 'VP8L' && b[d] === 0x2f) {
    const bits = b[d + 1] | (b[d + 2] << 8) | (b[d + 3] << 16) | (b[d + 4] * 2 ** 24)
    return { kind: 'webp', animated: false, width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 }
  }
  return { kind: 'webp', animated: false }
}

export function sniffImage(b: Uint8Array): Sniffed {
  const none: Sniffed = { kind: 'unknown', animated: false }
  if (b.length < 12) return none
  if (b[0] === 0x89 && ascii(b, 1, 3) === 'PNG') return sniffPng(b)
  if (b[0] === 0xff && b[1] === 0xd8) return sniffJpeg(b)
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') return sniffWebp(b)
  if (ascii(b, 0, 4) === 'GIF8') return { kind: 'gif', animated: true }
  if (ascii(b, 4, 4) === 'ftyp') {
    const brands = ascii(b, 8, Math.min(24, b.length - 8))
    if (/avif|avis/.test(brands)) return { kind: 'avif', animated: false }
    if (/heic|heix|hevc|hevx|mif1|msf1/.test(brands)) return { kind: 'heic', animated: false }
  }
  if (ascii(b, 0, 4) === '%PDF') return { kind: 'pdf', animated: false }
  if ((b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a && b[3] === 0) || (b[0] === 0x4d && b[1] === 0x4d && b[2] === 0 && b[3] === 0x2a)) return { kind: 'tiff', animated: false }
  if (b[0] === 0x42 && b[1] === 0x4d) return { kind: 'bmp', animated: false }
  const head = new TextDecoder().decode(b.subarray(0, Math.min(b.length, 512))).replace(/^\uFEFF/, '').trimStart().toLowerCase()
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) return { kind: 'svg', animated: false }
  return none
}
