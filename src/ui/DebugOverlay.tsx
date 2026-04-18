import { useMemo, useState } from 'react'
import { SESSION_MS } from '../game/constants'
import { formatGameDate } from '../game/dates'
import { useGameStore } from '../store/gameStore'
import {
  formatIntegerCount,
  formatNotcoin,
  formatTrustPercent,
} from './format'
import './DebugOverlay.css'

const LS_KEY = 'notcoin-debug-panel-open'

function remainingMs(nextAt: number, session: number): number {
  return Math.max(0, nextAt - session)
}

export function DebugOverlay() {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(LS_KEY) === '1'
    } catch {
      return false
    }
  })

  const sessionMapActiveMs = useGameStore((s) => s.sessionMapActiveMs)
  const notcoinBalance = useGameStore((s) => s.notcoinBalance)
  const passivePerSecond = useGameStore((s) => s.passivePerSecond)
  const trust = useGameStore((s) => s.trust)
  const nextMain = useGameStore((s) => s.nextMainEventAtSessionMs)
  const nextFluff = useGameStore((s) => s.nextFluffTickerAtSessionMs)
  const nextPopup = useGameStore((s) => s.nextPopupAtSessionMs)
  const popupsCount = useGameStore((s) => s.popups.length)

  const gameDate = useMemo(
    () => formatGameDate(sessionMapActiveMs),
    [sessionMapActiveMs],
  )

  const rows = useMemo(
    () => [
      ['sessionMapActiveMs', String(Math.round(sessionMapActiveMs))],
      ['game date', gameDate],
      ['notcoinBalance', formatNotcoin(notcoinBalance)],
      ['passivePerSecond', `${formatNotcoin(passivePerSecond)}/s`],
      ['trust', formatTrustPercent(trust)],
      [
        'next main event (remain ms)',
        String(Math.round(remainingMs(nextMain, sessionMapActiveMs))),
      ],
      [
        'next fluff ticker (remain ms)',
        String(Math.round(remainingMs(nextFluff, sessionMapActiveMs))),
      ],
      [
        'next popup (remain ms)',
        String(Math.round(remainingMs(nextPopup, sessionMapActiveMs))),
      ],
      ['session cap (ms)', String(SESSION_MS)],
      ['popups', formatIntegerCount(popupsCount)],
    ],
    [
      sessionMapActiveMs,
      gameDate,
      notcoinBalance,
      passivePerSecond,
      trust,
      nextMain,
      nextFluff,
      nextPopup,
      popupsCount,
    ],
  )

  if (!import.meta.env.DEV) return null

  return (
    <div className="debug-overlay">
      <button
        type="button"
        className="debug-overlay__toggle"
        aria-expanded={open}
        aria-controls="notcoin-debug-panel"
        onClick={() => {
          setOpen((v) => {
            const next = !v
            try {
              localStorage.setItem(LS_KEY, next ? '1' : '0')
            } catch {
              /* ignore */
            }
            return next
          })
        }}
      >
        Debug
      </button>
      {open ? (
        <div
          id="notcoin-debug-panel"
          className="debug-overlay__panel"
          role="region"
          aria-label="Playtest debug"
        >
          <table className="debug-overlay__table">
            <tbody>
              {rows.map(([k, v]) => (
                <tr key={k}>
                  <th scope="row">{k}</th>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
