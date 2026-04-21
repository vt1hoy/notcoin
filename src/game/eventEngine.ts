import { PRICE_FLOOR, PRICE_PCT_CLAMP } from './constants'
// edit values in src/game/config/events.json
import { MAIN_EVENTS } from './config/eventsFromJson'
import { effectivePricePctForEvent } from './formulas'
import type {
  EventCategory,
  TickerColor,
  TickerLine,
  WeightedEventDef,
} from './types'

export function randomIntInclusive(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function clampTrust(n: number): number {
  return Math.min(100, Math.max(0, n))
}

function tickerColorFromCategory(c: EventCategory): TickerColor {
  if (c === 'positive') return 'green'
  if (c === 'negative') return 'red'
  return 'gray'
}

function randFloat(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

export function formatTokenPriceImpactLine(pricePctEffective: number): string {
  const pct = pricePctEffective * 100
  const rounded = Math.round(pct * 10) / 10
  if (rounded === 0) return 'Token price: 0%'
  const sign = rounded > 0 ? '+' : ''
  return `Token price: ${sign}${rounded}%`
}

function weightedPick<T extends { weight: number }>(list: T[]): T {
  const total = list.reduce((s, e) => s + (e.weight || 0), 0) || list.length
  let r = Math.random() * total
  for (const e of list) {
    r -= e.weight || 0
    if (r <= 0) return e
  }
  return list[list.length - 1]!
}

export type EventCategoryCounts = Record<EventCategory, number>

const TARGET_RATIO: Record<EventCategory, number> = {
  negative: 0.4,
  positive: 0.35,
  neutral: 0.25,
}

function pickCategoryWithQuota(
  counts: EventCategoryCounts,
  totalSeen: number,
): EventCategory {
  const nextN = totalSeen + 1
  const deficits: Record<EventCategory, number> = {
    negative: Math.max(0, nextN * TARGET_RATIO.negative - (counts.negative ?? 0)),
    positive: Math.max(0, nextN * TARGET_RATIO.positive - (counts.positive ?? 0)),
    neutral: Math.max(0, nextN * TARGET_RATIO.neutral - (counts.neutral ?? 0)),
  }
  const sum = deficits.negative + deficits.positive + deficits.neutral

  // If everything is on-target (or early rounding cancels out), fall back to base ratios.
  const base: Record<EventCategory, number> =
    sum > 0
      ? deficits
      : {
          negative: TARGET_RATIO.negative,
          positive: TARGET_RATIO.positive,
          neutral: TARGET_RATIO.neutral,
        }

  const total = base.negative + base.positive + base.neutral
  let r = Math.random() * total
  r -= base.negative
  if (r <= 0) return 'negative'
  r -= base.positive
  if (r <= 0) return 'positive'
  return 'neutral'
}

/** Main event selection from one shared pool with per-session category nudging. */
export function pickMainEvent(
  counts: EventCategoryCounts,
  totalSeen: number,
): WeightedEventDef {
  const cat = pickCategoryWithQuota(counts, totalSeen)
  const list = MAIN_EVENTS.filter((e) => e.category === cat)
  if (list.length === 0) {
    // Fallback: pick from full pool (should not happen if config is valid).
    return weightedPick(MAIN_EVENTS)
  }
  return weightedPick(list)
}

export function makeCosmeticTickerLine(
  atSessionMs: number,
  label: string,
): TickerLine {
  return {
    id: crypto.randomUUID(),
    label,
    color: 'gray',
    atSessionMs,
    cosmetic: true,
  }
}

export type EventApplyParams = {
  event: WeightedEventDef
  price: number
  priceMin: number
  priceMax: number
  trust: number
  believers: number
  holders: number
  builders: number
  notcoinBalance: number
  sessionMapActiveMs: number
}

export type EventApplyResult = {
  price: number
  priceMin: number
  priceMax: number
  trust: number
  believers: number
  holders: number
  builders: number
  notcoinBalance: number
  tickerLine: TickerLine
  priceImpactLine: string
}

export function applyEventEffects(p: EventApplyParams): EventApplyResult {
  const category = p.event.category
  const basePricePct =
    category === 'positive'
      ? randFloat(0.05, 0.5)
      : category === 'negative'
        ? randFloat(-0.6, -0.05)
        : randFloat(-0.05, 0.05)

  const shaped = effectivePricePctForEvent(basePricePct, p.trust)
  let pricePctEffective = Math.max(-PRICE_PCT_CLAMP, Math.min(PRICE_PCT_CLAMP, shaped))
  if (category === 'negative') {
    // Hard floor: effective negative move cannot be worse than -85%.
    pricePctEffective = Math.max(-0.85, pricePctEffective)
  }

  let price = p.price * (1 + pricePctEffective)
  price = Math.max(PRICE_FLOOR, price)

  const trust = clampTrust(p.trust + (p.event.trustDelta ?? 0))
  const believers = Math.max(0, p.believers + (p.event.believersDelta ?? 0))
  const holders = Math.max(0, p.holders + (p.event.holdersDelta ?? 0))
  const builders = Math.max(0, p.builders + (p.event.buildersDelta ?? 0))
  const notcoinBalance = p.notcoinBalance + (p.event.notcoinDelta ?? 0)

  const priceMin = Math.min(p.priceMin, price)
  const priceMax = Math.max(p.priceMax, price)

  const color = tickerColorFromCategory(category)

  return {
    price,
    priceMin,
    priceMax,
    trust,
    believers,
    holders,
    builders,
    notcoinBalance,
    tickerLine: {
      id: crypto.randomUUID(),
      label: p.event.label,
      color,
      atSessionMs: p.sessionMapActiveMs,
    },
    priceImpactLine: formatTokenPriceImpactLine(pricePctEffective),
  }
}
