/** Small deterministic RGBA fixtures generated in code (no binary assets). */
export interface Fixture { width: number; height: number; data: Uint8ClampedArray }

function make(width: number, height: number, fn: (x: number, y: number) => [number, number, number, number]): Fixture {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const [r, g, b, a] = fn(x, y)
    const i = (y * width + x) * 4
    data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a
  }
  return { width, height, data }
}

const hash = (x: number, y: number) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295 }

/** 1. Two-colour geometry: red square and blue disc on white. */
export const twoColour = () => make(120, 80, (x, y) => {
  if (x >= 20 && x < 60 && y >= 20 && y < 60) return [220, 30, 30, 255]
  if ((x - 90) ** 2 + (y - 40) ** 2 < 400) return [30, 60, 220, 255]
  return [255, 255, 255, 255]
})

/** 2. Transparent teal ring (hole in the middle). Edge pixels use partial alpha. */
export const transparentRing = () => make(100, 100, (x, y) => {
  const d = Math.hypot(x - 49.5, y - 49.5)
  if (d <= 40 && d >= 20) return [0, 128, 128, 255]
  if (d > 40 && d <= 41) return [0, 128, 128, 200]
  if (d > 41 && d <= 42) return [0, 128, 128, 90]
  return [0, 0, 0, 0]
})

/** 3. Signature-style: thin black sine stroke on white. */
export const signature = () => make(200, 80, (x, y) => {
  const cy = 40 + Math.sin(x / 14) * 18
  return Math.abs(y - cy) < 2.5 ? [10, 10, 10, 255] : [255, 255, 255, 255]
})

/** 4. Small "photograph": smooth colour field with mild noise. */
export const photo = (n = 96) => make(n, n, (x, y) => {
  const nz = (hash(x, y) - 0.5) * 24
  return [128 + 120 * Math.sin(x / 11) + nz, 128 + 120 * Math.cos(y / 13) + nz, 128 + 120 * Math.sin((x + y) / 17) + nz, 255]
})

/** Noisy, many-colour image used to make tracing slow (cancellation test). */
export const heavy = (n = 1500) => make(n, n, (x, y) => [hash(x >> 1, y >> 1) * 255, hash(y >> 1, x >> 1) * 255, hash((x + y) >> 1, 7) * 255, 255])
