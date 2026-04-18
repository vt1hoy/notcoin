import { useGameStore } from '../store/gameStore'
import './SettingsModal.css'

export function SettingsModal() {
  const open = useGameStore((s) => s.settingsOpen)
  const musicEnabled = useGameStore((s) => s.musicEnabled)
  const closeSettings = useGameStore((s) => s.closeSettings)
  const toggleMusic = useGameStore((s) => s.toggleMusic)
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
              onChange={() => toggleMusic()}
            />
          </label>
          <p className="settings-hint">
            Audio playback is not wired in this MVP; this toggle is stored for
            later.
          </p>
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
