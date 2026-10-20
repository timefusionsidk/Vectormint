import type { TraceData, TracerColor } from 'imagetracerjs'

export type { TraceData }

export interface TraceRequest {
  width: number
  height: number
  /** Pixels whose colours are exactly the palette colours (see preprocess.snapToPalette). */
  data: Uint8ClampedArray
  palette: TracerColor[]
  curveTolerance: number
  minRegion: number
}

/**
 * Typed adapter around ImageTracer.js. The library is loaded lazily on first use so the landing
 * page (and the main thread) never pays for it.
 *
 * Only the tracing half of the library is used: palette generation, blur and SVG string output are
 * handled by VectorMint (see preprocess.ts and svg-build.ts). The palette is passed explicitly with a
 * single quantisation cycle, so every pixel already matches a palette entry exactly.
 */
export async function traceImage(req: TraceRequest): Promise<TraceData> {
  const mod = await import('imagetracerjs')
  const tracer = (mod as { default?: typeof mod.default }).default ?? (mod as unknown as typeof mod.default)
  return tracer.imagedataToTracedata(
    { width: req.width, height: req.height, data: req.data },
    {
      pal: req.palette,
      numberofcolors: req.palette.length,
      colorquantcycles: 1,
      ltres: req.curveTolerance,
      qtres: req.curveTolerance,
      pathomit: req.minRegion,
      rightangleenhance: true,
      layering: 0,
      blurradius: 0,
    },
  )
}
