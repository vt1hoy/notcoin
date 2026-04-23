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
  RecentPopupSpawn,
  TickerLine,
} from './types'

export type GameStateSnapshot = {
  sessionMapActiveMs: number
  /** True once the world SVG + layout (centroids + candidate points) is ready. */
  worldReady: boolean
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
  popups: MapPopup[]
  /** Recent Notcoin popup spawn positions + countries (spatial + geographic variety). */
  recentPopupSpawns: RecentPopupSpawn[]
  nextPopupAtSessionMs: number
  nextMainEventAtSessionMs: number
  nextFluffTickerAtSessionMs: number
  tickerLines: TickerLine[]
  /** Main-news category counts for quota nudging (per session). */
  mainEventCategoryCounts: { negative: number; positive: number; neutral: number }
  /** Number of main news events already fired this session. */
  mainEventsSeen: number
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
    worldReady: false,
    price: INITIAL_PRICE,
    priceMin: INITIAL_PRICE,
    priceMax: INITIAL_PRICE,
    notcoinBalance: 50,
    believers: 80_000,
    holders: 12_000,
    builders: 1200,
    trust: 40,
    productsLaunched: 0,
    upgradeLevels: {},
    globalCostMultiplier: 1,
    lastBelieversUpgradeAtSessionMs: null,
    recentBelieversUpgradeCount: 0,
    passivePerSecond: 0,
    settingsOpen: false,
    activeMainPanel: null,
    activeSidePanel: null,
    popups: [],
    recentPopupSpawns: [],
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
    mainEventCategoryCounts: { negative: 0, positive: 0, neutral: 0 },
    mainEventsSeen: 0,
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
