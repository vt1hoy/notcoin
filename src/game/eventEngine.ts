import { PRICE_FLOOR, PRICE_PCT_CLAMP } from './constants'
// edit values in src/game/config/events.json
import {
  INTERNAL_EVENTS,
  pickRandomWorldEvent,
  WORLD_EVENTS,
} from './config/eventsFromJson'
import { effectivePricePctForEvent } from './formulas'
import type {
  EventCategory,
  EventDef,
  InternalEventDef,
  TickerColor,
  TickerLine,
} from './types'

const GAMMA = 2

export { INTERNAL_EVENTS, WORLD_EVENTS, pickRandomWorldEvent }

export function randomIntInclusive(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function clampTrust(n: number): number {
  return Math.min(100, Math.max(0, n))
}

function tickerColorFromCategory(c: EventCategory): TickerColor {
  if (c === 'green') return 'green'
  if (c === 'red') return 'red'
  return 'gray'
}

/** Clamp declared price move to category bands (fractional). */
export function clampPricePctForCategory(
  category: EventCategory,
  raw: number,
): number {
  if (category === 'gray') return 0
  if (category === 'green') {
    return Math.max(0.05, Math.min(0.7, raw))
  }
  return Math.max(-0.7, Math.min(-0.05, raw))
}

export function formatTokenPriceImpactLine(pricePctEffective: number): string {
  const pct = pricePctEffective * 100
  const rounded = Math.round(pct * 10) / 10
  if (rounded === 0) return 'Token price: 0%'
  const sign = rounded > 0 ? '+' : ''
  return `Token price: ${sign}${rounded}%`
}

function internalPickWeight(e: InternalEventDef, trust: number): number {
  const t = trust / 100
  const inv = (100 - trust) / 100
  if (e.bias === 'positive') return e.baseWeight * Math.pow(t, GAMMA)
  if (e.bias === 'negative') return e.baseWeight * Math.pow(inv, GAMMA)
  return e.baseWeight
}

export function pickInternalEvent(trust: number): InternalEventDef {
  let total = 0
  const weights = INTERNAL_EVENTS.map((e) => {
    const w = internalPickWeight(e, trust)
    total += w
    return w
  })
  let r = Math.random() * total
  for (let i = 0; i < INTERNAL_EVENTS.length; i++) {
    r -= weights[i]!
    if (r <= 0) return INTERNAL_EVENTS[i]!
  }
  return INTERNAL_EVENTS[INTERNAL_EVENTS.length - 1]!
}

export type MainEventPick = { kind: 'world' | 'internal'; event: EventDef }

/** One combined headline stream: either world or internal (trust-weighted when internal). */
export function pickMainEvent(trust: number): MainEventPick {
  if (Math.random() < 0.5) {
    return { kind: 'world', event: pickRandomWorldEvent() }
  }
  return { kind: 'internal', event: pickInternalEvent(trust) }
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
  event: EventDef
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
  const rawClamped = clampPricePctForCategory(
    category,
    p.event.pricePct ?? 0,
  )
  const shaped = effectivePricePctForEvent(rawClamped, p.trust)
  const pricePctEffective = Math.max(
    -PRICE_PCT_CLAMP,
    Math.min(PRICE_PCT_CLAMP, shaped),
  )

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
