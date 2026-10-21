import type { AdvancedSettings, ColorCount, DetailLevel, PresetId, TraceSettings } from './types'

export interface PresetInfo {
  id: PresetId
  label: string
  blurb: string
  defaultColors: ColorCount
  /** Highest colour count offered for this preset. */
  maxColors: ColorCount
  /** Hard cap on working edge for this preset. */
  edgeCap: number
  defaultBlur: number
  notice?: string
}

export const PRESETS: Record<PresetId, PresetInfo> = {
  logo: {
    id: 'logo', label: 'Logo / Flat Artwork', blurb: 'Limited palette, clean edges. Best for icons and logos.',
    defaultColors: 8, maxColors: 32, edgeCap: 1800, defaultBlur: 0,
  },
  bw: {
    id: 'bw', label: 'Black and White', blurb: 'Thresholds to ink and paper. Good for signatures, scans, and line art.',
    defaultColors: 2, maxColors: 2, edgeCap: 1800, defaultBlur: 0,
  },
  illustration: {
    id: 'illustration', label: 'Illustration', blurb: 'More colours and detail with balanced simplification.',
    defaultColors: 16, maxColors: 32, edgeCap: 1800, defaultBlur: 0,
  },
  photo: {
    id: 'photo', label: 'Photo / Posterized', blurb: 'Turns photos into simplified colour regions.',
    defaultColors: 16, maxColors: 16, edgeCap: 1000, defaultBlur: 1,
    notice: 'Photos become stylised artwork. Fine textures, gradients, and small text lose detail.',
  },
}

export const PRESET_ORDER: PresetId[] = ['logo', 'bw', 'illustration', 'photo']
export const COLOR_OPTIONS: ColorCount[] = [2, 4, 8, 16, 32]

interface DetailRow { curveTolerance: number; minRegion: number; maxEdge: number }
const DETAIL: Record<DetailLevel, DetailRow> = {
  low: { curveTolerance: 2.5, minRegion: 20, maxEdge: 800 },
  balanced: { curveTolerance: 1.5, minRegion: 10, maxEdge: 1200 },
  high: { curveTolerance: 0.8, minRegion: 4, maxEdge: 1800 },
}

export function advancedDefaults(preset: PresetId, detail: DetailLevel): AdvancedSettings {
  const row = DETAIL[detail]
  const info = PRESETS[preset]
  return {
    curveTolerance: row.curveTolerance,
    minRegion: preset === 'photo' ? Math.max(row.minRegion, 12) : row.minRegion,
    blur: info.defaultBlur,
    maxEdge: Math.min(row.maxEdge, info.edgeCap),
    threshold: 128,
    invert: false,
  }
}

export function defaultSettings(preset: PresetId = 'logo', detail: DetailLevel = 'balanced'): TraceSettings {
  return {
    preset,
    detail,
    colors: PRESETS[preset].defaultColors,
    background: 'transparent',
    backgroundColor: '#ffffff',
    advanced: advancedDefaults(preset, detail),
  }
}

/** Preset change keeps the user's detail level and background choices. */
export function withPreset(prev: TraceSettings, preset: PresetId): TraceSettings {
  const next = defaultSettings(preset, prev.detail)
  return { ...next, background: prev.background, backgroundColor: prev.backgroundColor }
}

export function withDetail(prev: TraceSettings, detail: DetailLevel): TraceSettings {
  const adv = advancedDefaults(prev.preset, detail)
  return { ...prev, detail, advanced: { ...adv, threshold: prev.advanced.threshold, invert: prev.advanced.invert } }
}

/** Working size: preserves aspect ratio, never upscales, bounded by settings and preset cap. */
export function workingSize(srcW: number, srcH: number, settings: Pick<TraceSettings, 'preset' | 'advanced'>) {
  const cap = Math.min(settings.advanced.maxEdge, PRESETS[settings.preset].edgeCap)
  const longest = Math.max(srcW, srcH)
  if (longest <= cap) return { width: srcW, height: srcH, resized: false }
  const s = cap / longest
  return { width: Math.max(1, Math.round(srcW * s)), height: Math.max(1, Math.round(srcH * s)), resized: true }
}

export function effectiveColors(settings: TraceSettings): ColorCount {
  return Math.min(settings.colors, PRESETS[settings.preset].maxColors) as ColorCount
}

/** Stable key of everything that influences the output. */
export function settingsKey(s: TraceSettings): string {
  const eff = s.preset === 'bw'
    ? { t: s.advanced.threshold, i: s.advanced.invert }
    : { c: effectiveColors(s) }
  return JSON.stringify([s.preset, s.detail, eff, s.background, s.background === 'solid' ? s.backgroundColor : '', s.advanced.curveTolerance, s.advanced.minRegion, s.advanced.blur, s.advanced.maxEdge])
}
