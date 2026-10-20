import { useEffect } from 'react'
import { Lock, Layers, MousePointerClick, Cpu, Palette, Smartphone, Download } from 'lucide-react'
import { useVectorizer } from '@/features/vectorizer/useVectorizer'
import { Uploader } from '@/features/vectorizer/components/Uploader'
import { Workspace } from '@/features/vectorizer/components/Workspace'
import { HeroArt } from '@/components/HeroArt'
import { AdSlot } from '@/components/AdSlot'
import { Faq } from '@/components/Faq'
import { Guide } from '@/components/Guide'
import { usePageMeta } from '@/lib/meta'

const choose = () => document.getElementById('vm-file')?.click()

export default function Home() {
  const v = useVectorizer()
  usePageMeta('Image to SVG Converter — Free & Private | VectorMint', 'Convert PNG, JPG, and WebP images into scalable SVG artwork in your browser. Free local vector tracing for logos, icons, and illustrations.')
  useEffect(() => { if (window.location.hash === '#convert' && !v.source) document.getElementById('convert')?.scrollIntoView() }, [v.source])

  return (
    <>
      <input
        id="vm-file" type="file" className="sr-only" tabIndex={-1}
        accept=".png,.jpg,.jpeg,.webp,.avif,image/png,image/jpeg,image/webp,image/avif"
        aria-label="Choose an image to convert"
        onChange={(e) => { if (e.target.files && e.target.files.length > 0) void v.selectFiles(e.target.files); e.target.value = '' }}
      />

      {!v.source ? (
        <section id="convert" className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-6 pt-10 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
          <div className="order-2 lg:order-1">
            <h1 className="font-display text-4xl font-extrabold sm:text-5xl">Turn pixels into clean, scalable vectors.</h1>
            <p className="mt-4 max-w-xl text-lg text-muted">VectorMint traces PNG, JPG, and WebP images into real SVG paths on your own device. No account, no uploads, no cost.</p>
            <div className="mt-8"><HeroArt /></div>
            <p className="mt-4 max-w-xl text-sm text-muted">Best for logos, icons, illustrations, signatures, and artwork with clear shapes. Photos become simplified vector artwork. Fine textures, gradients, and small text may lose detail.</p>
          </div>
          <div className="order-1 lg:order-2"><Uploader loading={v.loading} error={v.problem?.kind === 'input' ? v.problem.message : null} notice={v.notice} onFiles={(f) => void v.selectFiles(f)} onChoose={choose} /></div>
        </section>
      ) : (
        <div id="convert">
          <h1 className="sr-only">VectorMint image to SVG converter</h1>
          {v.notice && <p className="mx-auto mt-4 max-w-6xl px-4 text-sm"><span className="rounded-lg bg-warn-soft px-3 py-2">{v.notice}</span></p>}
          <Workspace v={v} onReplace={choose} />
          <p className="mx-auto mt-4 max-w-6xl px-4 text-sm text-muted">Your images stay on your device. Vectorization happens privately in your browser.</p>
        </div>
      )}

      {v.source && <AdSlot />}

      <section id="how" className="mx-auto mt-20 max-w-6xl px-4">
        <h2 className="text-3xl font-bold">How it works</h2>
        <ol className="mt-6 grid gap-6 md:grid-cols-3">
          {[
            ['Choose an image', 'Pick a PNG, JPG, or WebP file, or drop it on the page. Your browser decodes it locally and shows you the size it will be traced at.'],
            ['Trace on your device', 'A background worker reduces the colours, follows the edges of each colour region, and fits straight lines and curves to them. Nothing is sent anywhere.'],
            ['Compare and download', 'Check the vector against the original, adjust the settings, apply the changes, and download the SVG when it looks right.'],
          ].map(([t, d], i) => (
            <li key={t} className="border-t-2 border-accent pt-4">
              <p className="font-display text-sm font-bold text-accent">Step {i + 1}</p>
              <h3 className="mt-1 text-xl font-bold">{t}</h3>
              <p className="mt-2 text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto mt-20 max-w-6xl px-4" aria-labelledby="best">
        <h2 id="best" className="text-3xl font-bold">Best images to vectorize</h2>
        <div className="mt-6 grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="text-xl font-bold">Trace well</h3>
            <ul className="mt-3 space-y-2 text-muted">
              <li><strong className="text-ink">Logos and icons</strong> with flat colours and sharp edges.</li>
              <li><strong className="text-ink">Illustrations and clip art</strong> made of distinct colour areas.</li>
              <li><strong className="text-ink">Signatures and scanned marks</strong>, using the Black and White preset.</li>
              <li><strong className="text-ink">Large, clean sources.</strong> A crisp 1,000 px logo beats a blurry 4,000 px screenshot.</li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-bold">Trace with limits</h3>
            <ul className="mt-3 space-y-2 text-muted">
              <li><strong className="text-ink">Photographs</strong> become simplified, poster-like artwork.</li>
              <li><strong className="text-ink">Gradients and soft shadows</strong> turn into visible bands of flat colour.</li>
              <li><strong className="text-ink">Small text</strong> becomes rough shapes. It is not recognised as text and is not OCR.</li>
              <li><strong className="text-ink">Heavily compressed JPGs</strong> carry noise that the tracer may treat as detail.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-6xl px-4" aria-labelledby="features">
        <h2 id="features" className="text-3xl font-bold">What you get</h2>
        <ul className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            [Lock, 'Private by design', 'Images are decoded and traced in your browser. They are never uploaded.'],
            [Layers, 'Real vector paths', 'The SVG holds filled paths. It never wraps or embeds your original bitmap.'],
            [Palette, 'Four tracing presets', 'Logo, Black and White, Illustration, and Photo each set real tracing parameters.'],
            [MousePointerClick, 'Compare before you save', 'Original, Vector, and Compare views with matched zoom and pan.'],
            [Cpu, 'Stays responsive', 'Tracing runs in a worker and can be cancelled at any time.'],
            [Smartphone, 'Works on phones', 'Touch-friendly controls and a layout that fits from 320 px wide.'],
          ].map(([Icon, t, d]) => {
            const I = Icon as typeof Lock
            return (
              <li key={t as string} className="flex gap-3">
                <I size={22} className="mt-1 shrink-0 text-accent" aria-hidden="true" />
                <div><h3 className="text-lg font-bold">{t as string}</h3><p className="text-muted">{d as string}</p></div>
              </li>
            )
          })}
        </ul>
        <p className="mt-6 flex items-center gap-2 text-sm text-muted"><Download size={16} aria-hidden="true" /> Free to use. No sign-up, pricing, or watermark.</p>
      </section>

      <Guide />
      <AdSlot />
      <Faq />
    </>
  )
}
