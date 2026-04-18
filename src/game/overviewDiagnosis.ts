import { INITIAL_PRICE } from './constants'

export type OverviewStats = {
  believers: number
  holders: number
  builders: number
  trust: number
  price: number
}

/** Short, data-driven diagnosis for the Overview panel (MVP). */
export function buildOverviewDiagnosis(s: OverviewStats): string {
  const total = s.believers + s.holders + s.builders
  const bShare = total > 0 ? s.believers / total : 0
  const hShare = total > 0 ? s.holders / total : 0
  const rShare = total > 0 ? s.builders / total : 0
  const priceVsLaunch = s.price / INITIAL_PRICE

  const trustBand =
    s.trust < 35 ? 'low' : s.trust > 70 ? 'high' : 'mid'

  const parts: string[] = []

  if (bShare >= 0.55) {
    parts.push('Believers dominate the population mix.')
  } else if (hShare >= 0.4) {
    parts.push('Holders are unusually large versus believers.')
  } else if (rShare >= 0.15) {
    parts.push('Builders punch above typical weight for this stage.')
  } else {
    parts.push('Adoption mix is relatively balanced across cohorts.')
  }

  if (trustBand === 'low') {
    parts.push('Trust is fragile; internal shocks and rumor risk are elevated.')
  } else if (trustBand === 'high') {
    parts.push('Trust is solid; the ecosystem can absorb noisier headlines.')
  } else {
    parts.push('Trust is middling; balance upgrades to avoid tipping negative.')
  }

  if (priceVsLaunch < 0.85) {
    parts.push('Price sits meaningfully below launch; defense and depth matter.')
  } else if (priceVsLaunch > 1.25) {
    parts.push('Price is above launch; watch overheating versus fundamentals.')
  } else {
    parts.push('Price is near launch levels; macro swings still drive most moves.')
  }

  return parts.join(' ')
}

/**
 * Wraps the same {@link buildOverviewDiagnosis} output used in Overview/Frens
 * into a short closing line for the end-of-run report.
 */
export function buildRunConclusionFromDiagnosis(diagnosis: string): string {
  return `This sprint is sealed. ${diagnosis}`
}
