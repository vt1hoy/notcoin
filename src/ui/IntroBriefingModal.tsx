import { useEffect, useMemo, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import './IntroBriefingModal.css'

export function IntroBriefingModal() {
  const dismissIntroBriefing = useGameStore((s) => s.dismissIntroBriefing)
  const worldReady = useGameStore((s) => s.worldReady)

  const [stageMs, setStageMs] = useState(0)

  useEffect(() => {
    if (worldReady) {
      setStageMs(0)
      return
    }
    const start = performance.now()
    const id = window.setInterval(() => {
      setStageMs(performance.now() - start)
    }, 250)
    return () => window.clearInterval(id)
  }, [worldReady])

  const loadingLabel = useMemo(() => {
    if (worldReady) return null
    if (stageMs < 3500) return 'Loading world map...'
    if (stageMs < 7500) return 'Preparing simulation...'
    return 'Finalizing simulation...'
  }, [stageMs, worldReady])

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
        {!worldReady ? (
          <div
            className="intro-briefing__loading"
            role="status"
            aria-live="polite"
            aria-label="Preparing simulation"
          >
            <div className="intro-briefing__spinner" aria-hidden="true" />
            <div className="intro-briefing__loading-text">{loadingLabel}</div>
          </div>
        ) : null}
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
          disabled={!worldReady}
        >
          {!worldReady ? 'Loading…' : 'Begin run'}
        </button>
      </div>
    </div>
  )
}
