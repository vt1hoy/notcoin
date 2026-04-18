/** Spot / ticker USD (full precision range). */
export function formatUsd(price: number): string {
  return price.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })
}

/** Large headline USD (market cap, etc.). */
export function formatCompactUsd(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
  })
}

/** Integer counts: believers, holders, builders, products. */
export function formatIntegerCount(n: number): string {
  return Math.round(n).toLocaleString('en-US', {
    maximumFractionDigits: 0,
  })
}

/** @deprecated Prefer {@link formatIntegerCount}. */
export function formatInt(n: number): string {
  return formatIntegerCount(n)
}

/**
 * Formats a fraction in (0,1) or (0,100] style inputs.
 * For values already 0–1 (e.g. 0.12 → 12%), pass as-is.
 */
export function formatPercentFromFraction(
  fraction: number,
  fractionDigits = 1,
): string {
  const pct = fraction <= 1 && fraction >= -1 ? fraction * 100 : fraction
  return `${pct.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}%`
}

/** Trust score on 0–100 scale → human percent label. */
export function formatTrustPercent(trust0to100: number): string {
  const clamped = Math.min(100, Math.max(0, trust0to100))
  const digits = clamped >= 10 && clamped <= 90 ? 0 : 1
  return `${clamped.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`
}

/** In-game Notcoin amounts (balances, costs, passive rate magnitude). */
export function formatNotcoin(n: number): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

/** Same as {@link formatNotcoin} with an explicit unit suffix. */
export function formatNotcoinWithUnit(n: number): string {
  return `${formatNotcoin(n)} NC`
}
