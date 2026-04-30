import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { MAP_VIEWBOX, SESSION_MS } from '../game/constants'
import {
  completeWorldLayoutFromCentroids,
  getWorldLayout,
  mapDisplayStrength,
  parseSvgViewBox,
  parseWorldSvgPaths,
  registerWorldPaths,
  setWorldLayout,
  type WorldPathDef,
} from '../game/countrySpread'
import { useGameStore } from '../store/gameStore'
import { publicAssetUrl } from '../utils/publicAssetUrl'
import './MapStage.css'

const WORLD_MAP_URL = publicAssetUrl('maps/world.svg')
const NOTCOIN_LOGO_URL = publicAssetUrl('maps/notcoin_logo.svg')

const WORLD_LAYOUT_CACHE_KEY = 'worldLayout_v1'
const MAX_CANDIDATES_PER_COUNTRY = 40

function pathDomId(renderId: string): string {
  return `wm-${renderId}`
}

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)!
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed0: number): () => number {
  let a = seed0 >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type ClusterDraw = {
  clusterId: string
  countryKey: string
  x: number
  y: number
  disp: number
  dots: { dx: number; dy: number }[]
  spawnedAtSessionMs: number
  vizPulseDur: number
  vizDelayBase: number
  vizHeatMul: number
  vizRingMul: number
  vizDriftPeriod: number
}

type InfectionLinkDraw = {
  id: string
  d: string
  delaySec: number
}

function buildInfectionLinks(
  nodes: { id: string; x: number; y: number }[],
  maxLinks: number,
): InfectionLinkDraw[] {
  if (nodes.length < 2) return []
  const MIN_D = 36
  const MAX_D = 240
  type Pair = { i: number; j: number; d: number }
  const pairs: Pair[] = []
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i]!
      const b = nodes[j]!
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      if (d >= MIN_D && d <= MAX_D) pairs.push({ i, j, d })
    }
  }
  pairs.sort((a, b) => a.d - b.d)
  const degree = new Map<string, number>()
  const out: InfectionLinkDraw[] = []
  const bump = (id: string) => {
    degree.set(id, (degree.get(id) ?? 0) + 1)
  }
  for (const p of pairs) {
    if (out.length >= maxLinks) break
    const a = nodes[p.i]!
    const b = nodes[p.j]!
    if ((degree.get(a.id) ?? 0) >= 4) continue
    if ((degree.get(b.id) ?? 0) >= 4) continue
    const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`
    const h = hashStr(key)
    if (h % 4 === 0) continue
    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2
    const dx = b.x - a.x
    const dy = b.y - a.y
    const nlen = Math.hypot(dx, dy) || 1
    const nx = -dy / nlen
    const ny = dx / nlen
    const bend = (h % 100) / 100 - 0.48
    const off = 18 + (h % 36)
    const cx = mx + nx * off * bend * 2.2
    const cy = my + ny * off * bend * 2.2
    const d = `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`
    out.push({ id: key, d, delaySec: (h % 50) / 25 })
    bump(a.id)
    bump(b.id)
  }
  return out
}

export function MapStage() {
  const svgRef = useRef<SVGSVGElement>(null)
  const [svgText, setSvgText] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [viewBox, setViewBox] = useState<{ width: number; height: number }>(
    MAP_VIEWBOX,
  )
  const [layoutGen, setLayoutGen] = useState(0)
  const [layoutRestored, setLayoutRestored] = useState(false)

  const setWorldReady = useGameStore((s) => s.setWorldReady)
  const popups = useGameStore((s) => s.popups)
  const clickPopup = useGameStore((s) => s.clickPopup)
  const countryInfection = useGameStore((s) => s.countryInfection)
  const infectionClusters = useGameStore((s) => s.infectionClusters)
  const infectionSeeds = useGameStore((s) => s.infectionSeeds)
  const sessionMapActiveMs = useGameStore((s) => s.sessionMapActiveMs)
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
    fetch(WORLD_MAP_URL)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.text()
      })
      .then((text) => {
        if (cancelled) return
        setSvgText(text)
        setViewBox(parseSvgViewBox(text))
        setLoadError(null)
        setWorldReady(false)
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load world map')
        setWorldReady(false)
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

      // Fast path: restore a cached layout for this exact set of infection keys.
      if (!layoutRestored) {
        try {
          const raw = localStorage.getItem(WORLD_LAYOUT_CACHE_KEY)
          if (raw) {
            const cached = JSON.parse(raw) as unknown
            const obj = cached as {
              infectionKeys?: unknown
              centroidsByKey?: unknown
              neighborsByKey?: unknown
              candidatePointsByKey?: unknown
            }
            const infectionKeys = Array.isArray(obj?.infectionKeys)
              ? (obj.infectionKeys as string[]).filter((k) => typeof k === 'string')
              : null
            const centroidsByKey =
              obj?.centroidsByKey && typeof obj.centroidsByKey === 'object'
                ? (obj.centroidsByKey as Record<string, { x: number; y: number }>)
                : null
            const neighborsByKey =
              obj?.neighborsByKey && typeof obj.neighborsByKey === 'object'
                ? (obj.neighborsByKey as Record<string, string[]>)
                : null
            const candidatePointsByKey =
              obj?.candidatePointsByKey && typeof obj.candidatePointsByKey === 'object'
                ? (obj.candidatePointsByKey as Record<string, { x: number; y: number }[]>)
                : undefined

            const expectedKeys = Array.from(new Set(paths.map((p) => p.infectionKey))).sort()
            const cachedKeys = infectionKeys ? [...infectionKeys].sort() : null
            const keysMatch =
              cachedKeys &&
              cachedKeys.length === expectedKeys.length &&
              cachedKeys.every((k, i) => k === expectedKeys[i])

            if (infectionKeys && centroidsByKey && neighborsByKey && keysMatch) {
              setWorldLayout({
                infectionKeys,
                centroidsByKey,
                neighborsByKey,
                candidatePointsByKey,
              })
              setLayoutRestored(true)
              setWorldReady(true)
              setLayoutGen((g) => g + 1)
              return
            }
          }
        } catch {
          // Ignore cache errors; fall back to full compute.
        }
      }

      const centroids: Record<string, { x: number; y: number }> = {}
      const byKey = new Map<string, SVGPathElement[]>()
      for (const p of paths) {
        const el = root.querySelector(
          `#${CSS.escape(pathDomId(p.renderId))}`,
        ) as SVGPathElement | null
        if (!el) continue
        const list = byKey.get(p.infectionKey) ?? []
        list.push(el)
        byKey.set(p.infectionKey, list)
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
      const candidatePointsByKey: Record<string, { x: number; y: number }[]> = {}

      // Generate multiple in-fill points per country from real SVG geometry.
      // This keeps popups/spread off oceans without heavy geo libs.
      for (const [key, els] of byKey) {
        if (!els.length) continue
        const rng = mulberry32(hashStr(key))
        const areas = els.map((el) => {
          try {
            const bb = el.getBBox()
            return Math.max(0, bb.width * bb.height)
          } catch {
            return 1
          }
        })
        const totalArea = areas.reduce((a, b) => a + b, 0) || 1

        const points: { x: number; y: number }[] = []
        const targetCount = 32
        const maxTries = 320

        const pickEl = () => {
          let roll = rng() * totalArea
          for (let i = 0; i < els.length; i++) {
            roll -= areas[i] ?? 0
            if (roll <= 0) return els[i]!
          }
          return els[els.length - 1]!
        }

        for (let i = 0; i < targetCount; i++) {
          let found: { x: number; y: number } | null = null
          for (let t = 0; t < maxTries; t++) {
            const el = pickEl()
            let bb: DOMRect | null = null
            try {
              bb = el.getBBox()
            } catch {
              bb = null
            }
            if (!bb || bb.width <= 0 || bb.height <= 0) continue
            const x = bb.x + rng() * bb.width
            const y = bb.y + rng() * bb.height

            const pt = new DOMPoint(x, y)
            let ok = false
            for (const e of els) {
              const geo = e as unknown as SVGGeometryElement
              if (typeof geo.isPointInFill === 'function' && geo.isPointInFill(pt)) {
                ok = true
                break
              }
            }
            if (!ok) continue

            // Avoid candidates clustering too tightly.
            let tooClose = false
            for (const p of points) {
              const dx = p.x - x
              const dy = p.y - y
              if (dx * dx + dy * dy < 58 * 58) {
                tooClose = true
                break
              }
            }
            if (tooClose) continue

            found = { x, y }
            break
          }
          if (found) points.push(found)
        }

        if (points.length) {
          candidatePointsByKey[key] = points.slice(0, MAX_CANDIDATES_PER_COUNTRY)
        }
      }

      completeWorldLayoutFromCentroids(centroids, candidatePointsByKey)
      const nextLayout = getWorldLayout()
      if (nextLayout && nextLayout.infectionKeys.length > 0) {
        setWorldReady(true)
        // Cache for next load (skip expensive SVG geometry sampling).
        try {
          localStorage.setItem(WORLD_LAYOUT_CACHE_KEY, JSON.stringify(nextLayout))
        } catch {
          /* ignore */
        }
      }
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
        const rv = mulberry32(hashStr(cl.id))
        clusters.push({
          clusterId: cl.id,
          countryKey,
          x: c.x + cl.ox,
          y: c.y + cl.oy,
          disp,
          dots: cl.dots,
          spawnedAtSessionMs: cl.spawnedAtSessionMs,
          vizPulseDur: 2.1 + rv() * 1.35,
          vizDelayBase: rv() * 2.6,
          vizHeatMul: 0.82 + rv() * 0.38,
          vizRingMul: 0.88 + rv() * 0.34,
          vizDriftPeriod: 10.5 + rv() * 9.5,
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

  const infectionLinks = useMemo(() => {
    const nodes = spreadVisuals.clusters.map((c) => ({
      id: c.clusterId,
      x: c.x,
      y: c.y,
    }))
    return buildInfectionLinks(nodes.slice(0, 40), 26)
  }, [spreadVisuals.clusters])

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
            <stop offset="0%" stopColor="#ff5a52" stopOpacity="1" />
            <stop offset="35%" stopColor="#ff3030" stopOpacity="0.55" />
            <stop offset="70%" stopColor="#e01010" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#ff0000" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="map-infection-heat" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff8a80" stopOpacity="0.9" />
            <stop offset="45%" stopColor="#ff4040" stopOpacity="0.35" />
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
              className="map-country"
              data-infection-key={p.infectionKey}
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
          <g className="map-infection-links" aria-hidden>
            {infectionLinks.map((link) => (
              <path
                key={link.id}
                className="map-infection-link"
                d={link.d}
                style={{ animationDelay: `${-link.delaySec}s` }}
              />
            ))}
          </g>
          {spreadVisuals.clusters.map((cl) => {
            const ageMs = Math.max(0, sessionMapActiveMs - cl.spawnedAtSessionMs)
            const age01 = Math.min(1, ageMs / 150_000)
            const shrink = 1 - age01 * 0.14
            const fadeCluster = 1 - age01 * 0.38
            const ringBoost = (1 - age01 * 0.55) * (0.5 + cl.disp * 0.5)
            const baseR = (3.2 + cl.disp * 5.5) * cl.vizRingMul
            const driftStyle: CSSProperties = {
              ['--pulse-dur' as string]: `${cl.vizPulseDur}s`,
              ['--delay-base' as string]: `${-cl.vizDelayBase}s`,
              animation: `mapInfectionClusterDrift ${cl.vizDriftPeriod}s ease-in-out infinite`,
            }
            return (
              <g
                key={cl.clusterId}
                className="map-infection-cluster"
                transform={`translate(${cl.x} ${cl.y}) scale(${shrink})`}
              >
                <g className="map-infection-cluster__drift" style={driftStyle}>
                  <circle
                    className="map-infection-cluster__heat"
                    r={(16 + cl.disp * 22) * cl.vizHeatMul}
                    fill="url(#map-infection-heat)"
                    style={{
                      opacity: (0.22 + cl.disp * 0.38) * fadeCluster,
                    }}
                  />
                  <circle
                    className="map-infection-cluster__glow-disc"
                    r={(9 + cl.disp * 14) * cl.vizHeatMul}
                    fill="url(#map-infection-core)"
                    style={{
                      opacity: (0.2 + cl.disp * 0.32) * fadeCluster,
                    }}
                  />
                  <g style={{ opacity: fadeCluster * ringBoost }}>
                    {[0, 1, 2].map((ri) => (
                      <circle
                        key={`${cl.clusterId}-ring-${ri}`}
                        className={`map-infection-cluster__pulse-ring map-infection-cluster__pulse-ring--${ri}`}
                        r={baseR}
                        fill="none"
                        stroke="rgba(255, 95, 88, 0.72)"
                        strokeWidth={(0.85 + cl.disp * 0.35) * cl.vizRingMul}
                      />
                    ))}
                  </g>
                  <circle
                    className="map-infection-cluster__core"
                    cx={0}
                    cy={0}
                    r={(2.1 + cl.disp * 2.4) * (0.92 + cl.vizHeatMul * 0.08)}
                    fill="#ff2a28"
                    stroke="rgba(255, 220, 210, 0.55)"
                    strokeWidth={0.45}
                    style={{
                      opacity: (0.78 + cl.disp * 0.2) * fadeCluster,
                    }}
                  />
                  {cl.dots.map((o, i) => (
                    <circle
                      key={`${cl.clusterId}-d-${i}`}
                      className="map-infection-dot"
                      cx={o.dx}
                      cy={o.dy}
                      r={1.05}
                      style={{ opacity: (0.55 + cl.disp * 0.35) * fadeCluster }}
                    />
                  ))}
                </g>
              </g>
            )
          })}
        </g>

        <g id="popup-layer">
          {popups.map((p) => {
            const spawnT = p.spawnedAtSessionMs ?? sessionMapActiveMs
            const spawnAge = Math.max(0, sessionMapActiveMs - spawnT)
            const enter = Math.min(1, spawnAge / 400)
            return (
              <g key={p.id} className="map-popup" transform={`translate(${p.x} ${p.y})`}>
                <g
                  className="map-popup__enter"
                  style={{
                    opacity: enter,
                    transform: `scale(${0.78 + 0.22 * enter})`,
                  }}
                >
                  <circle
                    className="map-popup__ambient"
                    r={53}
                    fill="url(#map-popup-ambient-glow)"
                  />
                  <g className="map-popup__pulse">
                    <circle className="map-popup__halo" r={41} />
                    <g clipPath="url(#map-popup-coin-clip)">
                      <circle className="map-popup__disc" r={41} cx={0} cy={0} />
                      {/* Logo: foreignObject + img (reliable in WebViews); file in public/maps/notcoin_logo.svg */}
                      <foreignObject
                        x={-41}
                        y={-41}
                        width={82}
                        height={82}
                        className="map-popup__logo-host"
                      >
                        <div className="map-popup__logo-box">
                          <img
                            className="map-popup__logo-img"
                            src={NOTCOIN_LOGO_URL}
                            alt=""
                            width={82}
                            height={82}
                            draggable={false}
                          />
                        </div>
                      </foreignObject>
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
              </g>
            )
          })}
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

        <g id="seed-layer" pointerEvents="none">
          {infectionSeeds.map((seed) => {
            const ageMs = Math.max(0, sessionMapActiveMs - seed.createdAtSessionMs)
            const age01 = Math.min(1, ageMs / (SESSION_MS * 0.75))
            const fadeS = 1 - age01 * 0.42
            const shrinkS = 1 - age01 * 0.12
            const fresh = 1 - age01 * 0.35
            const coreR = 1.7 + seed.growthLevel * 1.4
            const glowR = coreR * 2.35
            const op = (0.72 + seed.growthLevel * 0.22) * fadeS
            const ringBoost = (0.55 + seed.growthLevel * 0.45) * fresh
            const sv = mulberry32(hashStr(seed.id))
            const seedPulse = 1.75 + sv() * 0.85
            const seedDelay = sv() * 2.1
            const seedDrift = 8.5 + sv() * 7
            const seedRingMul = 0.9 + sv() * 0.28
            const seedDriftStyle: CSSProperties = {
              ['--seed-pulse-dur' as string]: `${seedPulse}s`,
              ['--seed-delay-base' as string]: `${-seedDelay}s`,
              animation: `mapInfectionSeedDrift ${seedDrift}s ease-in-out infinite`,
            }
            return (
              <g
                key={seed.id}
                className="map-infection-seed"
                transform={`translate(${seed.x} ${seed.y}) scale(${shrinkS})`}
              >
                <g className="map-infection-seed__drift" style={seedDriftStyle}>
                  <circle
                    className="map-infection-seed__heat"
                    r={glowR * 1.35 * (0.95 + seedRingMul * 0.05)}
                    fill="url(#map-infection-heat)"
                    style={{ opacity: op * 0.28 * fresh }}
                  />
                  <circle
                    className="map-infection-seed__glow"
                    r={glowR}
                    style={{ opacity: op * 0.36 }}
                  />
                  <g style={{ opacity: 0.92 * fadeS * ringBoost * fresh }}>
                    {[0, 1, 2].map((ri) => (
                      <circle
                        key={`${seed.id}-sr-${ri}`}
                        className={`map-infection-seed__pulse-ring map-infection-seed__pulse-ring--${ri}`}
                        r={coreR * 1.15 * seedRingMul}
                        fill="none"
                        stroke="rgba(255, 100, 92, 0.75)"
                        strokeWidth={0.55 + seed.growthLevel * 0.35}
                      />
                    ))}
                  </g>
                  <circle
                    className="map-infection-seed__core"
                    r={coreR}
                    style={{ opacity: op }}
                  />
                </g>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
