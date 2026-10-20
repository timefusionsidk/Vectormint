import type { TraceData, TracerPath } from 'imagetracerjs'

export interface BuildOptions {
  /** Palette indices whose layers are not emitted (paper, transparent). */
  skipLayer: (index: number) => boolean
  outWidth: number
  outHeight: number
  /** Solid background fill (#rrggbb) or null for none. */
  background: string | null
  /** Decimal places for coordinates. */
  precision: number
  /** Stroke width (trace pixels) that closes hairline seams between adjacent colour regions; 0 for none. */
  seam: number
}

const hex = (n: number) => n.toString(16).padStart(2, '0')
export const toHex = (c: { r: number; g: number; b: number }) => `#${hex(c.r)}${hex(c.g)}${hex(c.b)}`

function pathData(layer: TracerPath[], p: TracerPath, f: (n: number) => string): string {
  const parts: string[] = []
  const first = p.segments[0]
  parts.push(`M${f(first.x1)} ${f(first.y1)}`)
  for (const s of p.segments) {
    parts.push(s.type === 'Q' && s.x3 !== undefined && s.y3 !== undefined
      ? `Q${f(s.x2)} ${f(s.y2)} ${f(s.x3)} ${f(s.y3)}`
      : `L${f(s.x2)} ${f(s.y2)}`)
  }
  parts.push('Z')
  // Holes are emitted as reversed sub-paths inside the parent so the default nonzero fill cuts them out.
  for (const hi of p.holechildren) {
    const h = layer[hi]
    if (!h || h.segments.length === 0) continue
    const last = h.segments[h.segments.length - 1]
    const sx = last.type === 'Q' && last.x3 !== undefined ? last.x3 : last.x2
    const sy = last.type === 'Q' && last.y3 !== undefined ? last.y3 : last.y2
    parts.push(`M${f(sx)} ${f(sy)}`)
    for (let i = h.segments.length - 1; i >= 0; i--) {
      const s = h.segments[i]
      parts.push(s.type === 'Q' && s.x3 !== undefined
        ? `Q${f(s.x2)} ${f(s.y2)} ${f(s.x1)} ${f(s.y1)}`
        : `L${f(s.x1)} ${f(s.y1)}`)
    }
    parts.push('Z')
  }
  return parts.join('')
}

/** Serialises traced vector data to a self-contained, vector-only SVG string. */
export function buildSvg(trace: TraceData, opts: BuildOptions): { svg: string; pathCount: number } {
  const f = (n: number) => String(+n.toFixed(opts.precision))
  const out: string[] = []
  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${opts.outWidth}" height="${opts.outHeight}" viewBox="0 0 ${trace.width} ${trace.height}">`,
  )
  if (opts.background) out.push(`<rect width="${trace.width}" height="${trace.height}" fill="${opts.background}"/>`)
  let pathCount = 0
  trace.layers.forEach((layer, li) => {
    if (opts.skipLayer(li)) return
    const ds: string[] = []
    for (const p of layer) {
      if (p.isholepath || p.segments.length < 2) continue
      ds.push(`<path d="${pathData(layer, p, f)}"/>`)
      pathCount++
    }
    if (ds.length === 0) return
    const fill = toHex(trace.palette[li])
    const stroke = opts.seam > 0 ? ` stroke="${fill}" stroke-width="${opts.seam}" stroke-linejoin="round"` : ''
    out.push(`<g fill="${fill}"${stroke}>${ds.join('')}</g>`)
  })
  out.push('</svg>')
  return { svg: out.join(''), pathCount }
}
