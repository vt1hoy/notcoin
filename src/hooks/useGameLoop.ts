import { useEffect, useRef } from 'react'
import { SIM_INTERVAL_MS } from '../game/constants'
import { useGameStore } from '../store/gameStore'

export function useGameLoop(): void {
  const tick = useGameStore((s) => s.tick)
  const lastRef = useRef(0)

  useEffect(() => {
    lastRef.current = performance.now()
    const id = window.setInterval(() => {
      const now = performance.now()
      const dtWallMs = now - lastRef.current
      lastRef.current = now
      tick(dtWallMs)
    }, SIM_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [tick])
}
