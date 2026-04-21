import { useGameStore } from '../store/gameStore'
import './IntroBriefingModal.css'

export function IntroBriefingModal() {
  const dismissIntroBriefing = useGameStore((s) => s.dismissIntroBriefing)

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
            Notcoin launched on <strong>16.05.2024</strong>.
          </p>

          <p>
            It started simple.
            <br />
            It did not stay that way.
          </p>

          <p>Notcoin is what you push it to become.</p>

          <p>
            You have a few minutes.
            <br />
            Make it something.
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
