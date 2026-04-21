import { INITIAL_PRICE, PRICE_FLOOR, SESSION_MS } from './constants'
import type { GameUiState } from './types'

export type GameRunOptions = {
  /** When true, map time / passive / infection do not advance (event strip open). */
  eventBannerOpen?: boolean
}

export function isGameRunning(
  ui: GameUiState,
  opts?: GameRunOptions,
): boolean {
  if (opts?.eventBannerOpen) return false
  return (
    !ui.settingsOpen &&
    ui.activeMainPanel === null &&
    ui.activeSidePanel === null
  )
}

export function isRunComplete(sessionMapActiveMs: number): boolean {
  return sessionMapActiveMs >= SESSION_MS
}

export function priceDifficulty(price: number): number {
  return Math.min(
    6,
    Math.max(1, Math.sqrt(INITIAL_PRICE / Math.max(price, PRICE_FLOOR))),
  )
}

/**
 * `trust` is 0–100. Scales the **fractional** event `pricePct` before `price *= 1+p`.
 * Low trust: red moves hit harder (multiplier above 1 on negative raw).
 * High trust: red moves softened (multiplier below 1).
 */
export function softenNegativePricePct(
  pricePctRaw: number,
  trust: number,
): number {
  if (pricePctRaw >= 0) return pricePctRaw
  const t = Math.min(1, Math.max(0, trust / 100))
  // mult = 1.28 - 0.98 * t
  const mult = 1.28 - 0.98 * t
  return pricePctRaw * mult
}

/**
 * Low trust: green moves weaker. High trust: green moves stronger.
 */
export function amplifyPositivePricePct(
  pricePctRaw: number,
  trust: number,
): number {
  if (pricePctRaw <= 0) return pricePctRaw
  const t = Math.min(1, Math.max(0, trust / 100))
  const mult = 0.55 * (1 - t) + 1.55 * t
  return pricePctRaw * mult
}

export function effectivePricePctForEvent(
  pricePctRaw: number,
  trust: number,
): number {
  if (pricePctRaw < 0) {
    return softenNegativePricePct(pricePctRaw, trust)
  }
  if (pricePctRaw > 0) {
    // Positive events are trust-independent (apply raw value as-is).
    return pricePctRaw
  }
  return 0
}
