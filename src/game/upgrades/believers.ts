/**
 * Believers upgrade tree loaded from JSON.
 * edit values in src/game/config/believers.json
 */
import believersData from '../config/believers.json'
import {
  BELIEVERS_MAX_PRICE_PENALTY_HIT,
  BELIEVERS_STACK_INDEX_CAP,
  BELIEVERS_STACK_PRICE_FACTOR,
  BELIEVERS_STACK_TRUST_FACTOR,
  BELIEVERS_STACK_WINDOW_MS,
} from '../constants'

export type BelieverBranch = 'A' | 'B' | 'C'

export type BelieverUpgradeTier = 1 | 2 | 3 | 4

export type BelieverUpgradeDef = {
  id: string
  title: string
  description: string
  branch: BelieverBranch
  tier: BelieverUpgradeTier
  parentId: string | null
  rewardNotcoin: number
  believersDelta: number
  /** Fractional price drop: `price *= (1 - pricePenaltyPctEffective)`. */
  pricePenaltyPct: number
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
): { pricePenaltyPctEffective: number; trustPenaltyEffective: number } {
  const idx = Math.min(BELIEVERS_STACK_INDEX_CAP, stackIndex)
  const trustPenaltyEffective =
    def.trustPenalty * (1 + BELIEVERS_STACK_TRUST_FACTOR * idx)
  const rawPricePenalty =
    def.pricePenaltyPct * (1 + BELIEVERS_STACK_PRICE_FACTOR * idx)
  const pricePenaltyPctEffective = Math.min(
    BELIEVERS_MAX_PRICE_PENALTY_HIT,
    rawPricePenalty,
  )
  return { pricePenaltyPctEffective, trustPenaltyEffective }
}
