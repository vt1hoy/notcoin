import { create } from 'zustand'
import {
  FLUFF_TICKER_MAX_MS,
  FLUFF_TICKER_MIN_MS,
  MAIN_EVENT_MAX_MS,
  MAIN_EVENT_MIN_MS,
  POPUP_SPAWN_MAX_MS,
  POPUP_SPAWN_MIN_MS,
  PLAYER_SEED_INITIAL_COUNTRY_BUMP,
  POPUP_REWARD_MAX_NC,
  POPUP_REWARD_MIN_NC,
  POPUP_TTL_SESSION_MS,
  PRICE_FLOOR,
  SESSION_MS,
} from '../game/constants'
import {
  applyPlayerInfectionSeeds,
  collectInfectionAnchorPoints,
  findNearestCountryKey,
  getWorldLayout,
  pickMapPopupPoint,
  RECENT_POPUP_SPAWN_MEMORY,
  stepCountryInfection,
  syncInfectionClusters,
} from '../game/countrySpread'
import { pickFluffTickerMessage } from '../game/eventContent'
import {
  applyEventEffects,
  makeCosmeticTickerLine,
  pickMainEvent,
  randomIntInclusive,
} from '../game/eventEngine'
import { isGameRunning, isRunComplete } from '../game/formulas'
import {
  builderUpgradeEffectiveCost,
  getBuilderUpgrade,
  isBuilderUpgradePurchased,
  isBuilderUpgradeUnlocked,
  nextGlobalCostMultiplier,
} from '../game/upgrades/builders'
import {
  getHolderUpgrade,
  holderUpgradeEffectiveCost,
  isHolderUpgradePurchased,
  isHolderUpgradeUnlocked,
} from '../game/upgrades/holders'
import {
  effectiveBelieversPenalties,
  believerUpgradeEffectiveCost,
  getBelieverUpgrade,
  isBelieverUpgradePurchased,
  isBelieverUpgradeUnlocked,
  nextBelieversStackState,
} from '../game/upgrades/believers'
import {
  createInitialState,
  trimTicker,
  type GameStateSnapshot,
} from '../game/initialState'
import type {
  EventBannerState,
  InfectionClustersByCountry,
  InfectionSeed,
  MainPanel,
  MapPopup,
  RecentPopupSpawn,
  SidePanel,
  TickerLine,
} from '../game/types'
import { formatNotcoin } from '../ui/format'

export type GameStore = GameStateSnapshot & {
  tick: (dtWallMs: number) => void
  /** Called by MapStage once the world layout is ready. */
  setWorldReady: (ready: boolean) => void
  dismissIntroBriefing: () => void
  openSettings: () => void
  closeSettings: () => void
  restartRun: () => void
  openMainPanel: (panel: MainPanel) => void
  closeMainPanel: () => void
  openSidePanel: (panel: SidePanel) => void
  closeSidePanel: () => void
  clickPopup: (id: string) => void
  purchaseBuilderUpgrade: (id: string) => void
  purchaseHolderUpgrade: (id: string) => void
  purchaseBelieversUpgrade: (id: string) => void
  dismissFeedback: () => void
  dismissEventBanner: () => void
}

function uiSlice(s: GameStateSnapshot) {
  return {
    settingsOpen: s.settingsOpen,
    activeMainPanel: s.activeMainPanel,
    activeSidePanel: s.activeSidePanel,
  }
}

function simGateOpen(s: GameStateSnapshot): boolean {
  if (s.introBriefingOpen) return false
  return isGameRunning(uiSlice(s), {
    eventBannerOpen: s.eventBanner !== null,
  })
}

function economyOpenDuringRun(s: GameStateSnapshot): boolean {
  if (s.introBriefingOpen) return false
  if (isRunComplete(s.sessionMapActiveMs)) return false
  if (s.eventBanner !== null) return false
  return true
}

const EVENT_SUBLINE = ''

// Performance caps to avoid runaway allocations in long sessions.
const MAX_POPUPS = 25

function spawnPopupAt(
  session: number,
  believers: number,
  holders: number,
  builders: number,
  countryInfection: Record<string, number>,
  existingPoints: { x: number; y: number }[],
  infectionClusters: InfectionClustersByCountry,
  infectionSeeds: InfectionSeed[],
  recentPopupSpawns: readonly RecentPopupSpawn[],
): { popup: MapPopup; countryKey: string } {
  const rewardNotcoin = randomIntInclusive(
    POPUP_REWARD_MIN_NC,
    POPUP_REWARD_MAX_NC,
  )
  const world = getWorldLayout()
  const anchors = collectInfectionAnchorPoints(
    world,
    infectionClusters,
    infectionSeeds,
  )
  const { x, y, countryKey } = pickMapPopupPoint(
    world,
    countryInfection,
    believers,
    holders,
    builders,
    existingPoints,
    anchors,
    recentPopupSpawns,
  )
  return {
    popup: {
      id: crypto.randomUUID(),
      x,
      y,
      rewardNotcoin,
      expiresAtSessionMs: session + POPUP_TTL_SESSION_MS,
      spawnedAtSessionMs: session,
    },
    countryKey,
  }
}

