/** "My Logo (final).PNG" -> "My-Logo-final-vector.svg". Never returns an unsafe or empty name. */
export function vectorFilename(original: string): string {
  const stem = original.replace(/\.[^./\\]+$/, '')
  const safe = stem
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80)
  return `${safe || 'image'}-vector.svg`
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}
