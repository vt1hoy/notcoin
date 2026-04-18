/**
 * Builders upgrade tree loaded from JSON.
 * edit values in src/game/config/builders.json
 */
import buildersData from '../config/builders.json'
import { priceDifficulty } from '../formulas'
import { UPGRADE_GLOBAL_COST_STEP } from '../constants'

export type BuilderBranch = 'A' | 'B' | 'C'

export type BuilderUpgradeTier = 1 | 2 | 3 | 4

export type BuilderUpgradeDef = {
  id: string
  title: string
  description: string
  branch: BuilderBranch
  tier: BuilderUpgradeTier
  parentId: string | null
  baseCost: number
  buildersDelta: number
  passivePerSecondDelta: number
  productsLaunchedDelta?: number
  /** Short-term sell pressure: `price *= (1 - pricePenaltyPct)` on purchase. */
  pricePenaltyPct: number
}

export const BUILDER_UPGRADES = buildersData as BuilderUpgradeDef[]

const BY_ID: Record<string, BuilderUpgradeDef> = Object.fromEntries(
  BUILDER_UPGRADES.map((u) => [u.id, u]),
)

export function getBuilderUpgrade(id: string): BuilderUpgradeDef | undefined {
  return BY_ID[id]
}

export function builderUpgradesForBranch(
  branch: BuilderBranch,
): BuilderUpgradeDef[] {
  return BUILDER_UPGRADES.filter((u) => u.branch === branch).sort(
    (a, b) => a.tier - b.tier,
  )
}

export function isBuilderUpgradeUnlocked(
  def: BuilderUpgradeDef,
  upgradeLevels: Record<string, number>,
): boolean {
  if (def.parentId === null) return true
  return (upgradeLevels[def.parentId] ?? 0) >= 1
}

export function isBuilderUpgradePurchased(
  def: BuilderUpgradeDef,
  upgradeLevels: Record<string, number>,
): boolean {
  return (upgradeLevels[def.id] ?? 0) >= 1
}

export function builderUpgradeEffectiveCost(
  def: BuilderUpgradeDef,
  price: number,
  globalCostMultiplier: number,
): number {
  return def.baseCost * globalCostMultiplier * priceDifficulty(price)
}

export function nextGlobalCostMultiplier(current: number): number {
  return current * (1 + UPGRADE_GLOBAL_COST_STEP)
}
