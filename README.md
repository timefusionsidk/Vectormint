# VectorMint

Free, private, in-browser image-to-SVG converter (part of Timefusionsidk). React + TypeScript + Vite + Tailwind. Tracing runs in a Web Worker using ImageTracer.js (pinned 1.2.6). No backend, no uploads.

## Commands
```
npm ci
npm run dev          # local dev server
npm run typecheck && npm run lint
npm test             # unit + pipeline + real-thread cancellation tests (vitest)
npm run build        # production build -> dist/
npm run e2e          # real-browser checks against `vite preview` (needs a build first; CHROME_PATH or bundled @sparticuz/chromium)
```

## How it works
Validate by file signature (never extension alone) -> decode once into a base canvas (<=1800 px) -> resize to the working size -> read pixels once -> transfer buffer to worker -> alpha cut-out (>=50% opaque), optional blur, deterministic median-cut palette, snap pixels to palette (or black/white threshold) -> ImageTracer path tracing -> own SVG serializer (vector paths only) -> validation -> Blob URL preview/download. Cancel terminates the worker; a fresh one is created next time. Only ImageTracer's tracing is used; its palette/blur/SVG output are replaced because alpha counted in its colour distance and its hole coordinates were rounded to whole pixels.

## Configuration (`.env`, see `.env.example`; all public, no secrets)
- `VITE_SITE_URL` canonical origin; generates canonical/og:url, `sitemap.xml`, `robots.txt` sitemap line at build. Empty = omitted.
- `VITE_CONTACT_EMAIL` / `VITE_CONTACT_URL` required before launch, or the Contact page says details are not set up.
- Ads: `VITE_ADS_ENABLED=true` + `VITE_ADSENSE_CLIENT` + `VITE_ADSENSE_SLOT`. Off by default; script loads only after consent. AdSense approval is not guaranteed.
- Analytics: `VITE_PLAUSIBLE_DOMAIN` (+ optional `VITE_PLAUSIBLE_SRC`). Consent-gated; only preset/detail/reason props are ever sent.
A consent banner appears only when ads or analytics are configured.

## Deploy to Vercel
Push to Git, import the repo in Vercel (Vite preset is detected; `vercel.json` adds SPA rewrites, immutable asset caching, and security headers). Set the env vars above in Project Settings, deploy. Or `npx vercel --prod`.

## Known limitations
- Semi-transparent pixels are thresholded at 50% (soft shadows become hard cut-outs).
- Traced output is filled outlines, not centrelines; text becomes shapes (no OCR); photos become posterised art; no background removal.
- Routes are client-rendered (no prerendering); per-route title/description are set at runtime, static HTML carries home-page metadata.
- Images over ~150,000 traced paths are refused with advice to simplify.
- AVIF works only where the browser can decode it. SVG, GIF/animated, HEIC, PDF, TIFF are rejected.
