import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as RPointerEvent } from 'react'
import { Maximize, Minus, Plus, ScanSearch } from 'lucide-react'

export type PreviewBg = 'checker' | 'light' | 'dark'
export interface View { scale: number; x: number; y: number }
export const FIT: View = { scale: 1, x: 0, y: 0 }
const MIN = 0.5, MAX = 32

const bgClass: Record<PreviewBg, string> = { checker: 'checker', light: 'bg-previewlight', dark: 'bg-previewdark' }

interface PaneProps {
  src: string
  alt: string
  label?: string
  bg: PreviewBg
  view: View
  setView: (fn: (v: View) => View) => void
  paneRef?: (el: HTMLDivElement | null) => void
  className?: string
}

/** One zoomable pane. Zoom and pan are CSS transforms on the already-rendered image: nothing is regenerated. */
function Pane({ src, alt, label, bg, view, setView, paneRef, className = '' }: PaneProps) {
  const el = useRef<HTMLDivElement | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<number | null>(null)
  const drag = useRef(false)

  const zoomAt = useCallback((factor: number, cx: number, cy: number) => {
    setView((v) => {
      const s = Math.min(MAX, Math.max(MIN, v.scale * factor))
      if (s === v.scale) return v
      const k = s / v.scale
      return clamp({ scale: s, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k }, el.current)
    })
  }, [setView])

  useEffect(() => {
    const node = el.current
    if (!node) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = node.getBoundingClientRect()
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2)
    }
    node.addEventListener('wheel', onWheel, { passive: false })
    return () => node.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  const down = (e: RPointerEvent) => {
    el.current?.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    drag.current = true
    if (pointers.current.size === 2) pinch.current = pinchDistance(pointers.current)
  }
  const move = (e: RPointerEvent) => {
    const prev = pointers.current.get(e.pointerId)
    if (!prev || !el.current) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2 && pinch.current) {
      const d = pinchDistance(pointers.current)
      const r = el.current.getBoundingClientRect()
      const pts = [...pointers.current.values()]
      zoomAt(d / pinch.current, (pts[0].x + pts[1].x) / 2 - r.left - r.width / 2, (pts[0].y + pts[1].y) / 2 - r.top - r.height / 2)
      pinch.current = d
    } else if (pointers.current.size === 1 && drag.current) {
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y
      setView((v) => (v.scale > 1 ? clamp({ ...v, x: v.x + dx, y: v.y + dy }, el.current) : v))
    }
  }
  const up = (e: RPointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (pointers.current.size === 0) drag.current = false
  }

  const key = (e: KeyboardEvent) => {
    const step = 40
    if (e.key === '+' || e.key === '=') zoomAt(1.25, 0, 0)
    else if (e.key === '-' || e.key === '_') zoomAt(0.8, 0, 0)
    else if (e.key === '0') setView(() => FIT)
    else if (e.key.startsWith('Arrow')) {
      const dx = e.key === 'ArrowLeft' ? step : e.key === 'ArrowRight' ? -step : 0
      const dy = e.key === 'ArrowUp' ? step : e.key === 'ArrowDown' ? -step : 0
      setView((v) => clamp({ ...v, x: v.x + dx, y: v.y + dy }, el.current))
    } else return
    e.preventDefault()
  }

  return (
    <div className={`relative min-h-0 ${className}`}>
      {label && <span className="pointer-events-none absolute left-2 top-2 z-10 rounded-md bg-ink/80 px-2 py-0.5 text-xs font-semibold text-paper">{label}</span>}
      <div
        ref={(n) => { el.current = n; paneRef?.(n) }}
        tabIndex={0}
        role="group"
        aria-label={`${alt}. Use plus and minus to zoom, arrow keys to pan, zero to fit.`}
        onKeyDown={key} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onDoubleClick={() => setView((v) => (v.scale > 1 ? FIT : clamp({ scale: 2, x: 0, y: 0 }, el.current)))}
        className={`relative h-full w-full select-none overflow-hidden rounded-lg border border-line ${bgClass[bg]} ${view.scale > 1 ? 'cursor-grab touch-none active:cursor-grabbing' : 'touch-pan-y'}`}
      >
        <img
          src={src} alt={alt} draggable={false}
          className="absolute inset-0 h-full w-full object-contain will-change-transform"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, transformOrigin: 'center' }}
        />
      </div>
    </div>
  )
}

