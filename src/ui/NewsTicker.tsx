import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { TickerLine } from '../game/types'
import { useGameStore } from '../store/gameStore'
import './NewsTicker.css'

/** Visible hold per ticker line — align ~with fluff cadence on 5-minute runs. */
const HOLD_MS = 22_000
const FADE_MS = 500
const GAP_MS_MIN = 3_000
const GAP_MS_MAX = 5_000
const SCROLL_PX_PER_SEC = 18

const PLACEHOLDER: TickerLine = {
  id: 'placeholder',
  label: 'Wire quiet — ambient chatter loading…',
  color: 'gray',
  atSessionMs: 0,
  cosmetic: true,
}

function gapMs(): number {
  return GAP_MS_MIN + Math.floor(Math.random() * (GAP_MS_MAX - GAP_MS_MIN + 1))
}

function nextIndex(i: number, len: number): number {
  if (len <= 1) return 0
  return (i - 1 + len) % len
}

export function NewsTicker() {
  const lines = useGameStore((s) => s.tickerLines)
  const linesRef = useRef(lines)
  linesRef.current = lines

  const [displayIndex, setDisplayIndex] = useState(0)
  const [opaque, setOpaque] = useState(true)
  const viewportRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [scrollShiftPx, setScrollShiftPx] = useState(0)
  const [scrollDurationSec, setScrollDurationSec] = useState(0)

  const line: TickerLine =
    lines.length === 0 ? PLACEHOLDER : lines[displayIndex] ?? lines[lines.length - 1]!

  const cosmetic = line.cosmetic === true

  useLayoutEffect(() => {
    if (!opaque) {
      setScrollShiftPx(0)
      setScrollDurationSec(0)
      return
    }
    const vp = viewportRef.current
    const tx = textRef.current
    if (!vp || !tx) return
    const overflow = Math.max(0, tx.scrollWidth - vp.clientWidth)
    if (overflow <= 0) {
      setScrollShiftPx(0)
      setScrollDurationSec(0)
      return
    }
    setScrollShiftPx(overflow)
    setScrollDurationSec(Math.max(45, overflow / SCROLL_PX_PER_SEC))
  }, [line.id, line.label, opaque])

  useEffect(() => {
    if (lines.length === 0) {
      setDisplayIndex(0)
      return
    }
    setDisplayIndex((i) => Math.min(Math.max(0, i), lines.length - 1))
  }, [lines.length])

  useEffect(() => {
    let alive = true
    const tidRef = { current: null as ReturnType<typeof setTimeout> | null }

    const clearT = () => {
      if (tidRef.current !== null) {
        window.clearTimeout(tidRef.current)
        tidRef.current = null
      }
    }

    const arm = (fn: () => void, ms: number) => {
      clearT()
      tidRef.current = window.setTimeout(() => {
        tidRef.current = null
        if (alive) fn()
      }, ms)
    }

    const cycle = () => {
      if (!alive) return
      const L = linesRef.current
      if (L.length === 0) {
        setOpaque(true)
        arm(cycle, 400)
        return
      }

      setOpaque(true)
      arm(() => {
        if (!alive) return
        setOpaque(false)
        arm(() => {
          if (!alive) return
          setDisplayIndex((prev) => {
            const len = linesRef.current.length
            if (len <= 1) return 0
            return nextIndex(
              Math.min(Math.max(0, prev), len - 1),
              len,
            )
          })
          arm(() => {
            if (!alive) return
            setOpaque(true)
            arm(cycle, FADE_MS + HOLD_MS)
          }, gapMs())
        }, FADE_MS)
      }, FADE_MS + HOLD_MS)
    }

    if (linesRef.current.length > 0) {
      setDisplayIndex(linesRef.current.length - 1)
    }
    cycle()

    return () => {
      alive = false
      clearT()
    }
  }, [])

  const panStyle: CSSProperties | undefined =
    scrollShiftPx > 0 && opaque
      ? ({
          '--ticker-pan-shift': `-${scrollShiftPx}px`,
          '--ticker-pan-duration': `${scrollDurationSec}s`,
        } as CSSProperties)
      : undefined

  return (
    <div className="news-ticker" role="status" aria-live="polite">
      <div
        ref={viewportRef}
        className={`news-ticker__viewport${
          opaque ? ' news-ticker__viewport--opaque' : ' news-ticker__viewport--fade'
        }`}
      >
        <span
          ref={textRef}
          className={`news-ticker__text news-ticker__text--${line.color}${
            cosmetic ? ' news-ticker__text--cosmetic' : ''
          }${scrollShiftPx > 0 && opaque ? ' news-ticker__text--pan' : ''}`}
          style={panStyle}
        >
          {line.label}
        </span>
      </div>
    </div>
  )
}
