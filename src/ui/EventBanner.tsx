import { useGameStore } from '../store/gameStore'
import './EventBanner.css'

function extractPctLabel(s: string): string {
  const m = s.match(/([+-]?\d+(?:\.\d+)?)%/)
  if (!m) return s
  const v = m[1]!
  return `${v}%`
}

export function EventBanner() {
  const banner = useGameStore((s) => s.eventBanner)
  const dismissEventBanner = useGameStore((s) => s.dismissEventBanner)

  if (!banner) return null

  const pct = extractPctLabel(banner.priceImpactLine)

  return (
    <div
      className="event-banner-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-banner-title"
      aria-describedby="event-banner-text"
    >
      <div className={`event-banner event-banner--${banner.tickerColor}`}>
        <div className="event-banner__rail" />
        <div className="event-banner__body">
          <p className="event-banner__eyebrow">MARKET EVENT</p>
          <h2 id="event-banner-title" className="event-banner__title">
            MARKET EVENT
          </h2>
          <div
            className={`event-banner__pct event-banner__pct--${banner.tickerColor}`}
            aria-label={`Price change ${pct}`}
          >
            {pct}
          </div>
          <p id="event-banner-text" className="event-banner__desc">
            {banner.headline}
          </p>
          <button
            type="button"
            className="event-banner__cta"
            onClick={() => dismissEventBanner()}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
