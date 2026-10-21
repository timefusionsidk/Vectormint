/** Public, non-secret build-time configuration. See .env.example. */
const env = import.meta.env

function origin(value: string | undefined) {
  return (value ?? '').replace(/\/+$/, '')
}

/**
 * A configured origin is preferred. In the browser, use the current origin as
 * a safe fallback so route metadata remains correct on Vercel preview and
 * production deployments without duplicating a deployment URL in source.
 */
const configuredSiteUrl = origin(env.VITE_SITE_URL as string | undefined)
const currentOrigin = typeof window === 'undefined' ? '' : origin(window.location.origin)

export const config = {
  siteUrl: configuredSiteUrl || currentOrigin,
  contactEmail: (env.VITE_CONTACT_EMAIL as string | undefined)?.trim() || 'timefusions.idk@gmail.com',
  contactUrl: (env.VITE_CONTACT_URL as string | undefined) ?? '',
  adsEnabled: env.VITE_ADS_ENABLED === 'true' && !!env.VITE_ADSENSE_CLIENT && !!env.VITE_ADSENSE_SLOT,
  adsenseClient: (env.VITE_ADSENSE_CLIENT as string | undefined) ?? '',
  adsenseSlot: (env.VITE_ADSENSE_SLOT as string | undefined) ?? '',
  plausibleDomain: (env.VITE_PLAUSIBLE_DOMAIN as string | undefined) ?? '',
  plausibleSrc: (env.VITE_PLAUSIBLE_SRC as string | undefined) || 'https://plausible.io/js/script.js',
}

export const analyticsConfigured = !!config.plausibleDomain
/** Consent is only needed when a provider that sets or reads identifiers is configured. */
export const consentRequired = config.adsEnabled || analyticsConfigured
export const BRAND_URL = 'https://www.timefusionsidk.com/'
