import { useStickyPriceDirection } from '../hooks/useStickyPriceDirection'
import { useGameStore } from '../store/gameStore'
import { formatInt, formatUsd } from './format'
import './BottomStatsBar.css'

export function BottomStatsBar() {
  const price = useGameStore((s) => s.price)
  const believers = useGameStore((s) => s.believers)
  const holders = useGameStore((s) => s.holders)
  const builders = useGameStore((s) => s.builders)
  const priceDir = useStickyPriceDirection(price)

  return (
    <div className="bottom-stats" role="group" aria-label="Key stats">
      <div className="bottom-stats__item">
        <span className="bottom-stats__k">Spot (USD)</span>
        <span className="bottom-stats__v bottom-stats__v--withCue">
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
      <div className="bottom-stats__item">
        <span className="bottom-stats__k">Believers</span>
        <span className="bottom-stats__v">{formatInt(believers)}</span>
      </div>
      <div className="bottom-stats__item">
        <span className="bottom-stats__k">Holders</span>
        <span className="bottom-stats__v">{formatInt(holders)}</span>
      </div>
      <div className="bottom-stats__item">
        <span className="bottom-stats__k">Builders</span>
        <span className="bottom-stats__v">{formatInt(builders)}</span>
      </div>
    </div>
  )
}