export const useGameStore = create<GameStore>((set) => ({
  ...createInitialState(),

  setWorldReady: (ready) => set(() => ({ worldReady: ready })),

  dismissIntroBriefing: () => set(() => ({ introBriefingOpen: false })),

  tick: (dtWallMs) => {
    set((s) => {
      if (s.sessionMapActiveMs >= SESSION_MS) {
        return {}
      }
      if (!simGateOpen(s)) {
        return {}
      }

      const effectiveDtMs = Math.min(dtWallMs, 250)
      const session = Math.min(
        s.sessionMapActiveMs + effectiveDtMs,
        SESSION_MS,
      )

      const notcoinBalance =
        s.notcoinBalance + s.passivePerSecond * (effectiveDtMs / 1000)

      const popups = s.popups.filter((p) => p.expiresAtSessionMs > session)

      // Performance: if the elapsed wall time is tiny, advance only the lightweight counters.
      // This reduces “micro-tick” overhead without changing long-term timing.
      if (effectiveDtMs < 30) {
        return {
          sessionMapActiveMs: session,
          notcoinBalance,
          popups,
        }
      }

      const price = s.price
      const priceMin = s.priceMin
      const priceMax = s.priceMax
      const trust = s.trust
      const believers = s.believers
      const holders = s.holders
      const builders = s.builders

      const nextMain = s.nextMainEventAtSessionMs
      let nextFluff = s.nextFluffTickerAtSessionMs
      let nextPopupAt = s.nextPopupAtSessionMs
      const recentPopupSpawns = s.recentPopupSpawns
      let recentPopupIndex = s.recentPopupIndex
      const mainEventCategoryCounts = { ...s.mainEventCategoryCounts }
      let mainEventsSeen = s.mainEventsSeen

      const prevCountryInfection = { ...s.countryInfection }
      let infectionSeeds = s.infectionSeeds
      let countryInfection = { ...s.countryInfection }
      let infectionClusters = { ...s.infectionClusters }
      const worldLayout = getWorldLayout()
      if (worldLayout?.infectionKeys.length) {
        const seeded = applyPlayerInfectionSeeds(
          infectionSeeds,
          countryInfection,
          effectiveDtMs,
        )
        infectionSeeds = seeded.seeds
        countryInfection = seeded.levels
        const step = stepCountryInfection(
          countryInfection,
          believers,
          effectiveDtMs,
          worldLayout,
        )
        countryInfection = step.levels
        infectionClusters = syncInfectionClusters(
          s.infectionClusters,
          prevCountryInfection,
          countryInfection,
          step.spreadJumps,
          worldLayout,
          session,
        )
      }

      const tickerAdds: TickerLine[] = []

      if (session >= nextMain) {
        const ev = pickMainEvent(mainEventCategoryCounts, mainEventsSeen)
        const r = applyEventEffects({
          event: ev,
          price,
          priceMin,
          priceMax,
          trust,
          believers,
          holders,
          builders,
          notcoinBalance,
          sessionMapActiveMs: session,
        })
        tickerAdds.push(r.tickerLine)
        mainEventCategoryCounts[ev.category] =
          (mainEventCategoryCounts[ev.category] ?? 0) + 1
        mainEventsSeen += 1
        const banner: EventBannerState = {
          kind: 'main',
          headline: ev.label,
          priceImpactLine: r.priceImpactLine,
          subline: EVENT_SUBLINE,
          tickerColor: r.tickerLine.color,
        }
        const tickerLines = trimTicker([...s.tickerLines, ...tickerAdds])
        return {
          sessionMapActiveMs: session,
          notcoinBalance: r.notcoinBalance,
          popups,
          price: r.price,
          priceMin: r.priceMin,
          priceMax: r.priceMax,
          trust: r.trust,
          believers: r.believers,
          holders: r.holders,
          builders: r.builders,
          nextMainEventAtSessionMs:
            session + randomIntInclusive(MAIN_EVENT_MIN_MS, MAIN_EVENT_MAX_MS),
          nextFluffTickerAtSessionMs: nextFluff,
          nextPopupAtSessionMs: nextPopupAt,
          tickerLines,
          mainEventCategoryCounts,
          mainEventsSeen,
          countryInfection,
          infectionClusters,
          infectionSeeds,
          eventBanner: banner,
        }
      }

      if (session >= nextFluff) {
        tickerAdds.push(
          makeCosmeticTickerLine(session, pickFluffTickerMessage()),
        )
        nextFluff =
          session +
          randomIntInclusive(FLUFF_TICKER_MIN_MS, FLUFF_TICKER_MAX_MS)
      }

      while (session >= nextPopupAt) {
        if (popups.length >= MAX_POPUPS) {
          // Skip spawning more until next cadence tick.
          nextPopupAt = session + randomIntInclusive(
            POPUP_SPAWN_MIN_MS,
            POPUP_SPAWN_MAX_MS,
          )
          break
        }
        const { popup, countryKey } = spawnPopupAt(
          session,
          believers,
          holders,
          builders,
          countryInfection,
          popups.map((p) => ({ x: p.x, y: p.y })),
          infectionClusters,
          infectionSeeds,
          recentPopupSpawns,
        )
        popups.push(popup)

        // Performance: fixed-size ring buffer (no array reallocation each spawn).
        if (recentPopupSpawns.length < RECENT_POPUP_SPAWN_MEMORY) {
          recentPopupSpawns.push({
            x: popup.x,
            y: popup.y,
            sessionMs: session,
            countryKey,
          })
          recentPopupIndex = recentPopupSpawns.length % RECENT_POPUP_SPAWN_MEMORY
        } else {
          recentPopupSpawns[recentPopupIndex] = {
            x: popup.x,
            y: popup.y,
            sessionMs: session,
            countryKey,
          }
          recentPopupIndex =
            (recentPopupIndex + 1) % RECENT_POPUP_SPAWN_MEMORY
        }
        nextPopupAt = session + randomIntInclusive(
          POPUP_SPAWN_MIN_MS,
          POPUP_SPAWN_MAX_MS,
        )
      }

      const tickerLines = trimTicker([...s.tickerLines, ...tickerAdds])

      return {
        sessionMapActiveMs: session,
        notcoinBalance,
        popups,
        price,
        priceMin,
        priceMax,
        trust,
        believers,
        holders,
        builders,
        nextMainEventAtSessionMs: nextMain,
        nextFluffTickerAtSessionMs: nextFluff,
        nextPopupAtSessionMs: nextPopupAt,
        recentPopupSpawns,
        recentPopupIndex,
        tickerLines,
        mainEventCategoryCounts,
        mainEventsSeen,
        countryInfection,
        infectionClusters,
        infectionSeeds,
      }
    })
  },

  openSettings: () => set(() => ({ settingsOpen: true })),

  closeSettings: () => set(() => ({ settingsOpen: false })),

  restartRun: () => set(() => createInitialState()),

  openMainPanel: (panel) => set(() => ({ activeMainPanel: panel })),

  closeMainPanel: () => set(() => ({ activeMainPanel: null })),

  openSidePanel: (panel) => set(() => ({ activeSidePanel: panel })),

  closeSidePanel: () => set(() => ({ activeSidePanel: null })),

  dismissFeedback: () => set(() => ({ feedbackLine: null })),

  dismissEventBanner: () => set(() => ({ eventBanner: null })),

  clickPopup: (id) => {
    let feedback: string | null = null
    set((s) => {
      if (isRunComplete(s.sessionMapActiveMs)) {
        return {}
      }
      if (!simGateOpen(s)) {
        return {}
      }
      const hit = s.popups.find((p) => p.id === id)
      if (!hit) return {}
      feedback = `+${formatNotcoin(hit.rewardNotcoin)} NOT (tap)`
      const worldLayout = getWorldLayout()
      const countryKey =
        worldLayout && worldLayout.infectionKeys.length > 0
          ? findNearestCountryKey(worldLayout, hit.x, hit.y)
          : ''
      const newSeed: InfectionSeed = {
        id: crypto.randomUUID(),
        x: hit.x,
        y: hit.y,
        createdAtSessionMs: s.sessionMapActiveMs,
        growthLevel: 0,
        countryKey,
      }
      const countryInfection = { ...s.countryInfection }
      if (countryKey) {
        countryInfection[countryKey] = Math.min(
          1,
          (countryInfection[countryKey] ?? 0) + PLAYER_SEED_INITIAL_COUNTRY_BUMP,
        )
      }
      return {
        popups: s.popups.filter((p) => p.id !== id),
        notcoinBalance: s.notcoinBalance + hit.rewardNotcoin,
        infectionSeeds: [...s.infectionSeeds, newSeed],
        countryInfection,
      }
    })
    if (feedback !== null) set(() => ({ feedbackLine: feedback }))
  },

  purchaseBuilderUpgrade: (id) => {
    let feedback: string | null = null
    set((s) => {
      if (!economyOpenDuringRun(s)) {
        return {}
      }
      const def = getBuilderUpgrade(id)
      if (!def) return {}
      if (isBuilderUpgradePurchased(def, s.upgradeLevels)) return {}
      if (!isBuilderUpgradeUnlocked(def, s.upgradeLevels)) return {}
      const cost = Math.ceil(
        builderUpgradeEffectiveCost(
          def,
          s.price,
          s.globalCostMultiplier,
        ),
      )
      if (s.notcoinBalance < cost) return {}
      let price = s.price * (1 - def.pricePenaltyPct)
      price = Math.max(PRICE_FLOOR, price)
      const priceMin = Math.min(s.priceMin, price)
      const priceMax = Math.max(s.priceMax, price)
      feedback = `Builder: ${def.title}`
      return {
        notcoinBalance: s.notcoinBalance - cost,
        builders: s.builders + def.buildersDelta,
        passivePerSecond: s.passivePerSecond + def.passivePerSecondDelta,
        productsLaunched:
          s.productsLaunched + (def.productsLaunchedDelta ?? 0),
        price,
        priceMin,
        priceMax,
        upgradeLevels: { ...s.upgradeLevels, [def.id]: 1 },
        globalCostMultiplier: nextGlobalCostMultiplier(s.globalCostMultiplier),
      }
    })
    if (feedback !== null) set(() => ({ feedbackLine: feedback }))
  },

  purchaseHolderUpgrade: (id) => {
    let feedback: string | null = null
    set((s) => {
      if (!economyOpenDuringRun(s)) {
        return {}
      }
      const def = getHolderUpgrade(id)
      if (!def) return {}
      if (isHolderUpgradePurchased(def, s.upgradeLevels)) return {}
      if (!isHolderUpgradeUnlocked(def, s.upgradeLevels)) return {}
      const cost = Math.ceil(
        holderUpgradeEffectiveCost(
          def,
          s.price,
          s.globalCostMultiplier,
        ),
      )
      if (s.notcoinBalance < cost) return {}
      const trust = Math.min(
        100,
        Math.max(0, s.trust + (def.trustDelta ?? 0)),
      )
      feedback = `Holders: ${def.title}`
      return {
        notcoinBalance: s.notcoinBalance - cost,
        holders: s.holders + def.holdersDelta,
        trust,
        upgradeLevels: { ...s.upgradeLevels, [def.id]: 1 },
        globalCostMultiplier: nextGlobalCostMultiplier(s.globalCostMultiplier),
      }
    })
    if (feedback !== null) set(() => ({ feedbackLine: feedback }))
  },

  purchaseBelieversUpgrade: (id) => {
    let feedback: string | null = null
    set((s) => {
      if (!economyOpenDuringRun(s)) {
        return {}
      }
      const def = getBelieverUpgrade(id)
      if (!def) return {}
      if (isBelieverUpgradePurchased(def, s.upgradeLevels)) return {}
      if (!isBelieverUpgradeUnlocked(def, s.upgradeLevels)) return {}

      const { stackIndex, nextRecentCount } = nextBelieversStackState(
        s.sessionMapActiveMs,
        s.lastBelieversUpgradeAtSessionMs,
        s.recentBelieversUpgradeCount,
      )
      const { trustPenaltyEffective } = effectiveBelieversPenalties(def, stackIndex)

      const cost = Math.ceil(
        believerUpgradeEffectiveCost(def, s.price, s.globalCostMultiplier),
      )
      if (s.notcoinBalance < cost) return {}
      const trust = Math.max(
        0,
        Math.min(100, s.trust - trustPenaltyEffective),
      )

      feedback = `Believers: ${def.title}`
      return {
        notcoinBalance: s.notcoinBalance - cost,
        believers: s.believers + def.believersDelta,
        passivePerSecond: s.passivePerSecond + def.passivePerSecondDelta,
        trust,
        upgradeLevels: { ...s.upgradeLevels, [def.id]: 1 },
        globalCostMultiplier: nextGlobalCostMultiplier(s.globalCostMultiplier),
        lastBelieversUpgradeAtSessionMs: s.sessionMapActiveMs,
        recentBelieversUpgradeCount: nextRecentCount,
      }
    })
    if (feedback !== null) set(() => ({ feedbackLine: feedback }))
  },
}))