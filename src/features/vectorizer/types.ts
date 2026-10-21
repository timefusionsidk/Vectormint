export type PresetId = 'logo' | 'bw' | 'illustration' | 'photo'
export type DetailLevel = 'low' | 'balanced' | 'high'
export type ColorCount = 2 | 4 | 8 | 16 | 32
export type BackgroundMode = 'transparent' | 'solid'

export interface AdvancedSettings {
  /** Straight-line / curve error threshold in working pixels (ImageTracer ltres + qtres). */
  curveTolerance: number
  /** Regions with a shorter outline than this many edge nodes are dropped (ImageTracer pathomit). */
  minRegion: number
  /** Box-blur radius applied before colour reduction (0 disables). */
  blur: number
  /** Longest edge of the image used for tracing. */
  maxEdge: number
  /** Black-and-white threshold, 0–255 (pixels darker than this become ink). */
  threshold: number
  invert: boolean
}

export interface TraceSettings {
  preset: PresetId
  detail: DetailLevel
  colors: ColorCount
  background: BackgroundMode
  backgroundColor: string
  advanced: AdvancedSettings
}

export interface StartMessage {
  type: 'START'
  jobId: number
  /** Working (traced) dimensions. */
  width: number
  height: number
  /** Dimensions the exported SVG declares (original aspect ratio). */
  outWidth: number
  outHeight: number
  pixels: ArrayBuffer
  settings: TraceSettings
}

export type WorkerStage = 'prepare' | 'quantize' | 'trace' | 'svg'

export interface StageMessage { type: 'STAGE'; jobId: number; stage: WorkerStage }
export interface CompleteMessage {
  type: 'COMPLETE'
  jobId: number
  svg: string
  pathCount: number
  paletteSize: number
  elapsedMs: number
}
export interface ErrorMessage { type: 'ERROR'; jobId: number; code: 'empty' | 'invalid' | 'failed'; message: string }

export type ToWorker = StartMessage
export type FromWorker = StageMessage | CompleteMessage | ErrorMessage

export const STAGE_LABEL: Record<WorkerStage, string> = {
  prepare: 'Preparing image',
  quantize: 'Simplifying colours',
  trace: 'Tracing shapes on your device…',
  svg: 'Preparing SVG',
}
