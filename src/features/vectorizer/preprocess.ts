/** Pure, DOM-free pixel preprocessing. Works on RGBA Uint8ClampedArray; runs in the worker and in tests. */

export interface RGB { r: number; g: number; b: number }

const ALPHA_CUTOFF = 128

/**
 * Collapses alpha to fully opaque or fully transparent (cut-out at 50%).
 * Fully transparent pixels get RGB 0 so they never influence colour work.
 * Returns true if any transparent pixel exists.
 */
export function binarizeAlpha(data: Uint8ClampedArray): boolean {
  let transparent = false
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < ALPHA_CUTOFF) {
      data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 0
      transparent = true
    } else {
      data[i + 3] = 255
    }
  }
  return transparent
}

/** Alpha-aware separable box blur on opaque pixels (transparent pixels neither contribute nor change). */
export function blurOpaque(data: Uint8ClampedArray, w: number, h: number, radius: number): void {
  if (radius < 1) return
  const r = Math.floor(radius)
  const tmp = new Uint8ClampedArray(data.length)
  const pass = (src: Uint8ClampedArray, dst: Uint8ClampedArray, horizontal: boolean) => {
    const outer = horizontal ? h : w
    const inner = horizontal ? w : h
    for (let o = 0; o < outer; o++) {
      for (let n = 0; n < inner; n++) {
        const idx = ((horizontal ? o * w + n : n * w + o)) * 4
        if (src[idx + 3] === 0) { dst[idx + 3] = 0; continue }
        let sr = 0, sg = 0, sb = 0, c = 0
        for (let k = -r; k <= r; k++) {
          const m = n + k
          if (m < 0 || m >= inner) continue
          const j = ((horizontal ? o * w + m : m * w + o)) * 4
          if (src[j + 3] === 0) continue
          sr += src[j]; sg += src[j + 1]; sb += src[j + 2]; c++
        }
        dst[idx] = sr / c; dst[idx + 1] = sg / c; dst[idx + 2] = sb / c; dst[idx + 3] = 255
      }
    }
  }
  pass(data, tmp, true)
  pass(tmp, data, false)
}

const bucket = (r: number, g: number, b: number) => ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)

/**
 * Deterministic median-cut palette from opaque pixels only.
 * Returns at most `k` colours (fewer if the image has fewer distinct colours).
 */
export function buildPalette(data: Uint8ClampedArray, k: number): RGB[] {
  const count = new Uint32Array(32768)
  const sr = new Float64Array(32768), sg = new Float64Array(32768), sb = new Float64Array(32768)
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue
    const b = bucket(data[i], data[i + 1], data[i + 2])
    count[b]++; sr[b] += data[i]; sg[b] += data[i + 1]; sb[b] += data[i + 2]
  }
  const all: number[] = []
  for (let b = 0; b < 32768; b++) if (count[b] > 0) all.push(b)
  if (all.length === 0) return []

  const chan = (b: number, c: 0 | 1 | 2) => (c === 0 ? b >> 10 : c === 1 ? (b >> 5) & 31 : b & 31)
  interface Box { idx: number[]; total: number; axis: 0 | 1 | 2; range: number }
  const describe = (idx: number[]): Box => {
    let total = 0
    const lo = [31, 31, 31], hi = [0, 0, 0]
    for (const b of idx) {
      total += count[b]
      for (const c of [0, 1, 2] as const) {
        const v = chan(b, c)
        if (v < lo[c]) lo[c] = v
        if (v > hi[c]) hi[c] = v
      }
    }
    const ranges = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]]
    const axis = (ranges[1] >= ranges[0] && ranges[1] >= ranges[2] ? 1 : ranges[0] >= ranges[2] ? 0 : 2) as 0 | 1 | 2
    return { idx, total, axis, range: ranges[axis] }
  }

  const boxes: Box[] = [describe(all)]
  while (boxes.length < k) {
    let best = -1, bestScore = 0
    for (let i = 0; i < boxes.length; i++) {
      const bx = boxes[i]
      if (bx.idx.length < 2 || bx.range === 0) continue
      const score = bx.total * (bx.range + 1)
      if (score > bestScore) { bestScore = score; best = i }
    }
    if (best < 0) break
    const bx = boxes[best]
    const sorted = [...bx.idx].sort((a, b) => chan(a, bx.axis) - chan(b, bx.axis) || a - b)
    let acc = 0, cut = 1
    for (let i = 0; i < sorted.length - 1; i++) {
      acc += count[sorted[i]]
      cut = i + 1
      if (acc >= bx.total / 2) break
    }
    boxes.splice(best, 1, describe(sorted.slice(0, cut)), describe(sorted.slice(cut)))
  }

  return boxes.map((bx) => {
    let n = 0, r = 0, g = 0, b = 0
    for (const i of bx.idx) { n += count[i]; r += sr[i]; g += sg[i]; b += sb[i] }
    return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) }
  })
}

/**
 * Snaps every opaque pixel to its nearest palette colour (written back into `data`)
 * so the tracer sees exact palette colours. Transparent pixels stay (0,0,0,0).
 */
export function snapToPalette(data: Uint8ClampedArray, palette: RGB[]): void {
  if (palette.length === 0) return
  const cache = new Int16Array(32768).fill(-1)
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue
    const key = bucket(data[i], data[i + 1], data[i + 2])
    let ci = cache[key]
    if (ci < 0) {
      const r = data[i], g = data[i + 1], b = data[i + 2]
      let best = Infinity
      for (let k = 0; k < palette.length; k++) {
        const dr = palette[k].r - r, dg = palette[k].g - g, db = palette[k].b - b
        const d = 2 * dr * dr + 4 * dg * dg + 3 * db * db
        if (d < best) { best = d; ci = k }
      }
      cache[key] = ci
    }
    const p = palette[ci]
    data[i] = p.r; data[i + 1] = p.g; data[i + 2] = p.b
  }
}

/**
 * Black-and-white: opaque pixels darker than `threshold` become ink (black),
 * everything else — including transparent pixels — becomes paper (white, opaque).
 * `invert` swaps which side is ink. Returns the ink pixel count.
 */
export function thresholdBlackWhite(data: Uint8ClampedArray, threshold: number, invert: boolean): number {
  let ink = 0
  for (let i = 0; i < data.length; i += 4) {
    let isInk = false
    if (data[i + 3] !== 0) {
      const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      isInk = invert ? luma >= threshold : luma < threshold
    }
    const v = isInk ? 0 : 255
    data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = 255
    if (isInk) ink++
  }
  return ink
}
