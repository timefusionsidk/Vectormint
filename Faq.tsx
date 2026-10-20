import { ChevronDown } from 'lucide-react'

const ITEMS: Array<[string, string]> = [
  ['Is my image uploaded anywhere?', 'No. The image is decoded and traced inside your browser, and the SVG is built there too. VectorMint has no server that receives images. Your browser still requests the website’s own files, and ads or statistics only load if the site owner enabled them and you accepted.'],
  ['Which files can I use?', 'PNG, JPG, and WebP, including transparent PNG and WebP. Some browsers can also open AVIF; if yours cannot, you will see a message. SVG, GIF, HEIC, PDF, and TIFF are not supported.'],
  ['Why is my SVG bigger than my JPG?', 'A JPG stores compressed pixels. An SVG stores the outline of every shape as coordinates. A photo or a detailed illustration has thousands of small shapes, so the vector can be larger. Fewer colours, Low detail, and a higher small-region filter all reduce the size.'],
  ['Can it turn text into editable text?', 'No. Text becomes outlined shapes. It looks like the letters but it is not a font, and this is not OCR.'],
  ['Will a signature become a single line?', 'It becomes a filled outline of the stroke, not a centreline. That scales cleanly and is fine for most uses. Pen-plotter or embroidery work may need a dedicated centreline tool.'],
  ['What happens to transparency?', 'Pixels that are at least half opaque are kept; fainter pixels are treated as empty, so soft shadows and feathered edges become hard cut-outs. Transparent areas stay transparent in the SVG unless you choose a solid background.'],
  ['Does it remove backgrounds?', 'No. An opaque background is traced like any other colour area. Background removal for photos is a different feature that VectorMint does not offer.'],
  ['Why was my large image traced smaller?', 'Tracing cost grows quickly with pixel count, so the image is resized down to a working size (up to 1,200 px on the longest edge by default) before tracing. The SVG still declares the original proportions and scales to any size.'],
  ['Is the result an exact copy?', 'No. Tracing approximates colour regions with paths. It cannot recover the original design layers or perfectly reproduce every pixel.'],
]

export function Faq() {
  return (
    <section id="faq" className="mx-auto mt-20 max-w-3xl px-4" aria-labelledby="faq-h">
      <h2 id="faq-h" className="text-3xl font-bold">Frequently asked questions</h2>
      <div className="mt-6 divide-y divide-line border-y border-line">
        {ITEMS.map(([q, a]) => (
          <details key={q} className="group py-1">
            <summary className="flex min-h-[48px] items-center justify-between gap-4 py-2 font-semibold">
              {q} <ChevronDown size={18} className="shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <p className="pb-4 text-muted">{a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
