import { describe, expect, it } from 'vitest'
import { Resvg } from '@resvg/resvg-js'
import { sniffImage } from '../src/features/vectorizer/sniff'

const png = new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="37" height="21"><rect width="37" height="21" fill="red"/></svg>').render().asPng()
const te = (s: string) => new TextEncoder().encode(s)

describe('input validation by content', () => {
  it('reads PNG dimensions from the header', () => {
    expect(sniffImage(new Uint8Array(png))).toMatchObject({ kind: 'png', width: 37, height: 21, animated: false })
  })
  it('does not trust file extensions: SVG/PDF/GIF/HEIC/unknown are identified from bytes', () => {
    expect(sniffImage(te('<svg xmlns="http://www.w3.org/2000/svg"></svg>')).kind).toBe('svg')
    expect(sniffImage(te('%PDF-1.7 ....................')).kind).toBe('pdf')
    expect(sniffImage(te('GIF89a............')).kind).toBe('gif')
    expect(sniffImage(new Uint8Array([0, 0, 0, 24, ...te('ftypheic'), 0, 0, 0, 0, 0, 0, 0, 0])).kind).toBe('heic')
    expect(sniffImage(new Uint8Array([0, 0, 0, 24, ...te('ftypavif'), 0, 0, 0, 0, 0, 0, 0, 0])).kind).toBe('avif')
  })
  it('corrupt or random bytes are unknown (so they are rejected before decoding)', () => {
    expect(sniffImage(new Uint8Array(64).map((_, i) => (i * 37) & 255)).kind).toBe('unknown')
    expect(sniffImage(new Uint8Array(4)).kind).toBe('unknown')
  })
  it('flags APNG as animated', () => {
    const p = new Uint8Array(png)
    const out: number[] = [...p.subarray(0, 33)] // signature + IHDR chunk
    out.push(0, 0, 0, 8, ...te('acTL'), 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0)
    out.push(...p.subarray(33))
    expect(sniffImage(new Uint8Array(out)).animated).toBe(true)
  })
  it('swaps JPEG dimensions for EXIF rotation', () => {
    const tiff = [0x4d, 0x4d, 0, 0x2a, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0, 0, 0, 0, 0]
    const exif = [...te('Exif'), 0, 0, ...tiff]
    const app1 = [0xff, 0xe1, (exif.length + 2) >> 8, (exif.length + 2) & 255, ...exif]
    const sof = [0xff, 0xc0, 0, 11, 8, 0, 20, 0, 30, 1, 1, 0x11, 0]
    const jpg = new Uint8Array([0xff, 0xd8, ...app1, ...sof, 0xff, 0xd9, 0, 0, 0, 0])
    expect(sniffImage(jpg)).toMatchObject({ kind: 'jpeg', width: 20, height: 30 }) // 30×20 stored, rotated 90°
  })
})
