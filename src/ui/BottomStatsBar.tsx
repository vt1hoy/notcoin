import { useStickyPriceDirection } from '../hooks/useStickyPriceDirection'
import { useGameStore } from '../store/gameStore'
import { formatInt, formatTrustPercent, formatUsd } from './format'
import './BottomStatsBar.css'

export function BottomStatsBar({
  onOpenFrens,
  onOpenWorld,
}: {
  onOpenFrens: () => void
  onOpenWorld: () => void
}) {
  const price = useGameStore((s) => s.price)
  const trust = useGameStore((s) => s.trust)
  const believers = useGameStore((s) => s.believers)
  const holders = useGameStore((s) => s.holders)
  const builders = useGameStore((s) => s.builders)
  const priceDir = useStickyPriceDirection(price)

  return (
    <div className="bottom-stats" role="group" aria-label="Key stats">
      <div className="bottom-stats__primary" aria-label="Primary metrics">
        <div className="bottom-stats__item bottom-stats__item--primary">
          <span className="bottom-stats__k">Spot (USD)</span>
          <span className="bottom-stats__v bottom-stats__v--primary bottom-stats__v--withCue">
            <span className="bottom-stats__usd">{formatUsd(price)}</span>
            {priceDir !== 'flat' ? (
              <span
                className={`bottom-stats__dir bottom-stats__dir--${priceDir}`}
                title={priceDir === 'up' ? 'Price moved up' : 'Price moved down'}
                aria-hidden
              >
                {priceDir === 'up' ? '▲' : '▼'}
              </span>
            ) : null}
          </span>
        </div>

        <div className="bottom-stats__item bottom-stats__item--primary">
          <span className="bottom-stats__k">Trust</span>
          <span className="bottom-stats__v bottom-stats__v--primary bottom-stats__v--trust">
            {formatTrustPercent(trust)}
          </span>
        </div>
      </div>

      <div className="bottom-stats__sep" aria-hidden />

      <div className="bottom-stats__secondary" aria-label="Secondary metrics">
        <div className="bottom-stats__item bottom-stats__item--secondary">
          <span className="bottom-stats__k">Believers</span>
          <span className="bottom-stats__v bottom-stats__v--secondary">
            {formatInt(believers)}
          </span>
        </div>
        <div className="bottom-stats__item bottom-stats__item--secondary">
          <span className="bottom-stats__k">Holders</span>
          <span className="bottom-stats__v bottom-stats__v--secondary">
            {formatInt(holders)}
          </span>
        </div>
        <div className="bottom-stats__item bottom-stats__item--secondary">
          <span className="bottom-stats__k">Builders</span>
          <span className="bottom-stats__v bottom-stats__v--secondary">
            {formatInt(builders)}
          </span>
        </div>
      </div>

      <div className="bottom-stats__sep" aria-hidden />

      <div className="bottom-stats__actions" aria-label="Actions">
        <button
          type="button"
          className="bottom-stats__btn"
          onClick={onOpenFrens}
        >
          Frens
        </button>
        <button
          type="button"
          className="bottom-stats__btn"
          onClick={onOpenWorld}
        >
          World
        </button>
      </div>
    </div>
  )
}
