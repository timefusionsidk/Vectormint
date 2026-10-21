import { ChevronDown } from 'lucide-react'
import { COLOR_OPTIONS, PRESETS, PRESET_ORDER, withDetail, withPreset, workingSize } from '../presets'
import type { ColorCount, DetailLevel, PresetId, TraceSettings } from '../types'
import { track } from '@/lib/analytics'

interface Props {
  settings: TraceSettings
  onChange: (fn: (s: TraceSettings) => TraceSettings) => void
  sourceSize: { width: number; height: number }
  disabled: boolean
  advancedRef?: React.Ref<HTMLDetailsElement>
}

function Seg<T extends string | number>({ name, label, value, options, onChange, disabled }: {
  name: string; label: string; value: T; options: Array<{ value: T; label: string }>; onChange: (v: T) => void; disabled: boolean
}) {
  return (
    <fieldset disabled={disabled}>
      <legend className="field-label mb-1.5">{label}</legend>
      <div className="seg">
        {options.map((o) => (
          <label key={String(o.value)}>
            <input type="radio" name={name} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function SettingsPanel({ settings, onChange, sourceSize, disabled, advancedRef }: Props) {
  const info = PRESETS[settings.preset]
  const adv = settings.advanced
  const setAdv = (patch: Partial<TraceSettings['advanced']>) => onChange((s) => ({ ...s, advanced: { ...s.advanced, ...patch } }))
  const resolutionOptions = [600, 800, 1200, 1800].filter((n) => n <= info.edgeCap)
  const w = workingSize(sourceSize.width, sourceSize.height, settings)
  const bw = settings.preset === 'bw'

  return (
    <div className="space-y-5">
      <fieldset disabled={disabled}>
        <legend className="field-label mb-1.5">Preset</legend>
        <div className="grid gap-2">
          {PRESET_ORDER.map((id: PresetId) => (
            <label key={id} className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg border p-3 ${settings.preset === id ? 'border-accent bg-accent-soft' : 'border-line bg-panel'}`}>
              <input type="radio" name="vm-preset" className="mt-1 accent-[var(--accent)]" checked={settings.preset === id}
                onChange={() => { onChange((s) => withPreset(s, id)); track('preset_selected', { preset: id }) }} />
              <span><span className="block text-sm font-semibold">{PRESETS[id].label}{id === 'logo' ? ' (default)' : ''}</span><span className="field-help">{PRESETS[id].blurb}</span></span>
            </label>
          ))}
        </div>
        {info.notice && <p className="mt-2 rounded-lg bg-warn-soft px-3 py-2 text-sm">{info.notice}</p>}
      </fieldset>

      <Seg<DetailLevel> name="vm-detail" label="Detail" disabled={disabled} value={settings.detail}
        options={[{ value: 'low', label: 'Low' }, { value: 'balanced', label: 'Balanced' }, { value: 'high', label: 'High' }]}
        onChange={(d) => onChange((s) => withDetail(s, d))} />
      <p className="field-help -mt-3">Higher detail keeps smaller features and traces at a larger working size. It takes longer and makes bigger files.</p>

      {bw ? (
        <div>
          <label htmlFor="vm-threshold" className="field-label">Threshold: {adv.threshold}</label>
          <input id="vm-threshold" type="range" min={1} max={254} step={1} value={adv.threshold} disabled={disabled} onChange={(e) => setAdv({ threshold: Number(e.target.value) })} />
          <p className="field-help">Pixels darker than this become ink. Raise it to catch fainter strokes.</p>
          <label className="mt-2 flex min-h-[44px] cursor-pointer items-center gap-3 text-sm font-semibold">
            <input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={adv.invert} disabled={disabled} onChange={(e) => setAdv({ invert: e.target.checked })} />
            Invert black and white
          </label>
          <p className="field-help">Trace the light areas instead, for example white writing on a dark background.</p>
        </div>
      ) : (
        <div>
          <Seg<ColorCount> name="vm-colors" label="Number of colours" disabled={disabled} value={Math.min(settings.colors, info.maxColors) as ColorCount}
            options={COLOR_OPTIONS.filter((c) => c <= info.maxColors).map((c) => ({ value: c, label: String(c) }))}
            onChange={(c) => onChange((s) => ({ ...s, colors: c }))} />
          <p className="field-help mt-1.5">More colours keep more tones but create more shapes. Images with fewer colours use fewer than you pick.</p>
        </div>
      )}

      <Seg<TraceSettings['background']> name="vm-bg" label="Background" disabled={disabled} value={settings.background}
        options={[{ value: 'transparent', label: 'Transparent' }, { value: 'solid', label: 'Solid colour' }]}
        onChange={(b) => onChange((s) => ({ ...s, background: b }))} />
      {settings.background === 'solid' && (
        <label className="flex min-h-[44px] items-center gap-3 text-sm font-semibold">
          <input type="color" className="h-10 w-14 cursor-pointer rounded border border-line bg-panel" value={settings.backgroundColor} disabled={disabled} onChange={(e) => onChange((s) => ({ ...s, backgroundColor: e.target.value }))} />
          Background colour
        </label>
      )}
      <p className="field-help -mt-3">Transparent keeps cut-outs from PNG and WebP files. Opaque images keep their own background as a shape.</p>

      <details ref={advancedRef} className="group rounded-lg border border-line">
        <summary className="flex min-h-[44px] items-center justify-between px-3 text-sm font-semibold">
          Advanced settings <ChevronDown size={18} className="transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="space-y-5 border-t border-line p-3">
          <div>
            <label htmlFor="vm-curve" className="field-label">Curve simplification: {adv.curveTolerance.toFixed(1)}</label>
            <input id="vm-curve" type="range" min={0.4} max={4} step={0.1} value={adv.curveTolerance} disabled={disabled} onChange={(e) => setAdv({ curveTolerance: Number(e.target.value) })} />
            <p className="field-help">Maximum allowed error, in traced pixels, when fitting lines and curves. Higher is smoother and smaller.</p>
          </div>
          <div>
            <label htmlFor="vm-minregion" className="field-label">Small-region filter: {adv.minRegion}</label>
            <input id="vm-minregion" type="range" min={0} max={60} step={1} value={adv.minRegion} disabled={disabled} onChange={(e) => setAdv({ minRegion: Number(e.target.value) })} />
            <p className="field-help">Drops specks whose outline is shorter than this. Raise it to remove noise and scanner dust.</p>
          </div>
          <div>
            <label htmlFor="vm-blur" className="field-label">Pre-blur: {adv.blur === 0 ? 'off' : `${adv.blur} px`}</label>
            <input id="vm-blur" type="range" min={0} max={3} step={1} value={adv.blur} disabled={disabled} onChange={(e) => setAdv({ blur: Number(e.target.value) })} />
            <p className="field-help">A light blur before colour reduction smooths JPEG noise and grain. It also softens fine detail.</p>
          </div>
          <div>
            <label htmlFor="vm-res" className="field-label">Working resolution</label>
            <select id="vm-res" className="mt-1 block min-h-[44px] w-full rounded-lg border border-line bg-panel px-3" value={Math.min(adv.maxEdge, info.edgeCap)} disabled={disabled} onChange={(e) => setAdv({ maxEdge: Number(e.target.value) })}>
              {resolutionOptions.map((n) => <option key={n} value={n}>Longest edge up to {n} px</option>)}
            </select>
            <p className="field-help">Larger sizes keep detail but take longer. Images are never enlarged for tracing.</p>
          </div>
        </div>
      </details>

      <p className="text-sm text-muted" aria-live="polite">
        {w.resized
          ? `To keep processing fast, this image will be traced at ${w.width} × ${w.height} pixels.`
          : `This image will be traced at its original size, ${w.width} × ${w.height} pixels.`}
      </p>
    </div>
  )
}
