import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { InputError, loadSource, type LoadedSource } from './decode'
import { defaultSettings, settingsKey, workingSize } from './presets'
import type { PresetId, TraceSettings, WorkerStage } from './types'
import { validateSvgInBrowser } from './svg-validation'
import { VectorizerClient } from './worker-client'
import { LIMITS } from './limits'
import { vectorFilename } from '@/lib/filename'
import { track } from '@/lib/analytics'

export interface ConversionResult {
  url: string
  blob: Blob
  filename: string
  bytes: number
  pathCount: number
  paletteSize: number
  elapsedMs: number
  workingWidth: number
  workingHeight: number
  preset: PresetId
  key: string
}

export interface RunState { stage: WorkerStage; startedAt: number }
export interface Problem { kind: 'input' | 'convert'; message: string }

export function useVectorizer() {
  const [settings, setSettings] = useState<TraceSettings>(() => defaultSettings())
  const [source, setSource] = useState<LoadedSource | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ConversionResult | null>(null)
  const [run, setRun] = useState<RunState | null>(null)
  const [problem, setProblem] = useState<Problem | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const clientRef = useRef<VectorizerClient | null>(null)
  const sourceRef = useRef<LoadedSource | null>(null)
  const resultRef = useRef<ConversionResult | null>(null)
  const loadToken = useRef(0)

  const client = () => (clientRef.current ??= new VectorizerClient(undefined, LIMITS.jobTimeoutMs))

  const dropResult = useCallback(() => {
    if (resultRef.current) URL.revokeObjectURL(resultRef.current.url)
    resultRef.current = null
    setResult(null)
  }, [])

  const dropSource = useCallback(() => {
    sourceRef.current?.release()
    sourceRef.current = null
    setSource(null)
  }, [])

  // Release everything on unmount. The worker is created lazily, so Strict Mode's mount/unmount/mount never spawns two.
  useEffect(() => () => {
    loadToken.current++
    clientRef.current?.dispose()
    clientRef.current = null
    sourceRef.current?.release()
    if (resultRef.current) URL.revokeObjectURL(resultRef.current.url)
  }, [])

  const cancel = useCallback(() => {
    clientRef.current?.cancel()
    setRun(null)
  }, [])

  const selectFiles = useCallback(async (files: FileList | File[] | null) => {
    const list = files ? Array.from(files) : []
    if (list.length === 0) return
    const file = list[0]
    const token = ++loadToken.current
    clientRef.current?.cancel()
    setRun(null)
    setProblem(null)
    setNotice(list.length > 1 ? 'Only one image can be processed at a time, so VectorMint is using the first one.' : null)
    setLoading(true)
    try {
      const loaded = await loadSource(file)
      if (token !== loadToken.current) { loaded.release(); return }
      dropResult()
      sourceRef.current?.release()
      sourceRef.current = loaded
      setSource(loaded)
      track('image_selected')
    } catch (e) {
      if (token !== loadToken.current) return
      dropResult()
      dropSource()
      setProblem({ kind: 'input', message: e instanceof InputError ? e.message : 'This image could not be opened.' })
    } finally {
      if (token === loadToken.current) setLoading(false)
    }
  }, [dropResult, dropSource])

  const reset = useCallback(() => {
    loadToken.current++
    clientRef.current?.cancel()
    setRun(null)
    setProblem(null)
    setNotice(null)
    setLoading(false)
    dropResult()
    dropSource()
  }, [dropResult, dropSource])

  const convert = useCallback(() => {
    const src = sourceRef.current
    const c = client()
    if (!src || c.busy) return
    const s = settings
    const size = workingSize(src.info.width, src.info.height, s)
    let pixels: ArrayBuffer
    try { pixels = src.readPixels(size.width, size.height) } catch {
      setProblem({ kind: 'convert', message: 'The image could not be read. Try choosing it again.' })
      return
    }
    setProblem(null)
    const startedAt = performance.now()
    setRun({ stage: 'prepare', startedAt })
    track('conversion_started', { preset: s.preset, detail: s.detail })
    c.start(
      { width: size.width, height: size.height, outWidth: src.info.width, outHeight: src.info.height, pixels, settings: s },
      {
        onStage: (stage) => setRun((r) => (r ? { ...r, stage } : r)),
        onComplete: (m) => {
          setRun(null)
          const check = validateSvgInBrowser(m.svg)
          if (!check.ok) {
            track('conversion_failed', { reason: 'invalid' })
            setProblem({ kind: 'convert', message: `The generated SVG failed validation (${check.problems.join(', ')}).` })
            return
          }
          const blob = new Blob([m.svg], { type: 'image/svg+xml' })
          if (resultRef.current) URL.revokeObjectURL(resultRef.current.url)
          const next: ConversionResult = {
            url: URL.createObjectURL(blob), blob, filename: vectorFilename(src.info.name), bytes: blob.size,
            pathCount: m.pathCount, paletteSize: m.paletteSize, elapsedMs: Math.round(performance.now() - startedAt),
            workingWidth: size.width, workingHeight: size.height, preset: s.preset, key: settingsKey(s),
          }
          resultRef.current = next
          setResult(next)
          track('conversion_completed', { preset: s.preset })
        },
        onError: (e) => {
          setRun(null)
          track('conversion_failed', { reason: e.code })
          setProblem({ kind: 'convert', message: e.message })
        },
      },
    )
  }, [settings])

  const currentKey = useMemo(() => settingsKey(settings), [settings])
  const stale = !!result && result.key !== currentKey
  const working = source ? workingSize(source.info.width, source.info.height, settings) : null

  return {
    settings, setSettings, source, loading, result, run, problem, notice, stale, working,
    selectFiles, convert, cancel, reset, clearProblem: () => setProblem(null),
  }
}
