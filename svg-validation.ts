export interface SvgCheck { ok: boolean; problems: string[]; pathCount: number }

const FORBIDDEN: Array<[RegExp, string]> = [
  [/<image[\s>/]/i, 'contains an <image> element'],
  [/<script[\s>/]/i, 'contains a <script> element'],
  [/<foreignObject[\s>/]/i, 'contains <foreignObject>'],
  [/\son[a-z]+\s*=/i, 'contains an event-handler attribute'],
  [/(xlink:)?href\s*=/i, 'references an external resource'],
  [/data:image\//i, 'embeds raster data'],
  [/url\(\s*['"]?https?:/i, 'references an external resource'],
]

/** Structural and safety checks that run anywhere (worker, main thread, tests). */
export function checkSvgString(svg: string): SvgCheck {
  const problems: string[] = []
  if (!/^<svg[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(svg)) problems.push('missing SVG namespace')
  if (!/viewBox="0 0 [\d.]+ [\d.]+"/.test(svg)) problems.push('missing viewBox')
  if (!svg.trimEnd().endsWith('</svg>')) problems.push('not closed')
  for (const [re, msg] of FORBIDDEN) if (re.test(svg)) problems.push(msg)
  if (/NaN|Infinity|undefined/.test(svg)) problems.push('contains invalid numbers')
  const pathCount = (svg.match(/<path\s/g) ?? []).length
  if (pathCount === 0) problems.push('contains no vector paths')
  return { ok: problems.length === 0, problems, pathCount }
}

/** Main-thread check: also confirms the SVG is well-formed XML. */
export function validateSvgInBrowser(svg: string): SvgCheck {
  const base = checkSvgString(svg)
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
  if (doc.getElementsByTagName('parsererror').length > 0) {
    return { ...base, ok: false, problems: [...base.problems, 'not well-formed XML'] }
  }
  return base
}
