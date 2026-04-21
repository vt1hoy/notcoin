import { useState } from 'react'
import { useGameLoop } from '../hooks/useGameLoop'
import { isRunComplete } from '../game/formulas'
import { useGameStore } from '../store/gameStore'
import { SESSION_MS } from '../game/constants'
import { formatGameDate } from '../game/dates'
import { BottomStatsBar } from './BottomStatsBar'
import { MapStage } from './MapStage'
import { FinalReportModal } from './FinalReportModal'
import { IntroBriefingModal } from './IntroBriefingModal'
import { FrensPanel } from './FrensPanel'
import { WorldPanel } from './WorldPanel'
import { AudioPlayer } from './AudioPlayer'
import { SettingsModal } from './SettingsModal'
import { EventBanner } from './EventBanner'
import { PlayerFeedback } from './PlayerFeedback'
import { formatNotcoin } from './format'
import './MainScreen.css'

function formatTimeLeft(msLeft: number): string {
  const s = Math.max(0, Math.floor(msLeft / 1000))
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss} left`
}

export function MainScreen() {
  useGameLoop()

  const [musicEnabled, setMusicEnabled] = useState(false)

  const sessionMapActiveMs = useGameStore((s) => s.sessionMapActiveMs)
  const notcoinBalance = useGameStore((s) => s.notcoinBalance)
  const passivePerSecond = useGameStore((s) => s.passivePerSecond)
  const introBriefingOpen = useGameStore((s) => s.introBriefingOpen)
  const activeMainPanel = useGameStore((s) => s.activeMainPanel)
  const activeSidePanel = useGameStore((s) => s.activeSidePanel)
  const closeMainPanel = useGameStore((s) => s.closeMainPanel)
  const closeSidePanel = useGameStore((s) => s.closeSidePanel)
  const openMainPanel = useGameStore((s) => s.openMainPanel)
  const openSidePanel = useGameStore((s) => s.openSidePanel)
  const openSettings = useGameStore((s) => s.openSettings)

  const timeLeftLabel = formatTimeLeft(SESSION_MS - sessionMapActiveMs)
  const dateLabel = formatGameDate(sessionMapActiveMs)

  return (
    <div className="main-screen">
      <AudioPlayer enabled={musicEnabled} />
      <EventBanner />

      <div className="main-screen__map-wrap">
        <MapStage />

        <div className="main-screen__hud-right" aria-label="Session HUD">
          <div className="hud-card">
            <div className="hud-card__top">
              <div className="hud-balance" title="NOT balance (wallet)">
                <div className="hud-balance__k">Balance</div>
                <div className="hud-balance__v">
                  {formatNotcoin(notcoinBalance)}
                  <span className="hud-balance__unit"> NOT</span>
                </div>
                <div className="hud-balance__meta">
                  <span title="Passive NOT per second">
                    +{formatNotcoin(passivePerSecond)} NOT/s
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="hud-icon-button"
                aria-label="Settings"
                onClick={() => openSettings()}
              >
                ⚙
              </button>
            </div>

            <div className="hud-card__row" title="In-game date">
              <span className="hud-card__k">Date</span>
              <span className="hud-card__v">{dateLabel}</span>
            </div>
            <div className="hud-card__row" title="Run time remaining">
              <span className="hud-card__k">Time</span>
              <span className="hud-card__v">{timeLeftLabel}</span>
            </div>
          </div>
        </div>

        <div className="main-screen__stats-bottom" aria-label="Key stats">
          <BottomStatsBar
            onOpenFrens={() => openMainPanel('frens')}
            onOpenWorld={() => openSidePanel('world')}
          />
        </div>

        {activeMainPanel === 'frens' && (
          <FrensPanel onClose={closeMainPanel} />
        )}

        {activeSidePanel === 'world' && (
          <WorldPanel onClose={closeSidePanel} />
        )}
      </div>

      <SettingsModal
        musicEnabled={musicEnabled}
        onMusicEnabledChange={setMusicEnabled}
      />
      <PlayerFeedback />
      {introBriefingOpen ? <IntroBriefingModal /> : null}
      {isRunComplete(sessionMapActiveMs) ? <FinalReportModal /> : null}
    </div>
  )
}
