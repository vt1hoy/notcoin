import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { MAP_VIEWBOX } from '../game/constants'
import {
  completeWorldLayoutFromCentroids,
  getWorldLayout,
  mapDisplayStrength,
  parseSvgViewBox,
  parseWorldSvgPaths,
  registerWorldPaths,
  type WorldPathDef,
} from '../game/countrySpread'
import { useGameStore } from '../store/gameStore'
import './MapStage.css'

function pathDomId(renderId: string): string {
  return `wm-${renderId}`
}

type ClusterDraw = {
  clusterId: string
  countryKey: string
  x: number
  y: number
  disp: number
  dots: { dx: number; dy: number }[]
}

export function MapStage() {
  const svgRef = useRef<SVGSVGElement>(null)
  const [svgText, setSvgText] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [viewBox, setViewBox] = useState<{ width: number; height: number }>(
    MAP_VIEWBOX,
  )
  const [layoutGen, setLayoutGen] = useState(0)
  const [hoverKey, setHoverKey] = useState<string | null>(null)

  const popups = useGameStore((s) => s.popups)
  const clickPopup = useGameStore((s) => s.clickPopup)
  const countryInfection = useGameStore((s) => s.countryInfection)
  const infectionClusters = useGameStore((s) => s.infectionClusters)
  const infectionSeeds = useGameStore((s) => s.infectionSeeds)
  const believers = useGameStore((s) => s.believers)
  const holders = useGameStore((s) => s.holders)
  const builders = useGameStore((s) => s.builders)

  const [tapFlash, setTapFlash] = useState<{ x: number; y: number } | null>(
    null,
  )

  useEffect(() => {
    if (!tapFlash) return
    const t = window.setTimeout(() => setTapFlash(null), 260)
    return () => window.clearTimeout(t)
  }, [tapFlash])

  useEffect(() => {
    let cancelled = false
    fetch('/maps/world.svg')
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.text()
      })
      .then((text) => {
        if (cancelled) return
        setSvgText(text)
        setViewBox(parseSvgViewBox(text))
        setLoadError(null)
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load world map')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const paths: WorldPathDef[] = useMemo(() => {
    if (!svgText) return []
    return parseWorldSvgPaths(svgText)
  }, [svgText])

  useEffect(() => {
    registerWorldPaths(paths)
  }, [paths])

  useLayoutEffect(() => {
    if (!paths.length || !svgRef.current) return

    const measure = () => {
      const root = svgRef.current
      if (!root) return
      const centroids: Record<string, { x: number; y: number }> = {}
      for (const p of paths) {
        const el = root.querySelector(
          `#${CSS.escape(pathDomId(p.renderId))}`,
        ) as SVGPathElement | null
        if (!el) continue
        try {
          const bb = el.getBBox()
          centroids[p.renderId] = {
            x: bb.x + bb.width / 2,
            y: bb.y + bb.height / 2,
          }
        } catch {
          /* ignore */
        }
      }
      completeWorldLayoutFromCentroids(centroids)
      setLayoutGen((g) => g + 1)
    }

    measure()
    const raf = requestAnimationFrame(measure)
    return () => cancelAnimationFrame(raf)
  }, [paths])

  const spreadVisuals = useMemo(() => {
    void layoutGen
    const layout = getWorldLayout()
    if (!layout) {
      return {
        tints: [] as WorldPathDef[],
        clusters: [] as ClusterDraw[],
      }
    }

    const tints = paths
    const clusters: ClusterDraw[] = []

    for (const [countryKey, list] of Object.entries(infectionClusters)) {
      const c = layout.centroidsByKey[countryKey]
      if (!c || !list?.length) continue
      const lvl = countryInfection[countryKey] ?? 0
      const disp = mapDisplayStrength(lvl, believers, holders, builders)
      for (const cl of list) {
        clusters.push({
          clusterId: cl.id,
          countryKey,
          x: c.x + cl.ox,
          y: c.y + cl.oy,
          disp,
          dots: cl.dots,
        })
      }
    }

    return { tints, clusters }
  }, [
    paths,
    layoutGen,
    countryInfection,
    infectionClusters,
    believers,
    holders,
    builders,
  ])

  if (loadError) {
    return (
      <div className="map-stage map-stage--error" role="img" aria-label="Map">
        <p className="map-stage__err">{loadError}</p>
      </div>
    )
  }

  if (!svgText || !paths.length) {
    return (
      <div className="map-stage map-stage--loading" aria-busy="true">
        <span className="map-stage__loading">Loading map…</span>
      </div>
    )
  }

  return (
    <div className="map-stage" aria-label="World map">
      <svg
        ref={svgRef}
        className="map-stage__svg"
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Infection map"
      >
        <defs>
          <radialGradient id="map-infection-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff6b6b" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#ff3333" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#ff0000" stopOpacity="0" />
          </radialGradient>
          <filter
            id="map-infection-glow"
            x="-80%"
            y="-80%"
            width="260%"
            height="260%"
          >
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id="map-popup-coin-clip" clipPathUnits="userSpaceOnUse">
            <circle cx={0} cy={0} r={41} />
          </clipPath>
          <radialGradient
            id="map-popup-ambient-glow"
            cx={0}
            cy={0}
            r={53}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#fff2b8" stopOpacity="0.38" />
            <stop offset="42%" stopColor="#f0c040" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#c88a10" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g id="countries">
          {paths.map((p) => (
            <path
              key={p.renderId}
              id={pathDomId(p.renderId)}
              d={p.d}
              className={`map-country${
                hoverKey === p.infectionKey ? ' map-country--hover' : ''
              }`}
              data-infection-key={p.infectionKey}
              onPointerEnter={() => setHoverKey(p.infectionKey)}
              onPointerLeave={() =>
                setHoverKey((k) => (k === p.infectionKey ? null : k))
              }
            />
          ))}
        </g>

        <g id="spread-layer" pointerEvents="none">
          {spreadVisuals.tints.map((p) => {
            const lvl = countryInfection[p.infectionKey] ?? 0
            const disp = mapDisplayStrength(
              lvl,
              believers,
              holders,
              builders,
            )
            if (disp < 0.028) return null
            return (
              <use
                key={`tint-${p.renderId}`}
                href={`#${pathDomId(p.renderId)}`}
                className="map-infection-tint"
                style={{ opacity: Math.min(0.28, disp * 0.32) }}
              />
            )
          })}
          {spreadVisuals.clusters.map((cl) => (
            <g
              key={cl.clusterId}
              className="map-infection-cluster"
              transform={`translate(${cl.x} ${cl.y})`}
            >
              <circle
                className="map-infection-glow map-infection-glow--a"
                r={10 + cl.disp * 14}
                fill="url(#map-infection-core)"
                style={{ opacity: 0.14 + cl.disp * 0.26 }}
              />
              <circle
                className="map-infection-glow map-infection-glow--b"
                r={7 + cl.disp * 10}
                fill="#ff4444"
                filter="url(#map-infection-glow)"
                style={{ opacity: 0.12 + cl.disp * 0.18 }}
              />
              {cl.dots.map((o, i) => (
                <circle
                  key={`${cl.clusterId}-d-${i}`}
                  className="map-infection-dot"
                  cx={o.dx}
                  cy={o.dy}
                  r={1.15}
                />
              ))}
            </g>
          ))}
        </g>

        <g id="seed-layer" pointerEvents="none">
          {infectionSeeds.map((seed) => {
            const r = 2.2 + seed.growthLevel * 11
            const op = 0.45 + seed.growthLevel * 0.42
            return (
              <g
                key={seed.id}
                className="map-infection-seed"
                transform={`translate(${seed.x} ${seed.y})`}
              >
                <circle
                  className="map-infection-seed__glow"
                  r={r * 1.85}
                  style={{ opacity: op * 0.35 }}
                />
                <circle
                  className="map-infection-seed__core"
                  r={r}
                  style={{ opacity: op }}
                />
              </g>
            )
          })}
        </g>

        <g id="popup-layer">
          {popups.map((p) => (
            <g key={p.id} className="map-popup" transform={`translate(${p.x} ${p.y})`}>
              <circle
                className="map-popup__ambient"
                r={53}
                fill="url(#map-popup-ambient-glow)"
              />
              <g className="map-popup__pulse">
                <circle className="map-popup__halo" r={41} />
                <g clipPath="url(#map-popup-coin-clip)">
                  <circle className="map-popup__disc" r={41} cx={0} cy={0} />
                  <image
                    className="map-popup__logo"
                    href="/maps/notcoin_logo.svg"
                    x={-44}
                    y={-44}
                    width={88}
                    height={88}
                    preserveAspectRatio="xMidYMid slice"
                  />
                </g>
              </g>
              <circle
                className="map-popup__hit"
                r={48}
                onPointerDown={(e) => {
                  e.preventDefault()
                  const had = useGameStore.getState().popups.some((x) => x.id === p.id)
                  if (had) setTapFlash({ x: p.x, y: p.y })
                  clickPopup(p.id)
                  const still = useGameStore.getState().popups.some((x) => x.id === p.id)
                  if (!had || still) setTapFlash(null)
                }}
              />
            </g>
          ))}
          {tapFlash ? (
            <g
              transform={`translate(${tapFlash.x} ${tapFlash.y})`}
              style={{ pointerEvents: 'none' }}
            >
              <g className="map-popup--tap-burst">
                <circle className="map-popup__burst-ring" r={41} />
              </g>
            </g>
          ) : null}
        </g>
      </svg>
    </div>
  )
}
