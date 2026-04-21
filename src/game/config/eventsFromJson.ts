/**
 * Normalized gameplay events + ambient ticker lines from JSON.
 * edit values in src/game/config/events.json
 */
import eventsBundle from './events.json'
import type { EventCategory, WeightedEventDef } from '../types'

type RawMainRow = {
  id: string
  label: string
  category: EventCategory
  weight?: number
  trustDelta?: number
  believersDelta?: number
  holdersDelta?: number
  buildersDelta?: number
  notcoinDelta?: number
}

type EventsFile = {
  mainEvents: RawMainRow[]
  fluffTicker: string[]
}

const bundle = eventsBundle as EventsFile

export const MAIN_EVENTS: WeightedEventDef[] = bundle.mainEvents.map((r) => ({
  id: r.id,
  label: r.label,
  category: r.category,
  weight: r.weight ?? 1,
  trustDelta: r.trustDelta,
  believersDelta: r.believersDelta,
  holdersDelta: r.holdersDelta,
  buildersDelta: r.buildersDelta,
  notcoinDelta: r.notcoinDelta,
}))

export const FLUFF_TICKER_MESSAGES: readonly string[] = bundle.fluffTicker
