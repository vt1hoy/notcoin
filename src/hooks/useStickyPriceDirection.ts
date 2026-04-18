import { useEffect, useRef, useState } from 'react'

export type PriceDirectionCue = 'up' | 'down' | 'flat'

const HOLD_MS = 900

/**
 * Compares successive `price` samples; shows last meaningful move for a short
 * window so one-frame event ticks remain readable.
 */
export function useStickyPriceDirection(price: number): PriceDirectionCue {
  const [cue, setCue] = useState<PriceDirectionCue>('flat')
  const prev = useRef(price)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const p0 = prev.current
    const eps = Math.max(1e-12, Math.abs(p0) * 1e-6 + 1e-10)
    const d = price - p0

    if (d > eps) {
      setCue('up')
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setCue('flat'), HOLD_MS)
    } else if (d < -eps) {
      setCue('down')
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setCue('flat'), HOLD_MS)
    }

    prev.current = price
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [price])

  return cue
}
