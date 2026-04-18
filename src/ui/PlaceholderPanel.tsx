import type { ReactNode } from 'react'
import './PlaceholderPanel.css'

type Props = {
  title: string
  onClose: () => void
  children?: ReactNode
}

export function PlaceholderPanel({ title, onClose, children }: Props) {
  return (
    <div className="panel-overlay" role="dialog" aria-modal="true">
      <button
        type="button"
        className="panel-overlay__backdrop"
        aria-label="Close panel"
        onClick={onClose}
      />
      <div className="panel-overlay__sheet">
        <div className="panel-overlay__head">
          <h2 className="panel-overlay__title">{title}</h2>
          <button
            type="button"
            className="panel-overlay__close"
            onClick={onClose}
            aria-label={`Close ${title}`}
          >
            ×
          </button>
        </div>
        <div className="panel-overlay__body">
          {children ?? (
            <p className="panel-overlay__muted">
              Placeholder panel — gameplay upgrades will plug in here.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
