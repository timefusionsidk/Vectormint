/** Pixel blocks on the left resolving into clean curves on the right. Pure inline SVG, no motion. */
export function HeroArt() {
  const cell = 14
  // A coarse bitmap of a leaf-like shape; 1 = filled.
  const grid = [
    '000011100', '000111110', '001111111', '011111111', '011111110',
    '111111100', '111111000', '011110000', '001100000',
  ]
  return (
    <svg viewBox="0 0 460 200" role="img" aria-label="Blocky pixels on the left turning into a smooth vector curve on the right" className="h-auto w-full max-w-[460px]">
      <g transform="translate(14 36)">
        {grid.flatMap((row, y) =>
          [...row].map((c, x) => (c === '1' ? <rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell} height={cell} fill="var(--ink)" opacity={0.86} /> : null)),
        )}
      </g>
      <g stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M168 100 H238" /><path d="M224 88 L240 100 L224 112" strokeLinejoin="round" />
      </g>
      <g transform="translate(262 20)">
        <path d="M14 150 C6 70 52 14 160 12 C166 92 126 152 14 150 Z" fill="var(--accent)" />
        <path d="M44 128 C66 88 98 56 140 38" fill="none" stroke="var(--paper)" strokeWidth="5" strokeLinecap="round" />
        <g fill="var(--panel)" stroke="var(--accent-strong)" strokeWidth="2">
          <rect x="9" y="145" width="9" height="9" /><rect x="155" y="7" width="9" height="9" /><circle cx="86" cy="6" r="5" /><circle cx="52" cy="78" r="5" />
        </g>
      </g>
    </svg>
  )
}
