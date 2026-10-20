import { useEffect } from 'react'
import { config } from './config'

/** Per-route title, description and canonical (client-side; the static HTML carries the home-page defaults). */
export function usePageMeta(title: string, description: string, path = '/') {
  useEffect(() => {
    document.title = title
    document.querySelector('meta[name="description"]')?.setAttribute('content', description)
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description)
    if (config.siteUrl) {
      const href = `${config.siteUrl}${path}`
      document.querySelector('link[rel="canonical"]')?.setAttribute('href', href)
      document.querySelector('meta[property="og:url"]')?.setAttribute('content', href)
    }
  }, [title, description, path])
}
