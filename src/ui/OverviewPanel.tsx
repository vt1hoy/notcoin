import { GAME_START_MS } from '../game/constants'
import { buildOverviewDiagnosis } from '../game/overviewDiagnosis'
import { useGameStore } from '../store/gameStore'
import { formatInt, formatTrustPercent, formatUsd } from './format'
import { PlaceholderPanel } from './PlaceholderPanel'
import './OverviewPanel.css'

function formatLaunchDate(): string {
  const d = new Date(GAME_START_MS)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}.${mm}.${yyyy}`
}

export function OverviewPanelContent() {
  const price = useGameStore((s) => s.price)
  const trust = useGameStore((s) => s.trust)
  const believers = useGameStore((s) => s.believers)
  const holders = useGameStore((s) => s.holders)
  const builders = useGameStore((s) => s.builders)

  const diagnosis = buildOverviewDiagnosis({
    believers,
    holders,
    builders,
    trust,
    price,
  })

  return (
    <div className="overview-panel">
      <section className="overview-panel__block">
        <h3 className="overview-panel__h">Launch</h3>
        <p className="overview-panel__mono">{formatLaunchDate()}</p>
      </section>

      <section className="overview-panel__block">
        <h3 className="overview-panel__h">Snapshot</h3>
        <dl className="overview-panel__dl">
          <div>
            <dt>Notcoin price</dt>
            <dd>{formatUsd(price)}</dd>
          </div>
          <div>
            <dt>Trust</dt>
            <dd>{formatTrustPercent(trust)}</dd>
          </div>
          <div>
            <dt>Believers</dt>
            <dd>{formatInt(believers)}</dd>
          </div>
          <div>
            <dt>Holders</dt>
            <dd>{formatInt(holders)}</dd>
          </div>
          <div>
            <dt>Builders</dt>
            <dd>{formatInt(builders)}</dd>
          </div>
        </dl>
      </section>

      <section className="overview-panel__block">
        <h3 className="overview-panel__h">Diagnosis</h3>
        <p className="overview-panel__diag">{diagnosis}</p>
      </section>
    </div>
  )
}

export function OverviewPanel({ onClose }: { onClose: () => void }) {
  return (
    <PlaceholderPanel title="Overview" onClose={onClose}>
      <OverviewPanelContent />
    </PlaceholderPanel>
  )
}
