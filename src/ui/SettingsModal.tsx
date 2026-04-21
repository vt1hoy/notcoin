import { useGameStore } from '../store/gameStore'
import './SettingsModal.css'

type Props = {
  musicEnabled: boolean
  onMusicEnabledChange: (enabled: boolean) => void
}

export function SettingsModal({ musicEnabled, onMusicEnabledChange }: Props) {
  const open = useGameStore((s) => s.settingsOpen)
  const closeSettings = useGameStore((s) => s.closeSettings)
  const restartRun = useGameStore((s) => s.restartRun)

  if (!open) return null

  return (
    <div
      className="settings-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div className="settings-modal__backdrop" onClick={() => closeSettings()} />
      <div className="settings-modal__panel">
        <div className="settings-modal__head">
          <h2 className="settings-modal__title">Settings</h2>
          <button
            type="button"
            className="settings-modal__close"
            onClick={() => closeSettings()}
            aria-label="Close settings"
          >
            ×
          </button>
        </div>
        <div className="settings-modal__body">
          <label className="settings-row">
            <span>Music</span>
            <input
              type="checkbox"
              checked={musicEnabled}
              onChange={(e) => onMusicEnabledChange(e.target.checked)}
            />
          </label>
          <button
            type="button"
            className="danger-button"
            onClick={() => {
              restartRun()
              closeSettings()
            }}
          >
            Restart run
          </button>
        </div>
      </div>
    </div>
  )
}
