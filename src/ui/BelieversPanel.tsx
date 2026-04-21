import { useMemo, useState } from 'react'
import {
  type BelieverBranch,
  type BelieverUpgradeDef,
  believerUpgradeEffectiveCost,
  believerUpgradesForBranch,
  effectiveBelieversPenalties,
  getBelieverUpgrade,
  isBelieverUpgradePurchased,
  isBelieverUpgradeUnlocked,
  nextBelieversStackState,
} from '../game/upgrades/believers'
import { useGameStore } from '../store/gameStore'
import { formatIntegerCount, formatNotcoin } from './format'
import { PlaceholderPanel } from './PlaceholderPanel'
import './BelieversPanel.css'

const BRANCHES: BelieverBranch[] = ['A', 'B', 'C']

function branchLabel(b: BelieverBranch): string {
  return `Branch ${b}`
}

function tierLabel(def: BelieverUpgradeDef): string {
  return `${def.branch}${def.tier}`
}

type CardProps = {
  def: BelieverUpgradeDef
  unlocked: boolean
  purchased: boolean
  selected: boolean
  cost: number
  canAfford: boolean
  onUpgrade: () => void
  onSelect: () => void
}

function UpgradeCard({
  def,
  unlocked,
  purchased,
  selected,
  cost,
  canAfford,
  onUpgrade,
  onSelect,
}: CardProps) {
  let state: 'locked' | 'purchased' | 'available' = 'available'
  if (purchased) state = 'purchased'
  else if (!unlocked) state = 'locked'

  return (
    <div
      className={`believer-card believer-card--${state}${selected ? ' is-selected' : ''}`}
      role="group"
      aria-label={`${def.title} upgrade`}
    >
      <button
        type="button"
        className="believer-card__hit"
        onClick={onSelect}
        aria-label={`Open details for ${def.title}`}
      >
        <div className="believer-card__tier">{tierLabel(def)}</div>
        <div className="believer-card__title">{def.title}</div>
        <div className="believer-card__meta">
          {state === 'locked' && <span className="believer-card__badge">Locked</span>}
          {state === 'purchased' && (
            <span className="believer-card__badge believer-card__badge--ok">
              Purchased
            </span>
          )}
          {state === 'available' && (
            <>
              <span className="believer-card__badge believer-card__badge--cost">
                {formatNotcoin(cost)} NOT
              </span>
              <span className="believer-card__badge believer-card__badge--passive">
                +{formatNotcoin(def.passivePerSecondDelta)} NOT/s
              </span>
              <span className="believer-card__badge believer-card__badge--penalty">
                −{def.trustPenalty.toFixed(2)}%
              </span>
            </>
          )}
        </div>
      </button>

      <div className="believer-card__actions">
        <button
          type="button"
          className="believer-card__upgrade"
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

export function BelieversPanelContent({ onClose }: { onClose: () => void }) {
  const sessionMapActiveMs = useGameStore((s) => s.sessionMapActiveMs)
  const price = useGameStore((s) => s.price)
  const globalCostMultiplier = useGameStore((s) => s.globalCostMultiplier)
  const notcoinBalance = useGameStore((s) => s.notcoinBalance)
  const lastBelieversUpgradeAtSessionMs = useGameStore(
    (s) => s.lastBelieversUpgradeAtSessionMs,
  )
  const recentBelieversUpgradeCount = useGameStore(
    (s) => s.recentBelieversUpgradeCount,
  )
  const upgradeLevels = useGameStore((s) => s.upgradeLevels)
  const purchaseBelieversUpgrade = useGameStore((s) => s.purchaseBelieversUpgrade)

  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected = useMemo(() => {
    if (!selectedId) return null
    return getBelieverUpgrade(selectedId) ?? null
  }, [selectedId])

  const previewPenalties = useMemo(() => {
    if (!selected) return null
    const { stackIndex } = nextBelieversStackState(
      sessionMapActiveMs,
      lastBelieversUpgradeAtSessionMs,
      recentBelieversUpgradeCount,
    )
    return effectiveBelieversPenalties(selected, stackIndex)
  }, [
    selected,
    sessionMapActiveMs,
    lastBelieversUpgradeAtSessionMs,
    recentBelieversUpgradeCount,
  ])

  const selectedCost = useMemo(() => {
    if (!selected) return 0
    return Math.ceil(
      believerUpgradeEffectiveCost(selected, price, globalCostMultiplier),
    )
  }, [selected, price, globalCostMultiplier])

  const canAffordSelected = selected ? notcoinBalance >= selectedCost : false

  return (
    <div className="believers-panel">
      <div className="believers-panel__grid">
        {BRANCHES.map((branch) => (
          <div key={branch} className="believers-panel__column">
            <h3 className="believers-panel__branch">{branchLabel(branch)}</h3>
            <div className="believers-panel__stack">
              {believerUpgradesForBranch(branch).map((def) => {
                const unlocked = isBelieverUpgradeUnlocked(def, upgradeLevels)
                const purchased = isBelieverUpgradePurchased(def, upgradeLevels)
                const cost = Math.ceil(
                  believerUpgradeEffectiveCost(def, price, globalCostMultiplier),
                )
                const canAfford = notcoinBalance >= cost
                return (
                  <UpgradeCard
                    key={def.id}
                    def={def}
                    unlocked={unlocked}
                    purchased={purchased}
                    selected={selectedId === def.id}
                    cost={cost}
                    canAfford={canAfford}
                    onUpgrade={() => purchaseBelieversUpgrade(def.id)}
                    onSelect={() => setSelectedId(def.id)}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {selected && previewPenalties && (
        <div className="believers-detail">
          <div className="believers-detail__head">
            <div>
              <div className="believers-detail__kicker">{tierLabel(selected)}</div>
              <h4 className="believers-detail__title">{selected.title}</h4>
            </div>
            <button
              type="button"
              className="believers-detail__dismiss"
              aria-label="Close detail"
              onClick={() => setSelectedId(null)}
            >
              ×
            </button>
          </div>
          <p className="believers-detail__desc">{selected.description}</p>
          <dl className="believers-detail__stats">
            <div>
              <dt>NOT cost</dt>
              <dd>{formatNotcoin(selectedCost)} NOT</dd>
            </div>
            <div>
              <dt>Passive</dt>
              <dd className="believers-detail__pct">
                +{formatNotcoin(selected.passivePerSecondDelta)} NOT/s
              </dd>
            </div>
            <div>
              <dt>Believers</dt>
              <dd>+{formatIntegerCount(selected.believersDelta)}</dd>
            </div>
            <div>
              <dt>Trust</dt>
              <dd className="believers-detail__pct believers-detail__pct--down">
                −{previewPenalties.trustPenaltyEffective.toFixed(2)}%
              </dd>
            </div>
          </dl>
          <div className="believers-detail__actions">
            <button
              type="button"
              className="believers-detail__upgrade"
              disabled={
                isBelieverUpgradePurchased(selected, upgradeLevels) ||
                !isBelieverUpgradeUnlocked(selected, upgradeLevels) ||
                !canAffordSelected
              }
              onClick={() => {
                purchaseBelieversUpgrade(selected.id)
                setSelectedId(null)
              }}
            >
              {isBelieverUpgradePurchased(selected, upgradeLevels)
                ? 'Purchased'
                : !isBelieverUpgradeUnlocked(selected, upgradeLevels)
                  ? 'Locked'
                  : !canAffordSelected
                    ? 'Not enough NOT'
                    : 'Upgrade'}
            </button>
            <button type="button" className="believers-detail__ghost" onClick={onClose}>
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

export function BelieversPanel({ onClose }: Props) {
  return (
    <PlaceholderPanel title="Believers" onClose={onClose}>
      <BelieversPanelContent onClose={onClose} />
    </PlaceholderPanel>
  )
}
