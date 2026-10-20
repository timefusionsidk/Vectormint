import { useEffect, useRef } from 'react'
import { config } from '@/lib/config'
import { useConsent } from '@/lib/consent'

let scriptRequested = false

/**
 * Optional display ad. Renders nothing unless ads are enabled AND fully configured AND the visitor consented.
 * No placeholder is ever shown. Never place this next to controls.
 */
export function AdSlot({ className = '' }: { className?: string }) {
  const consent = useConsent()
  const pushed = useRef(false)
  const active = config.adsEnabled && consent === 'granted'

  useEffect(() => {
    if (!active) return
    if (!scriptRequested) {
      scriptRequested = true
      const s = document.createElement('script')
      s.async = true
      s.crossOrigin = 'anonymous'
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(config.adsenseClient)}`
      document.head.appendChild(s)
    }
    if (!pushed.current) {
      pushed.current = true
      try { ((window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle ??= []).push({}) } catch { /* blocked */ }
    }
  }, [active])

  if (!active) return null
  return (
    <aside aria-label="Advertisement" className={`mx-auto my-12 max-w-3xl ${className}`}>
      <p className="mb-1 text-center text-xs text-muted">Advertisement</p>
      <ins className="adsbygoogle block min-h-[100px]" style={{ display: 'block' }} data-ad-client={config.adsenseClient} data-ad-slot={config.adsenseSlot} data-ad-format="auto" data-full-width-responsive="true" />
    </aside>
  )
}
