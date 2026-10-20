export function Guide() {
  return (
    <section className="mx-auto mt-20 max-w-3xl px-4" aria-labelledby="guide-h">
      <article className="prose-vm">
        <h2 id="guide-h" className="!mt-0 text-3xl">A practical guide to image tracing</h2>

        <h3>Raster versus vector</h3>
        <p>A raster image such as a PNG or JPG is a grid of coloured pixels. Enlarge it and the grid becomes visible as blur or blocks. A vector image such as an SVG describes shapes with points and curves, so it can be drawn sharply at any size, from a favicon to a billboard.</p>

        <h3>When SVG is useful</h3>
        <p>SVG suits logos, icons, diagrams, cut files for vinyl or laser cutters, and artwork you need to resize, recolour, or animate. It is a poor fit for photographs, where the information really is in millions of subtly different pixels.</p>

        <h3>Why logos trace better than photos</h3>
        <p>A logo already consists of a few flat colours with crisp boundaries, which is exactly what a vector describes. A photograph has gradients, grain, and texture. To trace it, the tool must flatten tones into a limited set of colours, which gives a posterised look.</p>

        <h3>How colour count affects the result</h3>
        <p>Every extra colour adds regions to trace. Two or four colours give bold, simple shapes and small files. Sixteen or thirty-two keep subtle tones but can produce many thousands of paths. Start low and raise the count only until the image stops looking wrong.</p>

        <h3>Getting cleaner results from a low-quality source</h3>
        <ul>
          <li>Start from the largest, least compressed version you have. JPG artefacts look like detail to a tracer.</li>
          <li>Use the Black and White preset for scans, and adjust the threshold until thin strokes are complete but the paper stays clean.</li>
          <li>Raise the small-region filter to drop dust and speckle, or add a one-pixel pre-blur for grainy images.</li>
          <li>Pick fewer colours for flat artwork so near-identical shades merge into one.</li>
        </ul>

        <h3>Why tiny text traces poorly</h3>
        <p>Letters smaller than a few pixels per stroke do not have enough information to rebuild their shapes, and the tracer’s noise filter may remove them entirely. Trace a larger version of the artwork, or retype the text in a font and combine it with the traced shapes in a vector editor.</p>

        <h3>Why an SVG can be larger than a JPG</h3>
        <p>File size follows complexity. A simple icon can be a few hundred bytes. A traced photo can be several times the size of the original JPG. The size shown after conversion is measured from the real file.</p>

        <h3>How working resolution affects processing</h3>
        <p>Tracing time grows faster than the pixel count, so VectorMint traces at a working size of up to 800, 1,200, or 1,800 pixels on the longest edge, depending on the detail level. Larger sizes keep finer features but take longer and make larger files. The exported SVG keeps the original proportions and scales to any size.</p>
      </article>
    </section>
  )
}
