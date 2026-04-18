import {
  GAME_END_MS,
  GAME_START_MS,
  SESSION_MS,
  TOTAL_GAME_MS,
} from './constants'

/** Calendar position from authoritative session time only. */
export function selectGameDateMs(sessionMapActiveMs: number): number {
  const p = Math.min(1, Math.max(0, sessionMapActiveMs / SESSION_MS))
  return Math.min(GAME_END_MS, GAME_START_MS + p * TOTAL_GAME_MS)
}

export function formatGameDate(sessionMapActiveMs: number): string {
  const ms = selectGameDateMs(sessionMapActiveMs)
  const d = new Date(ms)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}.${mm}.${yyyy}`
}
