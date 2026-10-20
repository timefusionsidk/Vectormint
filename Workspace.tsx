import { useEffect, useRef, useState } from 'react'
import { AlertCircle, ImagePlus, Trash2, Wand2 } from 'lucide-react'
import type { useVectorizer } from '../useVectorizer'
import { PreviewViewport, type PreviewBg, type PreviewMode } from './PreviewViewport'
import { SettingsPanel } from './SettingsPanel'
import { ProgressPanel } from './ProgressPanel'
import { ResultPanel } from './ResultPanel'
import { formatBytes } from '@/lib/filename'

type V = ReturnType<typeof useVectorizer>

const TABS: Array<{ id: PreviewMode; label: string }> = [
  { id: 'original', label: 'Original' }, { id: 'vector', label: 'Vector' }, { id: 'compare', label: 'Compare' },
]

export function Workspace({ v, onReplace }: { v: V; onReplace: () => void }) {
  const { source, settings, result, run, stale, problem } = v
  const [mode, setMode] = useState<PreviewMode>('original')
  const [bg, setBg] = useState<PreviewBg>('checker')
  const [settingsOpen, setSettingsOpen] = useState(() => window.matchMedia('(min-width: 1024px)').matches)
  const settingsRef = useRef<HTMLDivElement>(null)
  const root = useRef<HTMLElement>(null)

  // New image: show the original and make the workspace the focus. New result: show the vector.
  const sourceUrl = source?.previewUrl
  const resultUrl = result?.url
  const [seen, setSeen] = useState<{ s?: string; r?: string }>({})
  if (seen.s !== sourceUrl || seen.r !== resultUrl) {
    setSeen({ s: sourceUrl, r: resultUrl })
    if (seen.s !== sourceUrl) setMode('original')
    else if (resultUrl) setMode((m) => (m === 'original' ? 'vector' : m))
  }
  useEffect(() => {
    if (sourceUrl) root.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [sourceUrl])

  if (!source) return null
  const busy = !!run
  const tabs = result ? TABS : TABS.slice(0, 1)
  const label = !result ? 'Convert to SVG' : stale ? 'Apply Changes' : 'Settings applied'

  const adjust = () => {
    setSettingsOpen(true)
    requestAnimationFrame(() => {
      settingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      settingsRef.current?.querySelector<HTMLElement>('input:not(:disabled)')?.focus({ preventScroll: true })
    })
  }

  return (
    <section ref={root} id="workspace" aria-label="Conversion workspace" className="mx-auto max-w-6xl px-4 pt-6">
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{source.info.name}</p>
          <p className="text-sm text-muted">{source.info.width} × {source.info.height} px · {formatBytes(source.info.bytes)} · {source.info.kind.toUpperCase()}</p>
        </div>
        <button type="button" className="btn" onClick={onReplace} disabled={busy}><ImagePlus size={18} aria-hidden="true" /> Replace</button>
        <button type="button" className="btn" onClick={v.reset}><Trash2 size={18} aria-hidden="true" /> Remove</button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <div role="tablist" aria-label="Preview" className="seg mb-3">
            {tabs.map((t) => (
              <button key={t.id} role="tab" type="button" id={`vm-tab-${t.id}`} aria-selected={mode === t.id} aria-controls="vm-preview"
                tabIndex={mode === t.id ? 0 : -1}
                onClick={() => setMode(t.id)}
                onKeyDown={(e) => {
                  const i = tabs.findIndex((x) => x.id === mode)
                  if (e.key === 'ArrowRight') setMode(tabs[(i + 1) % tabs.length].id)
                  else if (e.key === 'ArrowLeft') setMode(tabs[(i - 1 + tabs.length) % tabs.length].id)
                  else return
                  e.preventDefault()
                  requestAnimationFrame(() => document.getElementById(`vm-tab-${tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length].id}`)?.focus())
                }}
                className={`inline-flex min-h-[38px] min-w-[44px] items-center justify-center rounded-lg px-4 text-sm font-semibold ${mode === t.id ? 'bg-panel text-ink shadow-sm' : 'text-muted'}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div id="vm-preview" role="tabpanel" aria-labelledby={`vm-tab-${mode}`}>
            {busy ? (
              <ProgressPanel stage={run.stage} startedAt={run.startedAt} onCancel={v.cancel} showQuantize={settings.preset !== 'bw'} />
            ) : (
              <PreviewViewport mode={mode} originalUrl={source.previewUrl} vectorUrl={result?.url ?? null} sourceWidth={source.info.width} bg={bg} onBg={setBg} />
            )}
          </div>
          {stale && !busy && <p className="mt-2 text-sm text-muted">Showing the last completed version, not your current settings.</p>}
        </div>

        <div className="space-y-4">
          {problem?.kind === 'convert' && (
            <p role="alert" className="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" /> <span>{problem.message}</span>
            </p>
          )}
          <button type="button" className="btn btn-primary w-full" disabled={busy || (!!result && !stale)} onClick={v.convert}>
            <Wand2 size={18} aria-hidden="true" /> {busy ? 'Converting…' : label}
          </button>
          {result && <ResultPanel result={result} originalBytes={source.info.bytes} stale={stale} onAdjust={adjust} onAnother={onReplace} />}

          <div ref={settingsRef} className="rounded-[var(--radius-card)] border border-line bg-panel">
            <button type="button" className="flex min-h-[48px] w-full items-center justify-between px-4 font-display text-lg font-bold lg:pointer-events-none" aria-expanded={settingsOpen} aria-controls="vm-settings" onClick={() => setSettingsOpen((o) => !o)}>
              Settings <span className="text-sm font-normal text-muted lg:hidden">{settingsOpen ? 'Hide' : 'Show'}</span>
            </button>
            <div id="vm-settings" className={`${settingsOpen ? 'block' : 'hidden'} border-t border-line p-4 lg:block`}>
              <SettingsPanel settings={settings} onChange={v.setSettings} sourceSize={source.info} disabled={busy} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
