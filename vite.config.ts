import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

const ROUTES = ['/', '/privacy', '/terms', '/contact']

function deploymentOrigin(value: string | undefined) {
  const trimmed = value?.trim().replace(/\/+$/, '') ?? ''
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

/** Injects the configured site URL into index.html and emits robots.txt + sitemap.xml at build time. */
function seoPlugin(siteUrl: string): Plugin {
  const base = siteUrl.replace(/\/+$/, '')
  return {
    name: 'vectormint-seo',
    transformIndexHtml(html) {
      // When no site URL is configured, drop canonical/og:url instead of inventing one.
      if (!base) {
        return html
          .replace(/\s*<link rel="canonical"[^>]*%SITE_URL%[^>]*>/g, '')
          .replace(/\s*<meta property="og:url"[^>]*%SITE_URL%[^>]*>/g, '')
      }
      return html.replaceAll('%SITE_URL%', base)
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: base
          ? `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`
          : `User-agent: *\nAllow: /\n`,
      })
      if (base) {
        const urls = ROUTES.map((r) => `  <url><loc>${base}${r === '/' ? '/' : r}</loc></url>`).join('\n')
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
        })
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  // Vercel supplies VERCEL_URL at build time. VITE_SITE_URL remains the
  // explicit override for a custom domain.
  const siteUrl = deploymentOrigin(
    env.VITE_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL,
  )
  return {
    plugins: [react(), tailwindcss(), seoPlugin(siteUrl)],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    worker: { format: 'es' },
    build: { target: 'es2022', sourcemap: false },
    test: { environment: 'node', include: ['tests/**/*.test.ts'], testTimeout: 60000 },
  }
})
