import { INITIAL_PRICE } from './constants'

export type OverviewStats = {
  believers: number
  holders: number
  builders: number
  trust: number
  price: number
  purchasedHolderUpgrades: number
  purchasedBuilderUpgrades: number
}

/** Short, data-driven diagnosis for the Overview panel (MVP). */
export function buildOverviewDiagnosis(s: OverviewStats): string {
  const priceVsLaunch = s.price / INITIAL_PRICE

  const trustBand =
    s.trust < 35 ? 'low' : s.trust > 70 ? 'high' : 'mid'

  const lines: string[] = []

  // 1) price moved from launch (keep existing phrasing)
  if (priceVsLaunch < 0.85) {
    lines.push('Price sits meaningfully below launch; defense and depth matter.')
  } else if (priceVsLaunch > 1.25) {
    lines.push('Price is above launch; watch overheating versus fundamentals.')
  } else {
    lines.push('Price is near launch levels; macro swings still drive most moves.')
  }

  // 2) trust interpretation (keep existing phrasing)
  if (trustBand === 'low') {
    lines.push('Trust is fragile; internal shocks and rumor risk are elevated.')
  } else if (trustBand === 'high') {
    lines.push('Trust is solid; the ecosystem can absorb noisier headlines.')
  } else {
    lines.push('Trust is middling; balance upgrades to avoid tipping negative.')
  }

  // 3) holders line (based on purchased upgrades count)
  if (s.purchasedHolderUpgrades <= 1) {
    lines.push('Holder support is weak; the system remains exposed to sell pressure.')
  } else if (s.purchasedHolderUpgrades <= 4) {
    lines.push('Holder support is present; some downside pressure is absorbed.')
  } else {
    lines.push('Holder support is strong; the system shows defensive depth under stress.')
  }

  // 4) builders line (based on purchased upgrades count)
  if (s.purchasedBuilderUpgrades <= 1) {
    lines.push('Builder activity is minimal; growth relies mostly on momentum.')
  } else if (s.purchasedBuilderUpgrades <= 4) {
    lines.push('Builder activity is visible; structural depth is beginning to form.')
  } else {
    lines.push('Builder activity is strong; the system has real structural support beyond hype.')
  }

  return lines.join('\n')
}

/**
 * Wraps the same {@link buildOverviewDiagnosis} output used in Overview/Frens
 * into a short closing line for the end-of-run report.
 */
export function buildRunConclusionFromDiagnosis(diagnosis: string): string {
  return diagnosis
}
