// edit values in src/game/config/events.json (fluffTicker)
import { FLUFF_TICKER_MESSAGES } from './config/eventsFromJson'

export function pickFluffTickerMessage(): string {
  const a = FLUFF_TICKER_MESSAGES
  return a[Math.floor(Math.random() * a.length)]!
}
