import { analyticsConfigured, config } from './config'
import { getConsent } from './consent'

type EventName =
  | 'image_selected' | 'conversion_started' | 'conversion_completed'
  | 'conversion_failed' | 'svg_download_clicked' | 'preset_selected'

/** Only these low-cardinality props can ever leave the page. Never filenames, sizes, URLs, or content. */
type Props = Partial<{ preset: string; detail: string; reason: string }>
const ALLOWED = new Set(['preset', 'detail', 'reason'])

type PlausibleFn = (name: string, opts?: { props: Record<string, string> }) => void
let loaded = false

export function loadAnalytics() {
  if (loaded || !analyticsConfigured || getConsent() !== 'granted') return
  loaded = true
  const s = document.createElement('script')
  s.defer = true
  s.src = config.plausibleSrc
  s.dataset.domain = config.plausibleDomain
  document.head.appendChild(s)
}

export function track(name: EventName, props: Props = {}) {
  if (!analyticsConfigured || getConsent() !== 'granted') return
  const clean: Record<string, string> = {}
  for (const [k, v] of Object.entries(props)) if (ALLOWED.has(k) && typeof v === 'string') clean[k] = v.slice(0, 32)
  const fn = (window as unknown as { plausible?: PlausibleFn }).plausible
  try { fn?.(name, { props: clean }) } catch { /* analytics must never break the app */ }
}
