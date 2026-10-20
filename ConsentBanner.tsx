import { Link } from 'react-router-dom'
import { consentRequired, analyticsConfigured, config } from '@/lib/config'
import { setConsent, useConsent } from '@/lib/consent'

/** Shown only when advertising or analytics is configured. Without either, VectorMint sets nothing that needs consent. */
export function ConsentBanner() {
  const consent = useConsent()
  if (!consentRequired || consent !== 'unset') return null
  const what = [config.adsEnabled && 'advertising', analyticsConfigured && 'anonymous usage statistics'].filter(Boolean).join(' and ')
  return (
    <section aria-label="Privacy choices" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel p-4 shadow-[0_-8px_24px_rgb(0_0_0/0.08)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center">
        <p className="text-sm sm:flex-1">
          VectorMint can load {what} from third parties. Your images are never part of this: they stay on your device either way.{' '}
          <Link to="/privacy" className="link">Privacy details</Link>
        </p>
        <div className="flex gap-2">
          <button type="button" className="btn flex-1 sm:flex-none" onClick={() => setConsent('denied')}>Decline</button>
          <button type="button" className="btn btn-primary flex-1 sm:flex-none" onClick={() => setConsent('granted')}>Accept</button>
        </div>
      </div>
    </section>
  )
}