function pinchDistance(m: Map<number, { x: number; y: number }>) {
  const [a, b] = [...m.values()]
  return Math.hypot(a.x - b.x, a.y - b.y) || 1
}
function clamp(v: View, el: HTMLElement | null): View {
  if (!el) return v
  const maxX = (el.clientWidth * v.scale) / 2, maxY = (el.clientHeight * v.scale) / 2
  return { ...v, x: Math.max(-maxX, Math.min(maxX, v.x)), y: Math.max(-maxY, Math.min(maxY, v.y)) }
}

export type PreviewMode = 'original' | 'vector' | 'compare'

interface Props {
  mode: PreviewMode
  originalUrl: string
  vectorUrl: string | null
  sourceWidth: number
  bg: PreviewBg
  onBg: (b: PreviewBg) => void
}

export function PreviewViewport({ mode, originalUrl, vectorUrl, sourceWidth, bg, onBg }: Props) {
  const [view, setView] = useState<View>(FIT)
  const first = useRef<HTMLDivElement | null>(null)
  const apply = useCallback((fn: (v: View) => View) => setView(fn), [])

  const actualSize = () => {
    const w = first.current?.clientWidth ?? 0
    const h = first.current?.clientHeight ?? 0
    if (!w || !h) return
    const img = new Image()
    img.onload = () => {
      const fitted = Math.min(w, (h * img.naturalWidth) / img.naturalHeight)
      setView({ scale: Math.min(MAX, Math.max(1, sourceWidth / fitted)), x: 0, y: 0 })
    }
    img.src = originalUrl
  }
  const zoom = (f: number) => setView((v) => clamp({ ...v, scale: Math.min(MAX, Math.max(MIN, v.scale * f)) }, first.current))

  // Reset zoom whenever the images change.
  const [seen, setSeen] = useState({ o: originalUrl, v: vectorUrl })
  if (seen.o !== originalUrl || seen.v !== vectorUrl) {
    setSeen({ o: originalUrl, v: vectorUrl })
    setView(FIT)
  }

  const showVector = (mode === 'vector' || mode === 'compare') && vectorUrl
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 pb-2">
        <div className="flex items-center gap-1" role="group" aria-label="Zoom controls">
          <button type="button" className="btn btn-icon" onClick={() => zoom(0.8)} aria-label="Zoom out"><Minus size={18} /></button>
          <span className="w-14 text-center text-sm tabular-nums text-muted" aria-live="off">{Math.round(view.scale * 100)}%</span>
          <button type="button" className="btn btn-icon" onClick={() => zoom(1.25)} aria-label="Zoom in"><Plus size={18} /></button>
          <button type="button" className="btn btn-icon" onClick={() => setView(FIT)} aria-label="Fit to view"><Maximize size={18} /></button>
          <button type="button" className="btn btn-icon" onClick={actualSize} aria-label="Reset zoom to actual size"><ScanSearch size={18} /></button>
        </div>
        <fieldset className="seg ml-auto" aria-label="Preview background">
          {(['checker', 'light', 'dark'] as const).map((b) => (
            <label key={b}><input type="radio" name="vm-prev-bg" checked={bg === b} onChange={() => onBg(b)} /><span>{b === 'checker' ? 'Checker' : b === 'light' ? 'Light' : 'Dark'}</span></label>
          ))}
        </fieldset>
      </div>
      <p className="pb-2 text-xs text-muted">The checkerboard is only a preview aid. It is not part of the exported SVG.</p>

      <div className={`grid h-[min(62vh,560px)] min-h-[260px] gap-2 ${mode === 'compare' && showVector ? 'grid-rows-2 md:grid-cols-2 md:grid-rows-1' : ''}`}>
        {(mode === 'original' || mode === 'compare' || !showVector) && (
          <Pane src={originalUrl} alt="Original image preview" label={mode === 'compare' ? 'Original' : undefined} bg={bg} view={view} setView={apply} paneRef={(n) => { first.current = n }} />
        )}
        {showVector && vectorUrl && (
          <Pane src={vectorUrl} alt="Vector result preview" label={mode === 'compare' ? 'Vector' : undefined} bg={bg} view={view} setView={apply} paneRef={mode === 'vector' ? (n) => { first.current = n } : undefined} />
        )}
      </div>
    </div>
  )
}
