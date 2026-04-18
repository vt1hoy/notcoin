import { useMemo } from 'react'
import {
  buildOverviewDiagnosis,
  buildRunConclusionFromDiagnosis,
} from '../game/overviewDiagnosis'
import { marketCapUsd } from '../game/marketCap'
import {
  BUILDER_UPGRADES,
  isBuilderUpgradePurchased,
} from '../game/upgrades/builders'
import { useGameStore } from '../store/gameStore'
import {
  formatCompactUsd,
  formatInt,
  formatTrustPercent,
  formatUsd,
} from './format'
import './FinalReportModal.css'

export function FinalReportModal() {
  const priceMax = useGameStore((s) => s.priceMax)
  const priceMin = useGameStore((s) => s.priceMin)
  const price = useGameStore((s) => s.price)
  const trust = useGameStore((s) => s.trust)
  const believers = useGameStore((s) => s.believers)
  const holders = useGameStore((s) => s.holders)
  const builders = useGameStore((s) => s.builders)
  const productsLaunched = useGameStore((s) => s.productsLaunched)
  const upgradeLevels = useGameStore((s) => s.upgradeLevels)
  const restartRun = useGameStore((s) => s.restartRun)

  const cap = marketCapUsd(price)

  const diagnosis = useMemo(
    () =>
      buildOverviewDiagnosis({
        believers,
        holders,
        builders,
        trust,
        price,
      }),
    [believers, holders, builders, trust, price],
  )

  const closingNarrative = useMemo(
    () => buildRunConclusionFromDiagnosis(diagnosis),
    [diagnosis],
  )

  const purchasedBuilders = useMemo(
    () =>
      BUILDER_UPGRADES.filter((def) =>
        isBuilderUpgradePurchased(def, upgradeLevels),
      ),
    [upgradeLevels],
  )

  return (
    <div
      className="final-report"
      role="dialog"
      aria-modal="true"
      aria-labelledby="final-report-title"
    >
      <div className="final-report__backdrop" />
      <div className="final-report__panel">
        <p className="final-report__kicker">Run conclusion</p>
        <h2 id="final-report-title" className="final-report__title">
          Run complete
        </h2>
        <p className="final-report__sub">Five minutes, one arc—final ledger</p>

        <section className="final-report__section" aria-label="Closing narrative">
          <h3 className="final-report__h">Closing read</h3>
          <p className="final-report__narrative">{closingNarrative}</p>
        </section>

        <section className="final-report__section" aria-label="Core metrics">
          <h3 className="final-report__h">Core metrics</h3>
          <dl className="final-report__grid">
            <div>
              <dt>Final Notcoin price</dt>
              <dd>{formatUsd(price)}</dd>
            </div>
            <div>
              <dt>Market cap</dt>
              <dd>{formatCompactUsd(cap)}</dd>
            </div>
            <div>
              <dt>Trust level</dt>
              <dd>{formatTrustPercent(trust)}</dd>
            </div>
            <div>
              <dt>Max price (run)</dt>
              <dd>{formatUsd(priceMax)}</dd>
            </div>
            <div>
              <dt>Min price (run)</dt>
              <dd>{formatUsd(priceMin)}</dd>
            </div>
          </dl>
        </section>

        <section className="final-report__section" aria-label="Builders upgrades">
          <h3 className="final-report__h">Builders upgrades</h3>
          {purchasedBuilders.length === 0 ? (
            <p className="final-report__empty">
              You did not purchase any Builder upgrades this run.
            </p>
          ) : (
            <ul className="final-report__list">
              {purchasedBuilders.map((def) => (
                <li key={def.id}>{def.title}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="final-report__section" aria-label="Population">
          <h3 className="final-report__h">Population</h3>
          <dl className="final-report__grid">
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
              <dt>Products launched</dt>
              <dd>{formatInt(productsLaunched)}</dd>
            </div>
          </dl>
        </section>

        <button
          type="button"
          className="final-report__restart"
          onClick={() => restartRun()}
        >
          Run again
        </button>
      </div>
    </div>
  )
}
