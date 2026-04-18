import { useMemo, useState } from 'react'
import {
  type BuilderBranch,
  type BuilderUpgradeDef,
  builderUpgradeEffectiveCost,
  builderUpgradesForBranch,
  getBuilderUpgrade,
  isBuilderUpgradePurchased,
  isBuilderUpgradeUnlocked,
} from '../game/upgrades/builders'
import { useGameStore } from '../store/gameStore'
import { formatIntegerCount, formatNotcoin } from './format'
import { PlaceholderPanel } from './PlaceholderPanel'
import './BuildersPanel.css'

const BRANCHES: BuilderBranch[] = ['A', 'B', 'C']

function branchLabel(b: BuilderBranch): string {
  return `Branch ${b}`
}

function tierLabel(def: BuilderUpgradeDef): string {
  return `${def.branch}${def.tier}`
}

type CardProps = {
  def: BuilderUpgradeDef
  unlocked: boolean
  purchased: boolean
  cost: number
  onSelect: () => void
}

function UpgradeCard({ def, unlocked, purchased, cost, onSelect }: CardProps) {
  let state: 'locked' | 'purchased' | 'available' = 'available'
  if (purchased) state = 'purchased'
  else if (!unlocked) state = 'locked'

  return (
    <button
      type="button"
      className={`builder-card builder-card--${state}`}
      onClick={onSelect}
      disabled={state === 'purchased'}
    >
      <div className="builder-card__tier">{tierLabel(def)}</div>
      <div className="builder-card__title">{def.title}</div>
      <div className="builder-card__meta">
        {state === 'locked' && <span className="builder-card__badge">Locked</span>}
        {state === 'purchased' && (
          <span className="builder-card__badge builder-card__badge--ok">Purchased</span>
        )}
        {state === 'available' && (
          <span className="builder-card__badge builder-card__badge--cost">
            {formatNotcoin(cost)} NC
          </span>
        )}
      </div>
    </button>
  )
}

export function BuildersPanelContent({ onClose }: { onClose: () => void }) {
  const price = useGameStore((s) => s.price)
  const globalCostMultiplier = useGameStore((s) => s.globalCostMultiplier)
  const notcoinBalance = useGameStore((s) => s.notcoinBalance)
  const upgradeLevels = useGameStore((s) => s.upgradeLevels)
  const purchaseBuilderUpgrade = useGameStore((s) => s.purchaseBuilderUpgrade)

  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected = useMemo(() => {
    if (!selectedId) return null
    return getBuilderUpgrade(selectedId) ?? null
  }, [selectedId])

  const selectedCost = useMemo(() => {
    if (!selected) return 0
    return Math.ceil(
      builderUpgradeEffectiveCost(selected, price, globalCostMultiplier),
    )
  }, [selected, price, globalCostMultiplier])

  const canAffordSelected =
    selected &&
    !isBuilderUpgradePurchased(selected, upgradeLevels) &&
    notcoinBalance >= selectedCost

  return (
    <div className="builders-panel">
      <div className="builders-panel__grid">
        {BRANCHES.map((branch) => (
          <div key={branch} className="builders-panel__column">
            <h3 className="builders-panel__branch">{branchLabel(branch)}</h3>
            <div className="builders-panel__stack">
              {builderUpgradesForBranch(branch).map((def) => {
                const unlocked = isBuilderUpgradeUnlocked(def, upgradeLevels)
                const purchased = isBuilderUpgradePurchased(def, upgradeLevels)
                const cost = Math.ceil(
                  builderUpgradeEffectiveCost(
                    def,
                    price,
                    globalCostMultiplier,
                  ),
                )
                return (
                  <UpgradeCard
                    key={def.id}
                    def={def}
                    unlocked={unlocked}
                    purchased={purchased}
                    cost={cost}
                    onSelect={() => setSelectedId(def.id)}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="builders-detail">
          <div className="builders-detail__head">
            <div>
              <div className="builders-detail__kicker">{tierLabel(selected)}</div>
              <h4 className="builders-detail__title">{selected.title}</h4>
            </div>
            <button
              type="button"
              className="builders-detail__dismiss"
              aria-label="Close detail"
              onClick={() => setSelectedId(null)}
            >
              ×
            </button>
          </div>
          <p className="builders-detail__desc">{selected.description}</p>
          <dl className="builders-detail__stats">
            <div>
              <dt>Cost</dt>
              <dd>{formatNotcoin(selectedCost)} Notcoin</dd>
            </div>
            <div>
              <dt>Builders</dt>
              <dd>+{formatIntegerCount(selected.buildersDelta)}</dd>
            </div>
            <div>
              <dt>Passive</dt>
              <dd>+{formatNotcoin(selected.passivePerSecondDelta)}/s</dd>
            </div>
            <div>
              <dt>Token price</dt>
              <dd className="builders-detail__pct builders-detail__pct--down">
                −{(selected.pricePenaltyPct * 100).toFixed(1)}%
              </dd>
            </div>
            {selected.productsLaunchedDelta ? (
              <div>
                <dt>Products</dt>
                <dd>+{selected.productsLaunchedDelta}</dd>
              </div>
            ) : null}
          </dl>
          <div className="builders-detail__actions">
            <button
              type="button"
              className="builders-detail__upgrade"
              disabled={
                isBuilderUpgradePurchased(selected, upgradeLevels) ||
                !isBuilderUpgradeUnlocked(selected, upgradeLevels) ||
                !canAffordSelected
              }
              onClick={() => {
                purchaseBuilderUpgrade(selected.id)
                setSelectedId(null)
              }}
            >
              {isBuilderUpgradePurchased(selected, upgradeLevels)
                ? 'Purchased'
                : !isBuilderUpgradeUnlocked(selected, upgradeLevels)
                  ? 'Locked'
                  : !canAffordSelected
                    ? 'Not enough Notcoin'
                    : 'Upgrade'}
            </button>
            <button type="button" className="builders-detail__ghost" onClick={onClose}>
              Close panel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

type Props = {
  onClose: () => void
}

export function BuildersPanel({ onClose }: Props) {
  return (
    <PlaceholderPanel title="Builders" onClose={onClose}>
      <BuildersPanelContent onClose={onClose} />
    </PlaceholderPanel>
  )
}
