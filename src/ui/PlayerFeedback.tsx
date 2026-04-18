import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import './PlayerFeedback.css'

const DISPLAY_MS = 1200

export function PlayerFeedback() {
  const line = useGameStore((s) => s.feedbackLine)
  const dismissFeedback = useGameStore((s) => s.dismissFeedback)

  useEffect(() => {
    if (!line) return
    const t = window.setTimeout(() => dismissFeedback(), DISPLAY_MS)
    return () => window.clearTimeout(t)
  }, [line, dismissFeedback])

  if (!line) return null

  return (
    <div className="player-feedback" role="status" aria-live="polite">
      {line}
    </div>
  )
}
