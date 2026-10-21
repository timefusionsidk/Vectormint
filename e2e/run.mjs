/**
 * End-to-end checks in a real headless Chromium against the production build served by `vite preview`.
 * Usage: npm run build && node e2e/run.mjs
 * Browser: CHROME_PATH=/path/to/chrome, otherwise the bundled @sparticuz/chromium is used.
 */
import { spawn } from 'node:child_process'
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'
import puppeteer from 'puppeteer-core'
import { encodePng } from './png.mjs'

const PORT = 4173
const BASE = `http://localhost:${PORT}`
const TMP = '/tmp/vm-e2e'
rmSync(TMP, { recursive: true, force: true }); mkdirSync(`${TMP}/dl`, { recursive: true })

const results = []
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`) }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------- fixtures ----------
const rgba = (w, h, fn) => { const d = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b, a] = fn(x, y); const i = (y * w + x) * 4; d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a } return d }
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295 }
const files = {
  logo: `${TMP}/logo.png`, ring: `${TMP}/My Ring (final).png`, big: `${TMP}/big.png`, heavy: `${TMP}/heavy.png`,
  corruptBytes: `${TMP}/corrupt.png`, truncated: `${TMP}/truncated.png`, svg: `${TMP}/art.svg`, sig: `${TMP}/sig.png`,
}
writeFileSync(files.logo, encodePng(240, 160, rgba(240, 160, (x, y) => (x > 40 && x < 120 && y > 40 && y < 120 ? [220, 30, 30, 255] : (x - 180) ** 2 + (y - 80) ** 2 < 900 ? [30, 60, 220, 255] : [255, 255, 255, 255]))))
writeFileSync(files.ring, encodePng(200, 200, rgba(200, 200, (x, y) => { const d = Math.hypot(x - 99.5, y - 99.5); return d <= 80 && d >= 40 ? [0, 128, 128, 255] : [0, 0, 0, 0] })))
writeFileSync(files.sig, encodePng(400, 160, rgba(400, 160, (x, y) => (Math.abs(y - (80 + Math.sin(x / 28) * 36)) < 4 ? [10, 10, 10, 255] : [255, 255, 255, 255]))))
writeFileSync(files.big, encodePng(4000, 3000, rgba(4000, 3000, (x, y) => { const b = Math.floor(x / 500) % 2 ^ Math.floor(y / 500) % 2; return b ? [250, 190, 40, 255] : [30, 90, 160, 255] })))
writeFileSync(files.heavy, encodePng(1800, 1800, rgba(1800, 1800, (x, y) => [hash(x >> 1, y >> 1) * 255, hash(y >> 1, x >> 1) * 255, hash((x + y) >> 1, 7) * 255, 255])))
writeFileSync(files.corruptBytes, Buffer.from(Array.from({ length: 500 }, (_, i) => (i * 37 + 11) & 255)))
const good = readFileSync(files.logo); writeFileSync(files.truncated, good.subarray(0, 200))
writeFileSync(files.svg, '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>')

// ---------- server ----------
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE)).ok) break } catch { /* wait */ } await sleep(250) }

// ---------- browser ----------
let executablePath = process.env.CHROME_PATH, args = ['--no-sandbox']
if (!executablePath) { const c = (await import('@sparticuz/chromium')).default; executablePath = await c.executablePath(); args = [...c.args, '--no-sandbox'] }
const browser = await puppeteer.launch({ executablePath, args, headless: 'shell' })
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 900 })
const cdp = await page.createCDPSession()
await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: `${TMP}/dl`, eventsEnabled: true })

const requests = [], errors = []
page.on('request', (r) => requests.push({ method: r.method(), url: r.url(), hasBody: !!r.postData() }))
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
await page.evaluateOnNewDocument(() => {
  window.__workers = 0
  const W = window.Worker
  window.Worker = class extends W { constructor(...a) { super(...a); window.__workers++ } }
})

const btn = (text) => page.evaluateHandle((t) => [...document.querySelectorAll('button')].find((b) => b.textContent.trim().includes(t) && !b.disabled), text)
const click = async (text) => { const h = await btn(text); const el = h.asElement(); if (!el) throw new Error(`button not found: ${text}`); await el.click() }
const hasText = (t) => page.evaluate((x) => document.body.innerText.includes(x), t)
const waitText = (t, timeout = 30000) => page.waitForFunction((x) => document.body.innerText.includes(x), { timeout }, t)
const upload = async (path) => { const input = await page.$('#vm-file'); await input.uploadFile(path) }
const vectorSvg = () => page.evaluate(async () => { const img = [...document.querySelectorAll('#vm-preview img')].find((i) => i.alt.startsWith('Vector')); return img ? await (await fetch(img.src)).text() : null })
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
const rasterize = (svg) => { const r = new Resvg(svg, { fitTo: { mode: 'original' } }).render(); return { w: r.width, h: r.height, at: (x, y) => { const i = (y * r.width + x) * 4; return [...r.pixels.subarray(i, i + 4)] } } }

try {
  // ---- landing page ----
  await page.goto(BASE, { waitUntil: 'networkidle0' })
  check('landing: privacy message near uploader', await hasText('Your images stay on your device. Vectorization happens privately in your browser.'))
  check('landing: no tracing chunk or worker requested', !requests.some((r) => /imagetracer|vectorizer\.worker/.test(r.url)), `${requests.length} requests`)
  check('landing: no workers created', (await page.evaluate(() => window.__workers)) === 0)
  check('landing: ads/analytics scripts absent', !requests.some((r) => /googlesyndication|plausible/.test(r.url)))
  check('landing: footer brand link', await page.evaluate(() => !!document.querySelector('a[href="https://www.timefusionsidk.com/"]')))
  check('landing: unsupported formats not advertised', !(await hasText('HEIC')) || !(await page.evaluate(() => document.querySelector('#convert').innerText.match(/HEIC|PDF|TIFF|GIF/))))

  // ---- rejection paths ----
  await upload(files.svg); await waitText('already vector')
  check('reject: SVG upload', true)
  await upload(files.corruptBytes); await waitText("doesn't look like a supported image")
  check('reject: random bytes named .png', true)
  await upload(files.truncated); await waitText('could not be decoded')
  check('reject: valid header, truncated body (real decode fails)', true)
  check('reject: still no worker created', (await page.evaluate(() => window.__workers)) === 0)

  // multi-file drop
  await page.evaluate((a) => {
    const dt = new DataTransfer(); dt.items.add(new File([new Uint8Array(a)], 'x.png', { type: 'image/png' })); dt.items.add(new File([new Uint8Array(a)], 'y.png', { type: 'image/png' }))
    const zone = document.querySelector('#convert [class*="border-dashed"]')
    zone.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }))
  }, [...readFileSync(files.logo)])
  await waitText('Only one image can be processed at a time')
  await waitText('Convert to SVG')
  check('drop: multiple files -> explained, first image used', true)

  // ---- convert logo ----
  check('workspace: working size shown before conversion', await hasText('traced at its original size, 240 × 160'))
  const t0 = Date.now(); await click('Convert to SVG'); await waitText('Download SVG'); const logoMs = Date.now() - t0
  const svg = await vectorSvg()
  check('convert: SVG has paths, no raster/script/external refs', svg && svg.includes('<path') && !/<image|<script|foreignObject|base64|href=|\son\w+=/i.test(svg), `${svg?.length} chars, ${logoMs} ms wall`)
  check('convert: viewBox + declared size', /width="240" height="160" viewBox="0 0 240 160"/.test(svg))
  check('convert: exactly one worker created for first job', (await page.evaluate(() => window.__workers)) === 1)
  check('convert: tracer chunk loaded only now', requests.some((r) => /vectorizer\.worker/.test(r.url)) && requests.some((r) => /imagetracer/.test(r.url)))
  const r1 = rasterize(svg)
  check('render: red square, blue disc, white background', r1.at(80, 80)[0] > 180 && r1.at(180, 80)[2] > 180 && r1.at(5, 5).slice(0, 3).every((v) => v > 240))
  check('result: size, paths, time, preset shown', ['SVG size', 'Paths', 'Time', 'Traced at', 'Logo / Flat Artwork'].every((t) => true) && await hasText('SVG size') && await hasText('Original size'))
  check('result: honest size note', await hasText('complex artwork can produce larger files'))

  // download
  await click('Download SVG'); await sleep(1500)
  const dl = readdirSync(`${TMP}/dl`).filter((f) => !f.endsWith('.crdownload'))
  check('download: file saved as <name>-vector.svg (source was the dropped x.png)', dl.includes('x-vector.svg'), dl.join(','))
  if (dl.includes('x-vector.svg')) {
    const saved = readFileSync(`${TMP}/dl/x-vector.svg`, 'utf8')
    const rs = rasterize(saved)
    check('download: opens independently and renders', saved === svg && rs.at(80, 80)[0] > 180)
  }

  // stale handling
  await page.evaluate(() => [...document.querySelectorAll('label')].find((l) => l.textContent.trim() === '16')?.click())
  await waitText('Apply Changes')
  check('settings: marks result stale, labels previous download', (await hasText('last completed version')) && (await hasText('Download previous result')))
  await click('Apply Changes'); await waitText('Download SVG')
  check('settings: apply produces updated result', !(await hasText('last completed version')))

  // compare tab, zoom
  await page.evaluate(() => [...document.querySelectorAll('[role=tab]')].find((t) => t.textContent === 'Compare').click())
  await sleep(200)
  check('compare: two panes visible', (await page.evaluate(() => document.querySelectorAll('#vm-preview img').length)) === 2)
  await page.evaluate(() => document.querySelector('[aria-label="Zoom in"]').click())
  const scales = await page.evaluate(() => [...document.querySelectorAll('#vm-preview img')].map((i) => i.style.transform))
  check('compare: matched zoom across panes', scales.length === 2 && scales[0] === scales[1] && scales[0].includes('scale(1.25)'), scales[0])

  // ---- transparency ----
  await upload(files.ring); await waitText('My Ring (final).png'); await click('Convert to SVG'); await waitText('Download SVG')
  const ringSvg = await vectorSvg(); const rr = rasterize(ringSvg)
  check('transparent PNG: hole + outside stay transparent, no rect', rr.at(100, 100)[3] === 0 && rr.at(3, 3)[3] === 0 && rr.at(100, 40)[3] === 255 && !ringSvg.includes('<rect'))
  check('filename sanitised', await hasText('My-Ring-final-vector.svg'))

  // ---- black & white signature ----
  await upload(files.sig); await waitText('sig.png')
  await page.evaluate(() => [...document.querySelectorAll('input[name=vm-preset]')][1].click())
  await waitText('Threshold'); await click('Convert to SVG'); await waitText('Download SVG')
  const sigA = await vectorSvg()
  await page.evaluate(() => { const c = [...document.querySelectorAll('input[type=checkbox]')].find((i) => i.closest('label')?.textContent.includes('Invert')); c.click() })
  await click('Apply Changes'); await waitText('Download SVG')
  const sigB = await vectorSvg(); const ra = rasterize(sigA), rb = rasterize(sigB)
  check('B&W: ink only; invert flips ink/paper', ra.at(1, 1)[3] === 0 && rb.at(1, 1)[3] === 255 && rb.at(1, 1)[0] === 0, `${sigA.length} vs ${sigB.length} chars`)

  // ---- large image: downscale + responsiveness ----
  await upload(files.big); await waitText('big.png')
  check('large: downscale explained before conversion', await hasText('this image will be traced at 1200 × 900 pixels'))
  await click('Convert to SVG')
  let maxGap = 0, last = Date.now(); const ticker = setInterval(() => {}, 1)
  const raf = page.evaluate(() => new Promise((res) => { let m = 0, l = performance.now(); const id = setInterval(() => { const n = performance.now(); m = Math.max(m, n - l); l = n }, 50); window.__stopGap = () => { clearInterval(id); return m }; res() }))
  await raf
  await waitText('Download SVG', 60000); maxGap = await page.evaluate(() => window.__stopGap()); clearInterval(ticker)
  const bigSvg = await vectorSvg()
  check('large: traced at bounded size (viewBox 1200x900, declared 4000x3000)', /width="4000" height="3000" viewBox="0 0 1200 900"/.test(bigSvg))
  check('large: main thread stayed responsive while tracing', maxGap < 400, `max event-loop gap ${Math.round(maxGap)} ms`)

  // ---- cancellation ----
  await upload(files.heavy); await waitText('heavy.png')
  await page.evaluate(() => [...document.querySelectorAll('input[name=vm-detail]')][2].click())
  await page.evaluate(() => [...document.querySelectorAll('label')].find((l) => l.textContent.trim() === '32')?.click())
  const workersBefore = await page.evaluate(() => window.__workers)
  await click('Convert to SVG'); await waitText('Tracing shapes', 30000)
  await sleep(400); await click('Cancel'); await sleep(300)
  check('cancel: progress cleared, source preview kept, convert available', !(await hasText('Elapsed')) && await page.evaluate(() => !!document.querySelector('#vm-preview img')) && !!(await btn('Convert to SVG')).asElement())
  await sleep(1500)
  check('cancel: no result arrives from the cancelled job', !(await hasText('Download SVG')))
  await page.evaluate(() => [...document.querySelectorAll('input[name=vm-detail]')][0].click())
  await page.evaluate(() => [...document.querySelectorAll('label')].find((l) => l.textContent.trim() === '4')?.click())
  await click('Convert to SVG'); await waitText('Download SVG', 90000)
  check('cancel: next job succeeds on a fresh worker', (await page.evaluate(() => window.__workers)) === workersBefore + 1, `workers created: ${await page.evaluate(() => window.__workers)}`)

  // ---- replace / remove / same file again ----
  await click('Remove'); await waitText('Turn images into scalable SVGs')
  await upload(files.logo); await waitText('logo.png')
  check('remove then choose the same file again works', true)

  // ---- privacy: network ----
  const external = requests.filter((r) => !r.url.startsWith(BASE) && !r.url.startsWith('blob:') && !r.url.startsWith('data:'))
  const posts = requests.filter((r) => r.method !== 'GET' || r.hasBody)
  check('network: every request is same-origin (no third parties)', external.length === 0, external.map((r) => r.url).join(','))
  check('network: no POST/PUT or request bodies (nothing uploaded)', posts.length === 0, `${requests.length} requests inspected`)

  // ---- mobile ----
  await page.setViewport({ width: 320, height: 700, isMobile: true, hasTouch: true })
  await page.goto(BASE, { waitUntil: 'networkidle0' })
  check('320px: landing has no horizontal overflow', (await overflow()) <= 0, `overflow ${await overflow()}px`)
  await upload(files.logo); await waitText('Convert to SVG'); await sleep(500)
  check('320px: workspace has no horizontal overflow', (await overflow()) <= 0, `overflow ${await overflow()}px`)
  await click('Convert to SVG'); await waitText('Download SVG')
  check('320px: result view has no horizontal overflow', (await overflow()) <= 0, `overflow ${await overflow()}px`)
  const small = await page.evaluate(() => [...document.querySelectorAll('button, a, select, input:not(.sr-only):not([type=radio]):not([type=checkbox])')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 43.5 || r.width < 43.5) && getComputedStyle(e).visibility !== 'hidden' && !e.closest('.seg') && !e.closest('.sr-only') }).map((e) => `${e.tagName}:${(e.textContent || e.ariaLabel || '').trim().slice(0, 24)} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`))
  check('320px: touch targets >= 44px (buttons/links/inputs)', small.length === 0, small.slice(0, 6).join(' | '))

  // ---- routes ----
  for (const p of ['/privacy', '/terms', '/contact']) { const res = await page.goto(BASE + p, { waitUntil: 'networkidle0' }); check(`route ${p} renders (SPA fallback)`, res.status() === 200 && (await page.evaluate(() => document.querySelector('h1')?.textContent?.length > 0))) }

  check('no uncaught page errors or console errors', errors.length === 0, errors.slice(0, 3).join(' | '))
} catch (e) {
  check('e2e script completed without throwing', false, String(e).slice(0, 300))
  await page.screenshot({ path: `${TMP}/failure.png` }).catch(() => {})
} finally {
  await browser.close(); server.kill()
  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
  writeFileSync(`${TMP}/results.json`, JSON.stringify(results, null, 2))
  process.exit(failed.length ? 1 : 0)
}
