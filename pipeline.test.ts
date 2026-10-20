import { describe, expect, it } from 'vitest'
import { checkSvgString } from '../src/features/vectorizer/svg-validation'
import { defaultSettings, withDetail, withPreset, workingSize, effectiveColors } from '../src/features/vectorizer/presets'
import { LIMITS } from '../src/features/vectorizer/limits'
import { photo, signature, transparentRing, twoColour } from './support/fixtures'
import { near, render, trace } from './support/run'

describe('vector output', () => {
  it('two-colour geometry: real paths, no raster, correct colours', async () => {
    const { done, stages } = await trace(twoColour())
    expect(done).toBeTruthy()
    const svg = done!.svg
    expect(checkSvgString(svg).ok).toBe(true)
    expect(svg).toContain('<path')
    expect(svg).not.toMatch(/<image|base64|href/i)
    expect(stages).toEqual(['prepare', 'quantize', 'trace', 'svg'])
    const img = render(svg)
    expect(near(img.at(40, 40), [220, 30, 30])).toBe(true)
    expect(near(img.at(90, 40), [30, 60, 220])).toBe(true)
    expect(near(img.at(5, 5), [255, 255, 255])).toBe(true)
    expect(done!.paletteSize).toBe(3)
  })

  it('transparent icon: hole and outside stay transparent, no black fill', async () => {
    const { done } = await trace(transparentRing())
    const svg = done!.svg
    expect(svg).not.toContain('<rect')
    expect([...svg.matchAll(/fill="(#[0-9a-f]{6})"/g)].map((m) => m[1])).toEqual(['#008080'])
    const img = render(svg)
    expect(img.at(50, 50).a).toBe(0) // hole
    expect(img.at(2, 2).a).toBe(0) // outside
    expect(img.at(50, 20).a).toBe(255) // ring body (r≈30)
    expect(near(img.at(50, 20), [0, 128, 128])).toBe(true)
  })

  it('solid background fills outside and hole', async () => {
    const s = { ...defaultSettings(), background: 'solid' as const, backgroundColor: '#ffffff' }
    const { done } = await trace(transparentRing(), s)
    const img = render(done!.svg)
    expect(img.at(2, 2)).toMatchObject({ r: 255, g: 255, b: 255, a: 255 })
    expect(img.at(50, 50)).toMatchObject({ r: 255, g: 255, b: 255, a: 255 })
    expect(near(img.at(50, 20), [0, 128, 128])).toBe(true)
  })

  it('black and white: ink only, threshold and invert are real', async () => {
    const bw = withPreset(defaultSettings(), 'bw')
    const { done } = await trace(signature(), bw)
    const img = render(done!.svg)
    expect(img.at(1, 1).a).toBe(0) // paper is not emitted
    const cy = Math.round(40 + Math.sin(100 / 14) * 18)
    expect(img.at(100, cy)).toMatchObject({ r: 0, g: 0, b: 0, a: 255 })
    expect([...done!.svg.matchAll(/fill="(#[0-9a-f]{6})"/g)].every((m) => m[1] === '#000000')).toBe(true)

    const inv = { ...bw, advanced: { ...bw.advanced, invert: true } }
    const r2 = await trace(signature(), inv)
    const img2 = render(r2.done!.svg)
    expect(img2.at(1, 1)).toMatchObject({ r: 0, g: 0, b: 0, a: 255 }) // paper became ink
    expect(img2.at(100, cy).a).toBe(0) // stroke became empty

    const none = await trace(signature(), { ...bw, advanced: { ...bw.advanced, threshold: 0 } })
    expect(none.err?.code).toBe('empty')
  })

  it('colour count and detail change real output', async () => {
    const base = withPreset(defaultSettings(), 'illustration')
    const c2 = await trace(photo(), { ...base, colors: 2 })
    const c16 = await trace(photo(), { ...base, colors: 16 })
    expect(c2.done!.paletteSize).toBe(2)
    expect(c16.done!.paletteSize).toBeGreaterThan(8)
    expect(c16.done!.pathCount).toBeGreaterThan(c2.done!.pathCount)

    const low = await trace(photo(), withDetail({ ...base, colors: 8 }, 'low'))
    const high = await trace(photo(), withDetail({ ...base, colors: 8 }, 'high'))
    expect(high.done!.svg.length).toBeGreaterThan(low.done!.svg.length)
  })

  it('declared output size is independent of the traced size (correct viewBox)', async () => {
    const fx = twoColour()
    const msgs: unknown[] = []
    const { runVectorize } = await import('../src/features/vectorizer/vectorize-core')
    await runVectorize({ type: 'START', jobId: 1, width: fx.width, height: fx.height, outWidth: 480, outHeight: 320, pixels: fx.data.slice().buffer, settings: defaultSettings() }, (m) => msgs.push(m))
    const svg = (msgs.find((m) => (m as { type: string }).type === 'COMPLETE') as { svg: string }).svg
    expect(svg).toMatch(/width="480" height="320" viewBox="0 0 120 80"/)
  })
})

describe('bounds and limits', () => {
  it('bounds large inputs before tracing and never upscales', () => {
    const s = defaultSettings()
    expect(workingSize(6000, 4000, s)).toEqual({ width: 1200, height: 800, resized: true })
    expect(workingSize(400, 300, s)).toEqual({ width: 400, height: 300, resized: false })
    const photoS = withPreset(s, 'photo')
    expect(Math.max(workingSize(6000, 4000, photoS).width, workingSize(6000, 4000, photoS).height)).toBe(1000)
    const high = withDetail(s, 'high')
    expect(workingSize(6000, 4000, high).width).toBe(1800)
    expect(LIMITS.maxSourcePixels).toBe(24_000_000)
  })

  it('photo preset caps colours', () => {
    expect(effectiveColors({ ...withPreset(defaultSettings(), 'photo'), colors: 32 })).toBe(16)
  })
})
