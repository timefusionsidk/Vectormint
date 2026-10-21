import { describe, expect, it } from 'vitest'
import { vectorFilename, formatBytes } from '../src/lib/filename'
import { checkSvgString } from '../src/features/vectorizer/svg-validation'

describe('filename + validation helpers', () => {
  it('sanitises output filenames', () => {
    expect(vectorFilename('My Logo (final).PNG')).toBe('My-Logo-final-vector.svg')
    expect(vectorFilename('../../etc/passwd.jpg')).toBe('etc-passwd-vector.svg')
    expect(vectorFilename('???.png')).toBe('image-vector.svg')
    expect(formatBytes(2048)).toBe('2.0 KB')
  })
  it('rejects unsafe or raster-wrapping SVG', () => {
    const base = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path d="M0 0L1 1Z"/>'
    expect(checkSvgString(base + '</svg>').ok).toBe(true)
    for (const bad of ['<image href="x.png"/>', '<script>1</script>', '<foreignObject/>', '<path onclick="x()" d="M0 0"/>', '<path style="fill:url(https://a.b/c)" d="M0 0"/>'])
      expect(checkSvgString(base + bad + '</svg>').ok).toBe(false)
    expect(checkSvgString('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"></svg>').problems).toContain('contains no vector paths')
  })
})
