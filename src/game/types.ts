export type MainPanel =
  | 'overview'
  | 'believers'
  | 'holders'
  | 'builders'
  | 'frens'

export type SidePanel = 'world'

export type TickerColor = 'gray' | 'green' | 'red'

/** Main-event briefing category — drives banner color and price band. */
export type EventCategory = 'positive' | 'negative' | 'neutral'

export type GameUiState = {
  settingsOpen: boolean
  activeMainPanel: MainPanel | null
  activeSidePanel: SidePanel | null
}

export type MapPopup = {
  id: string
  x: number
  y: number
  rewardNotcoin: number
  expiresAtSessionMs: number
  /** Session time when this popup was spawned (for enter animation). */
  spawnedAtSessionMs: number
}

/** Last popup spawn sites for spatial diversity (not persisted across app reload). */
export type RecentPopupSpawn = {
  x: number
  y: number
  sessionMs: number
  countryKey: string
}

/**
 * Player-created infection from a tapped Notcoin popup (map x/y, grows locally then feeds country level).
 */
export type InfectionSeed = {
  id: string
  x: number
  y: number
  createdAtSessionMs: number
  /** 0–1 maturity; drives visual size and country bleed rate. */
  growthLevel: number
  /** Country whose infection level this seed feeds (nearest centroid at creation). */
  countryKey: string
}

export type TickerLine = {
  id: string
  label: string
  color: TickerColor
  atSessionMs: number
  /** When true, line is flavor only (background ticker); never tied to main events. */
  cosmetic?: boolean
}

/** One persistent infection blob on the map (not regenerated each frame). */
export type InfectionClusterVisual = {
  id: string
  ox: number
  oy: number
  dots: { dx: number; dy: number }[]
  /** Session time when this cluster was created (for map decay / pulse strength). */
  spawnedAtSessionMs: number
}

/** Per-country list of cluster visuals (length capped by infection tier). */
export type InfectionClustersByCountry = Record<string, InfectionClusterVisual[]>

/** Full-screen news strip while the sim is frozen (Plague-style). */
export type EventBannerState = {
  kind: 'main'
  headline: string
  /** One-line summary of applied price move, e.g. "Token price: +12%". */
  priceImpactLine: string
  subline: string
  tickerColor: TickerColor
}

export type EventDef = {
  id: string
  label: string
  category: EventCategory
  /**
   * Optional deltas applied with the event. Price move is generated at runtime
   * (range depends on {@link category}).
   */
  trustDelta?: number
  believersDelta?: number
  holdersDelta?: number
  buildersDelta?: number
  notcoinDelta?: number
}

export type WeightedEventDef = EventDef & {
  weight: number
}
