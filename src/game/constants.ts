/** Real session length — wall clock mapped to full in-game calendar (`TOTAL_GAME_MS`). */
export const SESSION_MS = 5 * 60 * 1000

/** In-game calendar start (maps to session 0). 16.05.2024 */
export const GAME_START_MS = Date.UTC(2024, 4, 16, 0, 0, 0, 0)

/** In-game calendar end (maps to session complete). 17.06.2026 */
export const GAME_END_MS = Date.UTC(2026, 5, 17, 0, 0, 0, 0)

export const TOTAL_GAME_MS = GAME_END_MS - GAME_START_MS

export const INITIAL_PRICE = 0.1
export const PRICE_FLOOR = 0.0001

/** Fixed supply for market cap display (price × supply). */
export const NOTCOIN_SUPPLY = 100_000_000_000

export const SIM_INTERVAL_MS = 50

/** Popup lifetime on the map (scaled for 5-minute run). */
export const POPUP_TTL_SESSION_MS = 2_200

/** Tap reward range when a map popup is collected (Notcoin). */
export const POPUP_REWARD_MIN_NC = 8
export const POPUP_REWARD_MAX_NC = 30

/**
 * Primary narrative events: pause sim + banner until dismissed.
 * Compressed for 5-minute runs (~12 main beats per run).
 */
export const MAIN_EVENT_MIN_MS = 15_000
export const MAIN_EVENT_MAX_MS = 25_000

/** Ambient news-ticker lines (cosmetic only). */
export const FLUFF_TICKER_MIN_MS = 20_000
export const FLUFF_TICKER_MAX_MS = 30_000

/** Map popup spawn cadence (session time). */
export const POPUP_SPAWN_MIN_MS = 8_000
export const POPUP_SPAWN_MAX_MS = 14_000

/** Clamp per-event price move (green/red events can reach ±70%). */
export const PRICE_PCT_CLAMP = 0.7

/** Matches `public/maps/world.svg` (Simplemaps world). */
export const MAP_VIEWBOX = { width: 2000, height: 857 } as const

/** Applied after any upgrade purchase: `globalCostMultiplier *= 1 + this`. */
export const UPGRADE_GLOBAL_COST_STEP = 0.025

/** Believers burst window for stacking penalties (session time ms). */
export const BELIEVERS_STACK_WINDOW_MS = 9_000

/** Extra trust penalty per stacked prior purchase in-window: `trustPenalty * (1 + factor * stackIndex)`. */
export const BELIEVERS_STACK_TRUST_FACTOR = 0.25

/** Extra price penalty per stacked prior purchase: `pricePenaltyPct * (1 + factor * stackIndex)`. */
export const BELIEVERS_STACK_PRICE_FACTOR = 0.2

/** Hard cap on a single Believers hit’s price penalty after stacking (still multiplicative). */
export const BELIEVERS_MAX_PRICE_PENALTY_HIT = 0.45

/** Max stack index used when scaling penalties (0 = first in burst). */
export const BELIEVERS_STACK_INDEX_CAP = 6

// --- Map infection spread (slow auto-diffusion; player taps drive new seeds) ---

/** Local growth rate for already-infected countries (per second, scaled by believers). */
export const MAP_INFECTION_GROWTH_PER_S = 0.0018

/** Neighbor jump probability scale when leaking infection. */
export const MAP_INFECTION_SPREAD_FACTOR = 0.0016

/** Amount leaked to neighbors per successful spread tick (scaled by dt). */
export const MAP_INFECTION_NEIGHBOR_LEAK = 0.00065

/** Only countries at least this infected can act as a neighbor spread source. */
export const MAP_NEIGHBOR_SOURCE_MIN_LEVEL = 0.16

/** Believers count reference for infection growth intensity. */
export const MAP_BELIEVERS_REF = 42_000

/** Max infection blobs on the map (keep readable). */
export const GLOBAL_INFECTION_CLUSTER_CAP = 28

// --- Player infection seeds (Notcoin popup taps) ---

/** How fast a tapped seed’s `growthLevel` approaches 1 (per second). */
export const PLAYER_SEED_GROWTH_PER_S = 0.028

/** How fast mature seeds push infection into their `countryKey` (per second, scaled by growth & room). */
export const PLAYER_SEED_COUNTRY_PUSH_PER_S = 0.0075

/** One-shot bump to country level when a popup is tapped (starts the slow country tint). */
export const PLAYER_SEED_INITIAL_COUNTRY_BUMP = 0.006
