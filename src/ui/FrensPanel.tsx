import { useState } from 'react'
import type { MainPanel } from '../game/types'
import { BelieversPanelContent } from './BelieversPanel'
import { BuildersPanelContent } from './BuildersPanel'
import { HoldersPanelContent } from './HoldersPanel'
import { OverviewPanelContent } from './OverviewPanel'
import { PlaceholderPanel } from './PlaceholderPanel'
import './FrensPanel.css'

type FrensTab = Exclude<MainPanel, 'frens'>

const TABS: { id: FrensTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'believers', label: 'Believers' },
  { id: 'holders', label: 'Holders' },
  { id: 'builders', label: 'Builders' },
]

type Props = {
  onClose: () => void
}

export function FrensPanel({ onClose }: Props) {
  const [tab, setTab] = useState<FrensTab>('overview')

  return (
    <PlaceholderPanel title="Frens" onClose={onClose}>
      <div className="frens-panel">
        <div
          className="frens-panel__tabs"
          role="tablist"
          aria-label="Frens sections"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`frens-panel__tab${tab === t.id ? ' is-selected' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div
          className="frens-panel__content"
          role="tabpanel"
          aria-label={TABS.find((x) => x.id === tab)?.label}
        >
          {tab === 'overview' ? <OverviewPanelContent /> : null}
          {tab === 'believers' ? (
            <BelieversPanelContent onClose={onClose} />
          ) : null}
          {tab === 'holders' ? <HoldersPanelContent onClose={onClose} /> : null}
          {tab === 'builders' ? (
            <BuildersPanelContent onClose={onClose} />
          ) : null}
        </div>
      </div>
    </PlaceholderPanel>
  )
}
