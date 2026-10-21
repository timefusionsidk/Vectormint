import { Resvg } from '@resvg/resvg-js'
import { runVectorize } from '../../src/features/vectorizer/vectorize-core'
import { defaultSettings } from '../../src/features/vectorizer/presets'
import type { CompleteMessage, ErrorMessage, FromWorker, TraceSettings } from '../../src/features/vectorizer/types'
import type { Fixture } from './fixtures'

export async function trace(fx: Fixture, settings: TraceSettings = defaultSettings()) {
  const msgs: FromWorker[] = []
  await runVectorize({
    type: 'START', jobId: 1, width: fx.width, height: fx.height, outWidth: fx.width, outHeight: fx.height,
    pixels: fx.data.slice().buffer, settings,
  }, (m) => msgs.push(m))
  const done = msgs.find((m): m is CompleteMessage => m.type === 'COMPLETE')
  const err = msgs.find((m): m is ErrorMessage => m.type === 'ERROR')
  return { done, err, stages: msgs.filter((m) => m.type === 'STAGE').map((m) => (m as { stage: string }).stage) }
}

export function render(svg: string) {
  const r = new Resvg(svg, { fitTo: { mode: 'original' } }).render()
  const px = r.pixels
  return { width: r.width, height: r.height, at: (x: number, y: number) => { const i = (y * r.width + x) * 4; return { r: px[i], g: px[i + 1], b: px[i + 2], a: px[i + 3] } } }
}

export const near = (c: { r: number; g: number; b: number }, [r, g, b]: number[], tol = 40) =>
  Math.abs(c.r - r) <= tol && Math.abs(c.g - g) <= tol && Math.abs(c.b - b) <= tol
