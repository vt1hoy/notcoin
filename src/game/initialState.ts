import {
  FLUFF_TICKER_MAX_MS,
  FLUFF_TICKER_MIN_MS,
  INITIAL_PRICE,
  MAIN_EVENT_MAX_MS,
  MAIN_EVENT_MIN_MS,
  POPUP_SPAWN_MAX_MS,
  POPUP_SPAWN_MIN_MS,
} from './constants'
import { randomIntInclusive } from './eventEngine'
import type {
  EventBannerState,
  InfectionClustersByCountry,
  InfectionSeed,
  MapPopup,
  TickerLine,
} from './types'

export type GameStateSnapshot = {
  sessionMapActiveMs: number
  price: number
  priceMin: number
  priceMax: number
  notcoinBalance: number
  believers: number
  holders: number
  builders: number
  trust: number
  productsLaunched: number
  upgradeLevels: Record<string, number>
  globalCostMultiplier: number
  lastBelieversUpgradeAtSessionMs: number | null
  recentBelieversUpgradeCount: number
  passivePerSecond: number
  settingsOpen: boolean
  activeMainPanel:
    | null
    | 'overview'
    | 'believers'
    | 'holders'
    | 'builders'
    | 'frens'
  activeSidePanel: null | 'world'
  musicEnabled: boolean
  popups: MapPopup[]
  nextPopupAtSessionMs: number
  nextMainEventAtSessionMs: number
  nextFluffTickerAtSessionMs: number
  tickerLines: TickerLine[]
  /** Ephemeral UI toast; cleared on restart. */
  feedbackLine: string | null
  /** Per-country infection 0–1 (keys = SVG logical ids / names / classes). */
  countryInfection: Record<string, number>
  /** Persistent map clusters (capped globally; slots unlock on thresholds / spread). */
  infectionClusters: InfectionClustersByCountry
  /** Player-spawned infection loci from tapped popups only (no auto seeds). */
  infectionSeeds: InfectionSeed[]
  /** When set, simulation time is frozen until the player dismisses the strip. */
  eventBanner: EventBannerState | null
  /** Initial briefing overlay; sim and economy purchases stay paused until dismissed. */
  introBriefingOpen: boolean
}

const TICKER_MAX = 40

export function createInitialState(): GameStateSnapshot {
  return {
    sessionMapActiveMs: 0,
    price: INITIAL_PRICE,
    priceMin: INITIAL_PRICE,
    priceMax: INITIAL_PRICE,
    notcoinBalance: 50,
    believers: 50_000,
    holders: 20_000,
    builders: 2000,
    trust: 58,
    productsLaunched: 0,
    upgradeLevels: {},
    globalCostMultiplier: 1,
    lastBelieversUpgradeAtSessionMs: null,
    recentBelieversUpgradeCount: 0,
    passivePerSecond: 0,
    settingsOpen: false,
    activeMainPanel: null,
    activeSidePanel: null,
    musicEnabled: true,
    popups: [],
    nextPopupAtSessionMs: randomIntInclusive(
      POPUP_SPAWN_MIN_MS,
      POPUP_SPAWN_MAX_MS,
    ),
    nextMainEventAtSessionMs: randomIntInclusive(
      MAIN_EVENT_MIN_MS,
      MAIN_EVENT_MAX_MS,
    ),
    nextFluffTickerAtSessionMs: randomIntInclusive(
      FLUFF_TICKER_MIN_MS,
      FLUFF_TICKER_MAX_MS,
    ),
    tickerLines: [],
    feedbackLine: null,
    countryInfection: {},
    infectionClusters: {},
    infectionSeeds: [],
    eventBanner: null,
    introBriefingOpen: true,
  }
}

export function trimTicker(lines: TickerLine[]): TickerLine[] {
  if (lines.length <= TICKER_MAX) return lines
  return lines.slice(lines.length - TICKER_MAX)
}
