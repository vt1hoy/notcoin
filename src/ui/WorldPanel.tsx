import { marketCapUsd } from '../game/marketCap'
import { useGameStore } from '../store/gameStore'
import { formatCompactUsd, formatInt, formatTrustPercent } from './format'
import { PlaceholderPanel } from './PlaceholderPanel'
import { WorldPieChart } from './WorldPieChart'
import './WorldPanel.css'

export function WorldPanel({ onClose }: { onClose: () => void }) {
  const believers = useGameStore((s) => s.believers)
  const holders = useGameStore((s) => s.holders)
  const builders = useGameStore((s) => s.builders)
  const price = useGameStore((s) => s.price)
  const trust = useGameStore((s) => s.trust)

  const cap = marketCapUsd(price)
  const total = believers + holders + builders

  return (
    <PlaceholderPanel title="World" onClose={onClose}>
      <div className="world-panel">
        <div className="world-panel__row">
          <WorldPieChart believers={believers} holders={holders} builders={builders} />
          <div className="world-panel__legend">
            <div className="world-panel__lg">
              <span className="world-panel__swatch world-panel__swatch--b" /> Believers{' '}
              <span className="world-panel__pct">
                {total > 0 ? `${Math.round((believers / total) * 100)}%` : '—'}
              </span>
            </div>
            <div className="world-panel__lg">
              <span className="world-panel__swatch world-panel__swatch--h" /> Holders{' '}
              <span className="world-panel__pct">
                {total > 0 ? `${Math.round((holders / total) * 100)}%` : '—'}
              </span>
            </div>
            <div className="world-panel__lg">
              <span className="world-panel__swatch world-panel__swatch--r" /> Builders{' '}
              <span className="world-panel__pct">
                {total > 0 ? `${Math.round((builders / total) * 100)}%` : '—'}
              </span>
            </div>
          </div>
        </div>

        <dl className="world-panel__stats">
          <div>
            <dt>Market cap</dt>
            <dd>{formatCompactUsd(cap)}</dd>
          </div>
          <div>
            <dt>Trust</dt>
            <dd>{formatTrustPercent(trust)}</dd>
          </div>
          <div>
            <dt>Believers</dt>
            <dd>{formatInt(believers)}</dd>
          </div>
          <div>
            <dt>Holders</dt>
            <dd>{formatInt(holders)}</dd>
          </div>
          <div>
            <dt>Builders</dt>
            <dd>{formatInt(builders)}</dd>
          </div>
        </dl>
      </div>
    </PlaceholderPanel>
  )
}
