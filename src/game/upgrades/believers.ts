/**
 * Believers upgrade tree loaded from JSON.
 * edit values in src/game/config/believers.json
 */
import believersData from '../config/believers.json'
import {
  BELIEVERS_STACK_INDEX_CAP,
  BELIEVERS_STACK_TRUST_FACTOR,
  BELIEVERS_STACK_WINDOW_MS,
} from '../constants'
import { priceDifficulty } from '../formulas'

export type BelieverBranch = 'A' | 'B' | 'C'

export type BelieverUpgradeTier = 1 | 2 | 3 | 4

export type BelieverUpgradeDef = {
  id: string
  title: string
  description: string
  branch: BelieverBranch
  tier: BelieverUpgradeTier
  parentId: string | null
  baseCost: number
  believersDelta: number
  passivePerSecondDelta: number
  /** Trust points removed (before stacking). */
  trustPenalty: number
}

export const BELIEVER_UPGRADES = believersData as BelieverUpgradeDef[]

const BY_ID: Record<string, BelieverUpgradeDef> = Object.fromEntries(
  BELIEVER_UPGRADES.map((u) => [u.id, u]),
)

export function getBelieverUpgrade(id: string): BelieverUpgradeDef | undefined {
  return BY_ID[id]
}

export function believerUpgradesForBranch(
  branch: BelieverBranch,
): BelieverUpgradeDef[] {
  return BELIEVER_UPGRADES.filter((u) => u.branch === branch).sort(
    (a, b) => a.tier - b.tier,
  )
}

export function isBelieverUpgradeUnlocked(
  def: BelieverUpgradeDef,
  upgradeLevels: Record<string, number>,
): boolean {
  if (def.parentId === null) return true
  return (upgradeLevels[def.parentId] ?? 0) >= 1
}

export function isBelieverUpgradePurchased(
  def: BelieverUpgradeDef,
  upgradeLevels: Record<string, number>,
): boolean {
  return (upgradeLevels[def.id] ?? 0) >= 1
}

export function believerUpgradeEffectiveCost(
  def: BelieverUpgradeDef,
  price: number,
  globalCostMultiplier: number,
): number {
  return def.baseCost * globalCostMultiplier * priceDifficulty(price)
}

export function nextBelieversStackState(
  sessionMapActiveMs: number,
  lastBelieversUpgradeAtSessionMs: number | null,
  recentBelieversUpgradeCount: number,
): { stackIndex: number; nextRecentCount: number } {
  let count = recentBelieversUpgradeCount
  if (
    lastBelieversUpgradeAtSessionMs === null ||
    sessionMapActiveMs - lastBelieversUpgradeAtSessionMs >
      BELIEVERS_STACK_WINDOW_MS
  ) {
    count = 0
  }
  const stackIndex = Math.min(BELIEVERS_STACK_INDEX_CAP, count)
  return { stackIndex, nextRecentCount: count + 1 }
}

export function effectiveBelieversPenalties(
  def: BelieverUpgradeDef,
  stackIndex: number,
): { trustPenaltyEffective: number } {
  const idx = Math.min(BELIEVERS_STACK_INDEX_CAP, stackIndex)
  const trustPenaltyEffective =
    def.trustPenalty * (1 + BELIEVERS_STACK_TRUST_FACTOR * idx)
  return { trustPenaltyEffective }
}
