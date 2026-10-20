import { useRef, useState, type DragEvent } from 'react'
import { AlertCircle, ImagePlus, ShieldCheck } from 'lucide-react'
import { SUPPORTED_LABEL } from '../limits'

interface Props {
  loading: boolean
  error: string | null
  notice: string | null
  onFiles: (files: FileList | File[]) => void
  onChoose: () => void
}

export const PRIVACY_LINE = 'Your images stay on your device. Vectorization happens privately in your browser.'

export function Uploader({ loading, error, notice, onFiles, onChoose }: Props) {
  const [dragging, setDragging] = useState(false)
  const depth = useRef(0)

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    depth.current = 0
    setDragging(false)
    if (e.dataTransfer.files.length > 0) onFiles(e.dataTransfer.files)
  }

  return (
    <div
      onDragEnter={(e) => { e.preventDefault(); depth.current++; setDragging(true) }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => { depth.current = Math.max(0, depth.current - 1); if (depth.current === 0) setDragging(false) }}
      onDrop={onDrop}
      className={`rounded-[var(--radius-card)] border-2 border-dashed p-6 text-center transition-colors sm:p-10 ${dragging ? 'border-accent bg-accent-soft' : 'border-line bg-panel'}`}
    >
      <h2 className="font-display text-2xl font-bold sm:text-3xl">{dragging ? 'Drop the image to start' : 'Turn images into scalable SVGs'}</h2>
      <p className="mx-auto mt-2 max-w-md text-muted">Convert logos, icons, and illustrations into vector artwork—free and privately in your browser.</p>

      <button type="button" className="btn btn-primary mt-6 min-w-[200px]" disabled={loading} onClick={onChoose}>
        <ImagePlus size={20} aria-hidden="true" /> {loading ? 'Opening image…' : 'Choose Image'}
      </button>
      <p className="mt-3 text-sm text-muted">{SUPPORTED_LABEL}. No account required. You can also drag and drop.</p>
      <p className="mx-auto mt-4 flex max-w-md items-start justify-center gap-2 text-sm text-ink">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" /> <span>{PRIVACY_LINE}</span>
      </p>

      <div aria-live="polite">
        {notice && <p className="mx-auto mt-4 max-w-md rounded-lg bg-warn-soft px-3 py-2 text-sm">{notice}</p>}
        {error && (
          <p role="alert" className="mx-auto mt-4 flex max-w-md items-start gap-2 rounded-lg bg-danger-soft px-3 py-2 text-left text-sm text-danger">
            <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" /> <span>{error}</span>
          </p>
        )}
      </div>
    </div>
  )
}
