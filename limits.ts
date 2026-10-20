/** Starting engineering limits. Tune after measuring on target devices. */
export const LIMITS = {
  maxFileBytes: 20 * 1024 * 1024,
  maxSourcePixels: 24_000_000,
  /** Largest working edge the app ever offers; the source is decoded once at up to this size. */
  maxWorkingEdge: 1800,
  jobTimeoutMs: 120_000,
  /** Above this many traced paths the SVG would be unwieldy; ask the user to simplify instead. */
  maxPaths: 150_000,
} as const

export const SUPPORTED_LABEL = 'PNG, JPG, and WebP'
