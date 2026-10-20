import { Link } from 'react-router-dom'
import { BRAND_URL } from '@/lib/config'
import { setConsent } from '@/lib/consent'
import { consentRequired } from '@/lib/config'

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          <a className="link inline-flex min-h-[44px] items-center" href={BRAND_URL} target="_blank" rel="noopener">VectorMint by Timefusionsidk</a>
          <span className="block sm:inline sm:before:content-['—_'] sm:before:mx-1">Free tools that run in your browser.</span>
        </p>
        <ul className="flex flex-wrap gap-x-3">
          <li><Link className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center hover:text-ink" to="/privacy">Privacy</Link></li>
          <li><Link className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center hover:text-ink" to="/terms">Terms</Link></li>
          <li><Link className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center hover:text-ink" to="/contact">Contact</Link></li>
          {consentRequired && (
            <li><button type="button" className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center hover:text-ink" onClick={() => setConsent('unset')}>Cookie choices</button></li>
          )}
        </ul>
      </div>
    </footer>
  )
}
