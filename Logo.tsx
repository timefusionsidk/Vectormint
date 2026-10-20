export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="var(--accent)" />
      <path d="M14 46 C14 22 30 16 50 18 C48 38 40 50 14 46 Z" fill="var(--on-accent)" />
      <path d="M22 42 C26 32 34 26 42 25" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
