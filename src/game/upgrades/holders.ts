/**
 * Holders upgrade tree loaded from JSON.
 * edit values in src/game/config/holders.json
 */
import holdersData from '../config/holders.json'
import { priceDifficulty } from '../formulas'

export type HolderBranch = 'A' | 'B' | 'C'

export type HolderUpgradeTier = 1 | 2 | 3 | 4

export type HolderUpgradeDef = {
  id: string
  title: string
  description: string
  branch: HolderBranch
  tier: HolderUpgradeTier
  parentId: string | null
  baseCost: number
  holdersDelta: number
  /** Trust points added (0–100 scale). */
  trustDelta?: number
}

export const HOLDER_UPGRADES = holdersData as HolderUpgradeDef[]

const BY_ID: Record<string, HolderUpgradeDef> = Object.fromEntries(
  HOLDER_UPGRADES.map((u) => [u.id, u]),
)

export function getHolderUpgrade(id: string): HolderUpgradeDef | undefined {
  return BY_ID[id]
}

export function holderUpgradesForBranch(
  branch: HolderBranch,
): HolderUpgradeDef[] {
  return HOLDER_UPGRADES.filter((u) => u.branch === branch).sort(
    (a, b) => a.tier - b.tier,
  )
}

export function isHolderUpgradeUnlocked(
  def: HolderUpgradeDef,
  upgradeLevels: Record<string, number>,
): boolean {
  if (def.parentId === null) return true
  return (upgradeLevels[def.parentId] ?? 0) >= 1
}

export function isHolderUpgradePurchased(
  def: HolderUpgradeDef,
  upgradeLevels: Record<string, number>,
): boolean {
  return (upgradeLevels[def.id] ?? 0) >= 1
}

export function holderUpgradeEffectiveCost(
  def: HolderUpgradeDef,
  price: number,
  globalCostMultiplier: number,
): number {
  return def.baseCost * globalCostMultiplier * priceDifficulty(price)
}
