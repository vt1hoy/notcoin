/**
 * Normalized gameplay events + ambient ticker lines from JSON.
 * edit values in src/game/config/events.json
 */
import eventsBundle from './events.json'
import type { EventCategory, EventDef, InternalEventDef } from '../types'

type EventTypeJson = 'positive' | 'negative' | 'neutral'

function categoryFromType(t: EventTypeJson): EventCategory {
  if (t === 'positive') return 'green'
  if (t === 'negative') return 'red'
  return 'gray'
}

function biasFromType(t: EventTypeJson): InternalEventDef['bias'] {
  if (t === 'positive') return 'positive'
  if (t === 'negative') return 'negative'
  return 'neutral'
}

type RawWorldRow = {
  id: string
  label: string
  type: EventTypeJson
  pricePct?: number
  trustDelta?: number
  weight?: number
  believersDelta?: number
  holdersDelta?: number
  buildersDelta?: number
  notcoinDelta?: number
}

type RawInternalRow = {
  id: string
  label: string
  type: EventTypeJson
  pricePct?: number
  trustDelta?: number
  weight?: number
  believersDelta?: number
  holdersDelta?: number
  buildersDelta?: number
  notcoinDelta?: number
}

type EventsFile = {
  world: RawWorldRow[]
  internal: RawInternalRow[]
  fluffTicker: string[]
}

const bundle = eventsBundle as EventsFile

const WORLD_WEIGHTED = bundle.world.map((r) => ({
  weight: r.weight ?? 1,
  event: {
    id: r.id,
    label: r.label,
    category: categoryFromType(r.type),
    pricePct: r.pricePct,
    trustDelta: r.trustDelta,
    believersDelta: r.believersDelta,
    holdersDelta: r.holdersDelta,
    buildersDelta: r.buildersDelta,
    notcoinDelta: r.notcoinDelta,
  } as EventDef,
}))

/** Flat list (order matches config); selection uses {@link pickRandomWorldEvent}. */
export const WORLD_EVENTS: EventDef[] = WORLD_WEIGHTED.map((w) => w.event)

export const INTERNAL_EVENTS: InternalEventDef[] = bundle.internal.map(
  (r) => ({
    id: r.id,
    label: r.label,
    category: categoryFromType(r.type),
    pricePct: r.pricePct,
    trustDelta: r.trustDelta,
    believersDelta: r.believersDelta,
    holdersDelta: r.holdersDelta,
    buildersDelta: r.buildersDelta,
    notcoinDelta: r.notcoinDelta,
    bias: biasFromType(r.type),
    baseWeight: r.weight ?? 1,
  }),
)

export function pickRandomWorldEvent(): EventDef {
  const total = WORLD_WEIGHTED.reduce((s, w) => s + w.weight, 0)
  let r = Math.random() * total
  for (const row of WORLD_WEIGHTED) {
    r -= row.weight
    if (r <= 0) return row.event
  }
  return WORLD_WEIGHTED[WORLD_WEIGHTED.length - 1]!.event
}

export const FLUFF_TICKER_MESSAGES: readonly string[] = bundle.fluffTicker
