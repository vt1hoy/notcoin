import { useGameLoop } from '../hooks/useGameLoop'
import { isRunComplete } from '../game/formulas'
import { useGameStore } from '../store/gameStore'
import { BottomStatsBar } from './BottomStatsBar'
import { MapStage } from './MapStage'
import { FinalReportModal } from './FinalReportModal'
import { IntroBriefingModal } from './IntroBriefingModal'
import { FrensPanel } from './FrensPanel'
import { WorldPanel } from './WorldPanel'
import { SettingsModal } from './SettingsModal'
import { TopBar } from './TopBar'
import { DebugOverlay } from './DebugOverlay'
import { EventBanner } from './EventBanner'
import { PlayerFeedback } from './PlayerFeedback'
import './MainScreen.css'

export function MainScreen() {
  useGameLoop()

  const sessionMapActiveMs = useGameStore((s) => s.sessionMapActiveMs)
  const introBriefingOpen = useGameStore((s) => s.introBriefingOpen)
  const activeMainPanel = useGameStore((s) => s.activeMainPanel)
  const activeSidePanel = useGameStore((s) => s.activeSidePanel)
  const closeMainPanel = useGameStore((s) => s.closeMainPanel)
  const closeSidePanel = useGameStore((s) => s.closeSidePanel)
  const openMainPanel = useGameStore((s) => s.openMainPanel)
  const openSidePanel = useGameStore((s) => s.openSidePanel)

  return (
    <div className="main-screen">
      <TopBar />
      <EventBanner />

      <div className="main-screen__map-wrap">
        <MapStage />

        {activeMainPanel === 'frens' && (
          <FrensPanel onClose={closeMainPanel} />
        )}

        {activeSidePanel === 'world' && (
          <WorldPanel onClose={closeSidePanel} />
        )}
      </div>

      <div className="main-screen__footer">
        <nav className="tab-rail tab-rail--left" aria-label="Frens">
          <button
            type="button"
            className="tab-button tab-button--primary"
            onClick={() => openMainPanel('frens')}
          >
            Frens
          </button>
        </nav>

        <div className="main-screen__footer-center">
          <BottomStatsBar />
        </div>

        <nav className="tab-rail tab-rail--right" aria-label="World map">
          <button
            type="button"
            className="tab-button tab-button--primary"
            onClick={() => openSidePanel('world')}
          >
            World
          </button>
        </nav>
      </div>

      <SettingsModal />
      <PlayerFeedback />
      <DebugOverlay />
      {introBriefingOpen ? <IntroBriefingModal /> : null}
      {isRunComplete(sessionMapActiveMs) ? <FinalReportModal /> : null}
    </div>
  )
}
