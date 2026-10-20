/** Public, non-secret build-time configuration. See .env.example. */
const env = import.meta.env

export const config = {
  siteUrl: ((env.VITE_SITE_URL as string | undefined) ?? '').replace(/\/+$/, ''),
  contactEmail: (env.VITE_CONTACT_EMAIL as string | undefined) ?? '',
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
