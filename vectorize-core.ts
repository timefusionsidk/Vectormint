import type { FromWorker, StartMessage, WorkerStage } from './types'
import { effectiveColors } from './presets'
import { binarizeAlpha, blurOpaque, buildPalette, snapToPalette, thresholdBlackWhite } from './preprocess'
import { traceImage } from './tracer-adapter'
import { buildSvg, toHex } from './svg-build'
import { checkSvgString } from './svg-validation'
import { LIMITS } from './limits'

type Emit = (msg: FromWorker) => void

/**
 * The whole tracing pipeline, DOM-free so the worker is a thin shell and tests can call it directly.
 * Mutates the transferred pixel buffer in place.
 */
export async function runVectorize(msg: StartMessage, emit: Emit): Promise<void> {
  const t0 = performance.now()
  const { jobId, width, height, settings } = msg
  const stage = (s: WorkerStage) => emit({ type: 'STAGE', jobId, stage: s })
  const fail = (code: 'empty' | 'invalid' | 'failed', message: string) => emit({ type: 'ERROR', jobId, code, message })

  try {
    const data = new Uint8ClampedArray(msg.pixels)
    if (data.length !== width * height * 4) return fail('invalid', 'The image data was not the expected size.')

    stage('prepare')
    const hasTransparency = binarizeAlpha(data)
    if (settings.advanced.blur > 0) blurOpaque(data, width, height, settings.advanced.blur)

    let palette: Array<{ r: number; g: number; b: number; a: number }>
    let skip: (i: number) => boolean

    if (settings.preset === 'bw') {
      const ink = thresholdBlackWhite(data, settings.advanced.threshold, settings.advanced.invert)
      if (ink === 0) return fail('empty', 'No dark areas were found at this threshold. Raise the threshold or toggle invert.')
      palette = [{ r: 0, g: 0, b: 0, a: 255 }, { r: 255, g: 255, b: 255, a: 255 }]
      skip = (i) => i === 1
    } else {
      stage('quantize')
      const colors = buildPalette(data, effectiveColors(settings))
      if (colors.length === 0) return fail('empty', 'This image is fully transparent, so there is nothing to trace.')
      snapToPalette(data, colors)
      palette = colors.map((c) => ({ ...c, a: 255 }))
      if (hasTransparency) palette.push({ r: 0, g: 0, b: 0, a: 0 })
      const transparentIndex = hasTransparency ? palette.length - 1 : -1
      skip = (i) => i === transparentIndex
    }

    stage('trace')
    const trace = await traceImage({
      width, height, data, palette,
      curveTolerance: settings.advanced.curveTolerance,
      minRegion: settings.advanced.minRegion,
    })

    const traced = trace.layers.reduce((n, l) => n + l.filter((p) => !p.isholepath).length, 0)
    if (traced > LIMITS.maxPaths) {
      return fail('failed', `This image produced about ${traced.toLocaleString()} shapes, which is too many for a usable SVG. Use Low detail, fewer colours, or the Photo / Posterized preset.`)
    }

    stage('svg')
    const { svg, pathCount } = buildSvg(trace, {
      skipLayer: skip,
      outWidth: msg.outWidth,
      outHeight: msg.outHeight,
      background: settings.background === 'solid' ? toHex(hexToRgb(settings.backgroundColor)) : null,
      precision: settings.advanced.curveTolerance < 1 ? 2 : 1,
      seam: settings.preset === 'bw' ? 0 : 0.4,
    })
    if (pathCount === 0) return fail('empty', 'No shapes were found. Try lower simplification or a smaller minimum region size.')
    const check = checkSvgString(svg)
    if (!check.ok) return fail('invalid', `The generated SVG failed validation (${check.problems.join(', ')}).`)

    emit({ type: 'COMPLETE', jobId, svg, pathCount, paletteSize: palette.length - (hasTransparency && settings.preset !== 'bw' ? 1 : 0), elapsedMs: Math.round(performance.now() - t0) })
  } catch (err) {
    fail('failed', err instanceof Error ? err.message : 'Vectorization failed.')
  }
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return { r: 255, g: 255, b: 255 }
  const n = parseInt(m[1], 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}
