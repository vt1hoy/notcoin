import { useGameStore } from '../store/gameStore'
import './EventBanner.css'

export function EventBanner() {
  const banner = useGameStore((s) => s.eventBanner)
  const dismissEventBanner = useGameStore((s) => s.dismissEventBanner)

  if (!banner) return null

  return (
    <div
      className="event-banner-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-banner-title"
      aria-describedby="event-banner-desc"
    >
      <div className={`event-banner event-banner--${banner.tickerColor}`}>
        <div className="event-banner__rail" />
        <div className="event-banner__body">
          <p className="event-banner__eyebrow">
            {banner.kind === 'world' ? 'World briefing' : 'Internal signal'}
          </p>
          <h2 id="event-banner-title" className="event-banner__title">
            {banner.headline}
          </h2>
          <p
            className={`event-banner__impact event-banner__impact--${banner.tickerColor}`}
          >
            {banner.priceImpactLine}
          </p>
          <p id="event-banner-desc" className="event-banner__desc">
            {banner.subline}
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
