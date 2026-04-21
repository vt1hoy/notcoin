import { useMemo, useState } from 'react'
import {
  type HolderBranch,
  type HolderUpgradeDef,
  getHolderUpgrade,
  holderUpgradeEffectiveCost,
  holderUpgradesForBranch,
  isHolderUpgradePurchased,
  isHolderUpgradeUnlocked,
} from '../game/upgrades/holders'
import { useGameStore } from '../store/gameStore'
import {
  formatIntegerCount,
  formatNotcoin,
  formatTrustPercent,
} from './format'
import { PlaceholderPanel } from './PlaceholderPanel'
import './HoldersPanel.css'

const BRANCHES: HolderBranch[] = ['A', 'B', 'C']

function branchLabel(b: HolderBranch): string {
  return `Branch ${b}`
}

function tierLabel(def: HolderUpgradeDef): string {
  return `${def.branch}${def.tier}`
}

type CardProps = {
  def: HolderUpgradeDef
  unlocked: boolean
  purchased: boolean
  cost: number
  selected: boolean
  canAfford: boolean
  onUpgrade: () => void
  onSelect: () => void
}

function UpgradeCard({
  def,
  unlocked,
  purchased,
  cost,
  selected,
  canAfford,
  onUpgrade,
  onSelect,
}: CardProps) {
  let state: 'locked' | 'purchased' | 'available' = 'available'
  if (purchased) state = 'purchased'
  else if (!unlocked) state = 'locked'

  return (
    <div
      className={`holder-card holder-card--${state}${selected ? ' is-selected' : ''}`}
      role="group"
      aria-label={`${def.title} upgrade`}
    >
      <button
        type="button"
        className="holder-card__hit"
        onClick={onSelect}
        aria-label={`Open details for ${def.title}`}
      >
        <div className="holder-card__tier">{tierLabel(def)}</div>
        <div className="holder-card__title">{def.title}</div>
        <div className="holder-card__meta">
          {state === 'locked' && <span className="holder-card__badge">Locked</span>}
          {state === 'purchased' && (
            <span className="holder-card__badge holder-card__badge--ok">
              Purchased
            </span>
          )}
          {state === 'available' && (
            <>
              <span className="holder-card__badge holder-card__badge--cost">
                {formatNotcoin(cost)} NOT
              </span>
              <span className="holder-card__badge holder-card__badge--trust">
                +{(def.trustDelta ?? 0).toFixed(2)}%
              </span>
            </>
          )}
        </div>
      </button>

      <div className="holder-card__actions">
        <button
          type="button"
          className="holder-card__upgrade"
          disabled={state !== 'available' || !canAfford}
          onClick={(e) => {
            e.stopPropagation()
            onUpgrade()
          }}
        >
          {state === 'purchased'
            ? 'Purchased'
            : state === 'locked'
              ? 'Locked'
              : !canAfford
                ? 'Not enough NOT'
                : 'Upgrade'}
        </button>
      </div>
    </div>
  )
}

export function HoldersPanelContent({ onClose }: { onClose: () => void }) {
  const trust = useGameStore((s) => s.trust)
  const price = useGameStore((s) => s.price)
  const globalCostMultiplier = useGameStore((s) => s.globalCostMultiplier)
  const notcoinBalance = useGameStore((s) => s.notcoinBalance)
  const upgradeLevels = useGameStore((s) => s.upgradeLevels)
  const purchaseHolderUpgrade = useGameStore((s) => s.purchaseHolderUpgrade)

  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected = useMemo(() => {
    if (!selectedId) return null
    return getHolderUpgrade(selectedId) ?? null
  }, [selectedId])

  const selectedCost = useMemo(() => {
    if (!selected) return 0
    return Math.ceil(
      holderUpgradeEffectiveCost(selected, price, globalCostMultiplier),
    )
  }, [selected, price, globalCostMultiplier])

  const canAffordSelected =
    selected &&
    !isHolderUpgradePurchased(selected, upgradeLevels) &&
    notcoinBalance >= selectedCost

  return (
    <div className="holders-panel">
      <div className="holders-panel__trust-strip" aria-label="Current trust">
        <span className="holders-panel__trust-strip-label">Trust</span>
        <span className="holders-panel__trust-strip-value">
          {formatTrustPercent(trust)}
        </span>
      </div>
      <div className="holders-panel__grid">
        {BRANCHES.map((branch) => (
          <div key={branch} className="holders-panel__column">
            <h3 className="holders-panel__branch">{branchLabel(branch)}</h3>
            <div className="holders-panel__stack">
              {holderUpgradesForBranch(branch).map((def) => {
                const unlocked = isHolderUpgradeUnlocked(def, upgradeLevels)
                const purchased = isHolderUpgradePurchased(def, upgradeLevels)
                const cost = Math.ceil(
                  holderUpgradeEffectiveCost(
                    def,
                    price,
                    globalCostMultiplier,
                  ),
                )
                const canAfford = notcoinBalance >= cost
                return (
                  <UpgradeCard
                    key={def.id}
                    def={def}
                    unlocked={unlocked}
                    purchased={purchased}
                    cost={cost}
                    selected={selectedId === def.id}
                    canAfford={canAfford}
                    onUpgrade={() => purchaseHolderUpgrade(def.id)}
                    onSelect={() => setSelectedId(def.id)}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="holders-detail">
          <div className="holders-detail__head">
            <div>
              <div className="holders-detail__kicker">{tierLabel(selected)}</div>
              <h4 className="holders-detail__title">{selected.title}</h4>
            </div>
            <button
              type="button"
              className="holders-detail__dismiss"
              aria-label="Close detail"
              onClick={() => setSelectedId(null)}
            >
              ×
            </button>
          </div>
          <p className="holders-detail__desc">{selected.description}</p>
          <dl className="holders-detail__stats">
            <div>
              <dt>Cost</dt>
              <dd>{formatNotcoin(selectedCost)} NOT</dd>
            </div>
            <div>
              <dt>Holders</dt>
              <dd>+{formatIntegerCount(selected.holdersDelta)}</dd>
            </div>
            <div>
              <dt>Trust</dt>
              <dd className="holders-detail__pct">
                {selected.trustDelta != null && selected.trustDelta > 0
                  ? `+${selected.trustDelta.toFixed(2)}%`
                  : '—'}
              </dd>
            </div>
          </dl>
          <div className="holders-detail__actions">
            <button
              type="button"
              className="holders-detail__upgrade"
              disabled={
                isHolderUpgradePurchased(selected, upgradeLevels) ||
                !isHolderUpgradeUnlocked(selected, upgradeLevels) ||
                !canAffordSelected
              }
              onClick={() => {
                purchaseHolderUpgrade(selected.id)
                setSelectedId(null)
              }}
            >
              {isHolderUpgradePurchased(selected, upgradeLevels)
                ? 'Purchased'
                : !isHolderUpgradeUnlocked(selected, upgradeLevels)
                  ? 'Locked'
                  : !canAffordSelected
                    ? 'Not enough NOT'
                    : 'Upgrade'}
            </button>
            <button type="button" className="holders-detail__ghost" onClick={onClose}>
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

export function HoldersPanel({ onClose }: Props) {
  return (
    <PlaceholderPanel title="Holders" onClose={onClose}>
      <HoldersPanelContent onClose={onClose} />
    </PlaceholderPanel>
  )
}
