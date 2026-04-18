import { GAME_START_MS } from '../game/constants'
import { useGameStore } from '../store/gameStore'
import './IntroBriefingModal.css'

function formatListingDateUtc(ms: number): string {
  const d = new Date(ms)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}.${mm}.${yyyy}`
}

export function IntroBriefingModal() {
  const dismissIntroBriefing = useGameStore((s) => s.dismissIntroBriefing)
  const listing = formatListingDateUtc(GAME_START_MS)

  return (
    <div
      className="intro-briefing"
      role="dialog"
      aria-modal="true"
      aria-labelledby="intro-briefing-title"
    >
      <div className="intro-briefing__backdrop" aria-hidden />
      <div className="intro-briefing__panel">
        <p className="intro-briefing__kicker">Initial briefing</p>
        <h2 id="intro-briefing-title" className="intro-briefing__title">
          Before the map moves
        </h2>
        <div className="intro-briefing__body">
          <p>
            Hello, fren. Notcoin went live on <strong>{listing}</strong>—one
            line on a long calendar, but a door for many stories after it.
          </p>
          <p>
            To some players it stays a tap-and-smile curiosity. To others it is
            noise. To a few, it might grow into something heavier than the joke
            suggests.
          </p>
          <p className="intro-briefing__last">
            The next minutes are yours to push: attention, depth, trust, and
            price will answer how loud this chapter gets.
          </p>
        </div>
        <button
          type="button"
          className="intro-briefing__start"
          onClick={() => dismissIntroBriefing()}
        >
          Begin run
        </button>
      </div>
    </div>
  )
}
