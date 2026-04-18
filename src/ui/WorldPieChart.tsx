type Props = {
  believers: number
  holders: number
  builders: number
  size?: number
}

function slicePath(
  cx: number,
  cy: number,
  r: number,
  a0: number,
  a1: number,
): string {
  const x0 = cx + r * Math.cos(a0)
  const y0 = cy + r * Math.sin(a0)
  const x1 = cx + r * Math.cos(a1)
  const y1 = cy + r * Math.sin(a1)
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`
}

export function WorldPieChart({ believers, holders, builders, size = 140 }: Props) {
  const total = believers + holders + builders
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.36

  if (total <= 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Empty pie">
        <circle cx={cx} cy={cy} r={r} fill="#1f2533" stroke="#2a3346" />
      </svg>
    )
  }

  const bFrac = believers / total
  const hFrac = holders / total
  const buFrac = builders / total

  const start = -Math.PI / 2
  const a1 = start + bFrac * 2 * Math.PI
  const a2 = a1 + hFrac * 2 * Math.PI
  const a3 = a2 + buFrac * 2 * Math.PI

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Believers, holders, and builders share"
    >
      <path d={slicePath(cx, cy, r, start, a1)} fill="#5eead4" opacity={0.9} />
      <path d={slicePath(cx, cy, r, a1, a2)} fill="#a78bfa" opacity={0.9} />
      <path d={slicePath(cx, cy, r, a2, a3)} fill="#fbbf24" opacity={0.9} />
      <circle
        cx={cx}
        cy={cy}
        r={r * 0.45}
        fill="#0f141f"
        stroke="#2a3346"
        strokeWidth={1}
      />
    </svg>
  )
}
