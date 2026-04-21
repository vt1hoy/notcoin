import { useMemo } from 'react'
import { formatGameDate } from '../game/dates'
import { useGameStore } from '../store/gameStore'
import { formatNotcoin } from './format'
import './TopBar.css'

export function TopBar() {
  const sessionMapActiveMs = useGameStore((s) => s.sessionMapActiveMs)
  const notcoinBalance = useGameStore((s) => s.notcoinBalance)
  const passivePerSecond = useGameStore((s) => s.passivePerSecond)
  const trust = useGameStore((s) => s.trust)

  const gameDateLabel = useMemo(
    () => formatGameDate(sessionMapActiveMs),
    [sessionMapActiveMs],
  )
  const openSettings = useGameStore((s) => s.openSettings)

  const trustShort = useMemo(() => Math.round(trust), [trust])

  return (
    <header className="top-bar">
      <button
        type="button"
        className="icon-button"
        aria-label="Settings"
        onClick={() => openSettings()}
      >
        ⚙
      </button>
      <div className="top-bar__hud" aria-label="Wallet and pace">
        <div className="top-bar__wallet" title="NOT balance (wallet)">
          <span className="top-bar__wallet-k">Balance</span>
          <span className="top-bar__wallet-v">
            {formatNotcoin(notcoinBalance)}
            <span className="top-bar__wallet-unit"> NOT</span>
          </span>
        </div>
        <div className="top-bar__meta">
          <span className="top-bar__meta-item" title="Passive NOT per second">
            +{formatNotcoin(passivePerSecond)} NOT/s
          </span>
          <span className="top-bar__meta-sep" aria-hidden>
            ·
          </span>
          <span className="top-bar__meta-item" title="Trust (0–100)">
            T{trustShort}
          </span>
        </div>
      </div>
      <div className="top-bar__date" title="In-game date">
        {gameDateLabel}
      </div>
    </header>
  )
}
