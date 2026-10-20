import { useMemo } from 'react'
import { Download, ExternalLink, FilePlus2, Share2, SlidersHorizontal } from 'lucide-react'
import type { ConversionResult } from '../useVectorizer'
import { PRESETS } from '../presets'
import { canShareFile, downloadBlob, openBlobInNewTab, shareFile } from '@/lib/download'
import { formatBytes } from '@/lib/filename'
import { track } from '@/lib/analytics'

interface Props {
  result: ConversionResult
  originalBytes: number
  stale: boolean
  onAdjust: () => void
  onAnother: () => void
}

export function ResultPanel({ result, originalBytes, stale, onAdjust, onAnother }: Props) {
  const shareable = useMemo(() => canShareFile(result.blob, result.filename), [result])
  const rows: Array<[string, string]> = [
    ['File', result.filename],
    ['SVG size', formatBytes(result.bytes)],
    ['Original size', formatBytes(originalBytes)],
    ['Traced at', `${result.workingWidth} × ${result.workingHeight} px`],
    ['Paths', result.pathCount.toLocaleString()],
    ['Colours', String(result.paletteSize)],
    ['Time', `${(result.elapsedMs / 1000).toFixed(1)} s`],
    ['Preset', PRESETS[result.preset].label],
  ]
  return (
    <section aria-label="Result" className="rounded-[var(--radius-card)] border border-line bg-panel p-4">
      {stale && (
        <p role="status" className="mb-3 rounded-lg bg-warn-soft px-3 py-2 text-sm">
          Settings changed. This is the last completed version. Select Apply Changes to update it.
        </p>
      )}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {rows.map(([k, v]) => (<div key={k} className="contents"><dt className="text-muted">{k}</dt><dd className="min-w-0 break-words font-medium">{v}</dd></div>))}
      </dl>
      <p className="mt-3 text-xs text-muted">Vector files scale without pixelation, but complex artwork can produce larger files.</p>

      <div className="mt-4 grid gap-2">
        <button type="button" className="btn btn-primary w-full" onClick={() => { downloadBlob(result.blob, result.filename); track('svg_download_clicked', { preset: result.preset }) }}>
          <Download size={18} aria-hidden="true" /> {stale ? 'Download previous result' : 'Download SVG'}
        </button>
        <div className="grid grid-cols-2 gap-2">
          {shareable && (
            <button type="button" className="btn" onClick={() => void shareFile(result.blob, result.filename).catch(() => undefined)}><Share2 size={18} aria-hidden="true" /> Share</button>
          )}
          <button type="button" className={`btn ${shareable ? '' : 'col-span-2'}`} onClick={() => openBlobInNewTab(result.blob)}><ExternalLink size={18} aria-hidden="true" /> Open SVG</button>
        </div>
        <button type="button" className="btn" onClick={onAdjust}><SlidersHorizontal size={18} aria-hidden="true" /> Adjust Settings</button>
        <button type="button" className="btn" onClick={onAnother}><FilePlus2 size={18} aria-hidden="true" /> Convert Another Image</button>
      </div>
      <p className="mt-3 text-xs text-muted">
        If your device doesn’t save the file, use Open SVG, then save it from the browser menu or the Share sheet into Files or Downloads. SVG files can’t be saved to a photo library.
      </p>
    </section>
  )
}
