import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { STAGE_LABEL, type WorkerStage } from '../types'

const ORDER: WorkerStage[] = ['prepare', 'quantize', 'trace', 'svg']

export function ProgressPanel({ stage, startedAt, onCancel, showQuantize }: { stage: WorkerStage; startedAt: number; onCancel: () => void; showQuantize: boolean }) {
  const [now, setNow] = useState(() => performance.now())
  useEffect(() => {
    const id = setInterval(() => setNow(performance.now()), 250)
    return () => clearInterval(id)
  }, [])
  const secs = Math.max(0, (now - startedAt) / 1000)
  const stages = ORDER.filter((s) => showQuantize || s !== 'quantize')
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-panel p-5">
      <p className="font-display text-lg font-bold" aria-live="polite">{STAGE_LABEL[stage]}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sunken indeterminate" aria-hidden="true" />
      <ol className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        {stages.map((s) => (
          <li key={s} className={s === stage ? 'font-semibold text-ink' : stages.indexOf(s) < stages.indexOf(stage) ? 'text-accent' : ''}>
            {STAGE_LABEL[s].replace('…', '').replace(' on your device', '')}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-sm text-muted">Elapsed: <span className="tabular-nums">{secs.toFixed(1)} s</span>. Your image is being traced on this device and is not uploaded.</p>
      <button type="button" className="btn mt-4" onClick={onCancel}><X size={18} aria-hidden="true" /> Cancel</button>
    </div>
  )
}
