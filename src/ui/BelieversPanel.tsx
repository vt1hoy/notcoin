import { useMemo, useState } from 'react'
import {
  type BelieverBranch,
  type BelieverUpgradeDef,
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
  onSelect: () => void
}

function UpgradeCard({ def, unlocked, purchased, onSelect }: CardProps) {
  let state: 'locked' | 'purchased' | 'available' = 'available'
  if (purchased) state = 'purchased'
  else if (!unlocked) state = 'locked'

  return (
    <button
      type="button"
      className={`believer-card believer-card--${state}`}
      onClick={onSelect}
      disabled={state === 'purchased'}
    >
      <div className="believer-card__tier">{tierLabel(def)}</div>
      <div className="believer-card__title">{def.title}</div>
      <div className="believer-card__meta">
        {state === 'locked' && <span className="believer-card__badge">Locked</span>}
        {state === 'purchased' && (
          <span className="believer-card__badge believer-card__badge--ok">Purchased</span>
        )}
        {state === 'available' && (
          <span className="believer-card__badge believer-card__badge--reward">
            +{formatNotcoin(def.rewardNotcoin)} NC
          </span>
        )}
      </div>
    </button>
  )
}

export function BelieversPanelContent({ onClose }: { onClose: () => void }) {
  const sessionMapActiveMs = useGameStore((s) => s.sessionMapActiveMs)
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
    return {
      stackIndex,
      ...effectiveBelieversPenalties(selected, stackIndex),
    }
  }, [
    selected,
    sessionMapActiveMs,
    lastBelieversUpgradeAtSessionMs,
    recentBelieversUpgradeCount,
  ])

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
                return (
                  <UpgradeCard
                    key={def.id}
                    def={def}
                    unlocked={unlocked}
                    purchased={purchased}
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
          <p className="believers-detail__stacknote">
            Burst stack index for this claim: {previewPenalties.stackIndex}. Repeating
            inside the burst window increases trust loss and price pressure.
          </p>
          <dl className="believers-detail__stats">
            <div>
              <dt>Notcoin cost</dt>
              <dd>Free</dd>
            </div>
            <div>
              <dt>Reward</dt>
              <dd className="believers-detail__pct">
                +{formatNotcoin(selected.rewardNotcoin)} NC
              </dd>
            </div>
            <div>
              <dt>Believers</dt>
              <dd>+{formatIntegerCount(selected.believersDelta)}</dd>
            </div>
            <div>
              <dt>Token price</dt>
              <dd className="believers-detail__pct believers-detail__pct--down">
                −{(previewPenalties.pricePenaltyPctEffective * 100).toFixed(1)}%
              </dd>
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
                !isBelieverUpgradeUnlocked(selected, upgradeLevels)
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
                  : 'Claim upgrade'}
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
