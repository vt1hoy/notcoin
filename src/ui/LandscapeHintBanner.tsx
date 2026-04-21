import './LandscapeHintBanner.css'

/** Small, non-blocking reminder on narrow portrait; game stays playable. */
export function LandscapeHintBanner() {
  return (
    <div
      className="landscape-hint"
      role="status"
      aria-live="polite"
      aria-label="Landscape orientation recommended for this view"
    >
      <span className="landscape-hint__pill">Landscape recommended</span>
    </div>
  )
}
