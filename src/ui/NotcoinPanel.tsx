import { useGameStore } from '../store/gameStore'
import {
  formatInt,
  formatNotcoin,
  formatTrustPercent,
  formatUsd,
} from './format'
import { PlaceholderPanel } from './PlaceholderPanel'
import './NotcoinPanel.css'

export function NotcoinPanel({ onClose }: { onClose: () => void }) {
  const price = useGameStore((s) => s.price)
  const believers = useGameStore((s) => s.believers)
  const holders = useGameStore((s) => s.holders)
  const builders = useGameStore((s) => s.builders)
  const passivePerSecond = useGameStore((s) => s.passivePerSecond)
  const trust = useGameStore((s) => s.trust)
  const productsLaunched = useGameStore((s) => s.productsLaunched)

  return (
    <PlaceholderPanel title="Notcoin" onClose={onClose}>
      <dl className="notcoin-panel">
        <div>
          <dt>Current price</dt>
          <dd>{formatUsd(price)}</dd>
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
        <div>
          <dt>Passive / second</dt>
          <dd>{formatNotcoin(passivePerSecond)} NC</dd>
        </div>
        <div>
          <dt>Trust</dt>
          <dd>{formatTrustPercent(trust)}</dd>
        </div>
        <div>
          <dt>Products launched</dt>
          <dd>{formatInt(productsLaunched)}</dd>
        </div>
      </dl>
    </PlaceholderPanel>
  )
}
