import {
  GLOBAL_INFECTION_CLUSTER_CAP,
  MAP_BELIEVERS_REF,
  MAP_INFECTION_GROWTH_PER_S,
  MAP_INFECTION_NEIGHBOR_LEAK,
  MAP_INFECTION_SPREAD_FACTOR,
  MAP_NEIGHBOR_SOURCE_MIN_LEVEL,
  MAP_VIEWBOX,
  PLAYER_SEED_COUNTRY_PUSH_PER_S,
  PLAYER_SEED_GROWTH_PER_S,
} from './constants'
import type {
  InfectionClusterVisual,
  InfectionClustersByCountry,
  InfectionSeed,
  RecentPopupSpawn,
} from './types'

/** One rendered path; several may share `infectionKey` (e.g. multi-polygon countries). */
export type WorldPathDef = {
  renderId: string
  infectionKey: string
  d: string
  title: string
}

export type WorldLayout = {
  infectionKeys: string[]
  centroidsByKey: Record<string, { x: number; y: number }>
  neighborsByKey: Record<string, string[]>
  /**
   * Precomputed "valid land points" per country (in SVG viewBox coords).
   * Generated from real SVG path geometry in MapStage and used to place popups
   * and infection visuals away from oceans/coast bounding boxes.
   */
  candidatePointsByKey?: Record<string, { x: number; y: number }[]>
}

const NEIGHBOR_DIST = 118

let parsedPaths: WorldPathDef[] | null = null
let layout: WorldLayout | null = null

/**
 * Sets layout directly (used for localStorage restore).
 * Rendering still relies on `parsedPaths`; this is only the derived geometry graph.
 */
export function setWorldLayout(next: WorldLayout | null): void {
  layout = next
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

/** Stable spawn-time jitter (SVG px) so hotspots are not on a rigid grid. */
function clusterSpawnJitterPx(
  countryKey: string,
  slotIndex: number,
): { jx: number; jy: number } {
  const rng = mulberry32(hashStr(`${countryKey}|sj|${slotIndex}`))
  return {
    jx: (rng() - 0.5) * 13,
    jy: (rng() - 0.5) * 11,
  }
}

/** How many recent popup spawns we keep for anti-repeat placement (FIFO ring). */
export const RECENT_POPUP_SPAWN_MEMORY = 24

const POPUP_MIN_DIST_PX = 122
const POPUP_INFECTION_ANCHOR_CHANCE = 0.24
const POPUP_INFECTION_JITTER_X = 200
const POPUP_INFECTION_JITTER_Y = 158

/** Min world distance between red hotspot centers (new vs existing). */
const CLUSTER_MIN_DIST_STRICT_PX = 56
const CLUSTER_MIN_DIST_RELAX_PX = 42
const CLUSTER_MIN_DIST_LAST_RESORT_PX = 30
const CLUSTER_PLACEMENT_TRIES = 52

// Requested hard caps (do not currently raise visuals; existing caps are lower).
const MAX_CLUSTERS_GLOBAL = 120
const MAX_CLUSTERS_PER_COUNTRY = 5

// Performance: avoid O(n^2) global avoid lists. Only consider the most recent N clusters.
const CLUSTER_AVOID_LAST_N = 30

function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy
}

function isFarEnoughFrom(
  x: number,
  y: number,
  others: readonly { x: number; y: number }[],
  minD: number,
): boolean {
  const r2 = minD * minD
  for (const p of others) {
    if (dist2(x, y, p.x, p.y) <= r2) return false
  }
  return true
}

/** World positions of infection clusters + tap seeds (for popup “near spread” spawns). */
export function collectInfectionAnchorPoints(
  world: WorldLayout | null,
  clusters: InfectionClustersByCountry,
  seeds: readonly InfectionSeed[],
): { x: number; y: number }[] {
  if (!world?.infectionKeys.length) return []
  const out: { x: number; y: number }[] = []
  for (const [key, list] of Object.entries(clusters)) {
    const c = world.centroidsByKey[key]
    if (!c || !list?.length) continue
    for (const cl of list) {
      out.push({ x: c.x + cl.ox, y: c.y + cl.oy })
    }
  }
  for (const s of seeds) {
    out.push({ x: s.x, y: s.y })
  }
  return out
}

export function parseSvgViewBox(svgText: string): { width: number; height: number } {
  const m = svgText.match(/viewBox\s*=\s*["']([^"']+)["']/i)
  if (!m) return { width: MAP_VIEWBOX.width, height: MAP_VIEWBOX.height }
  const p = m[1]!.trim().split(/[\s,]+/).map(Number)
  if (p.length >= 4 && p.every((n) => !Number.isNaN(n))) {
    return { width: p[2]!, height: p[3]! }
  }
  return { width: MAP_VIEWBOX.width, height: MAP_VIEWBOX.height }
}

function logicalInfectionKey(el: Element, index: number): string {
  const id = el.getAttribute('id')?.trim()
  if (id) return id
  const name = el.getAttribute('name')?.trim()
  if (name) return name.replace(/\s+/g, '_')
  const cls = el.getAttribute('class')?.trim()?.split(/\s+/)?.[0]
  if (cls) return cls
  return `region_${index}`
}

export function parseWorldSvgPaths(svgText: string): WorldPathDef[] {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  const pathNodes = doc.querySelectorAll('path')
  const out: WorldPathDef[] = []
  pathNodes.forEach((el, index) => {
    const d = el.getAttribute('d')?.trim()
    if (!d) return
    const infectionKey = logicalInfectionKey(el, index)
    const title =
      el.getAttribute('name')?.trim() ||
      el.getAttribute('id')?.trim() ||
      infectionKey
    const renderId = `p${index}`
    out.push({ renderId, infectionKey, d, title })
  })

  return out
}

export function registerWorldPaths(paths: WorldPathDef[]): void {
  if (!paths.length) {
    parsedPaths = null
    layout = null
    return
  }
  parsedPaths = paths
  layout = null
}

export function completeWorldLayoutFromCentroids(
  centroidByRenderId: Record<string, { x: number; y: number }>,
  candidatePointsByKey?: Record<string, { x: number; y: number }[]>,
): void {
  if (!parsedPaths?.length) return

  const sum = new Map<string, { x: number; y: number; n: number }>()
  for (const p of parsedPaths) {
    const c = centroidByRenderId[p.renderId]
    if (!c) continue
    const cur = sum.get(p.infectionKey) ?? { x: 0, y: 0, n: 0 }
    cur.x += c.x
    cur.y += c.y
    cur.n += 1
    sum.set(p.infectionKey, cur)
  }

  const centroidsByKey: Record<string, { x: number; y: number }> = {}
  const infectionKeys: string[] = []
  for (const [k, v] of sum) {
    if (v.n < 1) continue
    infectionKeys.push(k)
    centroidsByKey[k] = { x: v.x / v.n, y: v.y / v.n }
  }

  const neighborsByKey: Record<string, string[]> = {}
  for (const a of infectionKeys) {
    neighborsByKey[a] = []
  }
  for (let i = 0; i < infectionKeys.length; i++) {
    const a = infectionKeys[i]!
    const ca = centroidsByKey[a]
    if (!ca) continue
    for (let j = i + 1; j < infectionKeys.length; j++) {
      const b = infectionKeys[j]!
      const cb = centroidsByKey[b]
      if (!cb) continue
      const dx = ca.x - cb.x
      const dy = ca.y - cb.y
      if (Math.hypot(dx, dy) < NEIGHBOR_DIST) {
        neighborsByKey[a]!.push(b)
        neighborsByKey[b]!.push(a)
      }
    }
  }

  layout = { infectionKeys, centroidsByKey, neighborsByKey, candidatePointsByKey }
}

export function getWorldLayout(): WorldLayout | null {
  return layout
}

export function getParsedWorldPaths(): WorldPathDef[] | null {
  return parsedPaths
}

/**
 * 0 until believers / holders / builders grow meaningfully above run start;
 * then ramps toward 1. Drives map cluster density only (not sim infection).
 */
export function mapVisualIntensity(
  believers: number,
  holders: number,
  builders: number,
): number {
  const b0 = 50_000
  const h0 = 20_000
  const bu0 = 2000
  const db = Math.max(0, believers - b0)
  const dh = Math.max(0, holders - h0)
  const dbu = Math.max(0, builders - bu0)
  const u = db / 72_000 + dh / 50_000 + dbu / 8_500
  if (u < 0.042) return 0
  return Math.min(1, Math.pow(u, 0.88))
}

/** Scales raw infection for rendering (keeps early game visually quiet). */
export function mapDisplayStrength(
  infectedLevel: number,
  believers: number,
  holders: number,
  builders: number,
): number {
  const pace = mapVisualIntensity(believers, holders, builders)
  return Math.min(1, infectedLevel * Math.max(0.185, pace))
}

function believerIntensity(believers: number): number {
  return Math.min(2.75, 0.35 + believers / MAP_BELIEVERS_REF)
}

export type CountryInfectionStepResult = {
  levels: Record<string, number>
  /** Keys that received a noticeable neighbor leak this tick (“spread jump”). */
  spreadJumps: string[]
}

export function stepCountryInfection(
  levels: Record<string, number>,
  believers: number,
  dtMs: number,
  world: WorldLayout,
): CountryInfectionStepResult {
  const dt = dtMs / 1000
  const bi = believerIntensity(believers)
  const next: Record<string, number> = { ...levels }
  const spreadJumpSet = new Set<string>()

  for (const key of world.infectionKeys) {
    let v = next[key] ?? 0
    if (v <= 0) continue
    const growth =
      MAP_INFECTION_GROWTH_PER_S *
      bi *
      dt *
      (1 - v * 0.38) *
      (1 + Math.min(1.2, v))
    v = Math.min(1, v + growth)
    next[key] = v
  }

  for (const a of world.infectionKeys) {
    const va = next[a] ?? 0
    if (va < MAP_NEIGHBOR_SOURCE_MIN_LEVEL) continue
    const neigh = world.neighborsByKey[a] ?? []
    for (const b of neigh) {
      const p = Math.min(0.92, va * MAP_INFECTION_SPREAD_FACTOR * dt * 1.15)
      if (Math.random() < p) {
        const beforeB = next[b] ?? 0
        const add = va * MAP_INFECTION_NEIGHBOR_LEAK * dt
        const afterB = Math.min(1, beforeB + add)
        next[b] = afterB
        if (afterB - beforeB >= 0.006 && beforeB < 0.06) {
          spreadJumpSet.add(b)
        }
      }
    }
  }

  return { levels: next, spreadJumps: [...spreadJumpSet] }
}

/** Country nearest to a map point (centroid distance). */
export function findNearestCountryKey(
  world: WorldLayout,
  x: number,
  y: number,
): string {
  const keys = world.infectionKeys
  if (keys.length === 0) return ''
  let best = keys[0]!
  let bestD = Infinity
  for (const key of keys) {
    const c = world.centroidsByKey[key]
    if (!c) continue
    const d = (c.x - x) ** 2 + (c.y - y) ** 2
    if (d < bestD) {
      bestD = d
      best = key
    }
  }
  return best
}

/**
 * Advance player seeds and slowly raise their target country’s infection level.
 */
export function applyPlayerInfectionSeeds(
  seeds: InfectionSeed[],
  levels: Record<string, number>,
  dtMs: number,
): { seeds: InfectionSeed[]; levels: Record<string, number> } {
  const dt = dtMs / 1000
  const nextLevels = { ...levels }
  const nextSeeds = seeds.map((s) => {
    const growthLevel = Math.min(
      1,
      s.growthLevel + PLAYER_SEED_GROWTH_PER_S * dt,
    )
    const key = s.countryKey
    if (!key) return { ...s, growthLevel }
    const cur = nextLevels[key] ?? 0
    const push =
      PLAYER_SEED_COUNTRY_PUSH_PER_S *
      // Stronger early "local push" after tap, without over-accelerating late-game.
      Math.max(0.22, growthLevel) *
      Math.pow(Math.max(0.001, 1 - cur), 1.12) *
      dt
    nextLevels[key] = Math.min(1, cur + push)
    return { ...s, growthLevel }
  })
  return { seeds: nextSeeds, levels: nextLevels }
}

const THRESHOLDS = [0.2, 0.5, 0.8] as const

export function maxClusterSlotsForLevel(level: number): number {
  if (level < 0.2) return 1
  if (level < 0.5) return 2
  return 3
}

function crossedThreshold(
  prev: number,
  next: number,
  t: number,
): boolean {
  return prev < t && next >= t
}

const DOTS_PER_CLUSTER = 5

export function stableClusterDots(
  countryKey: string,
  slotIndex: number,
  count: number,
): { dx: number; dy: number }[] {
  let seed = hashStr(`${countryKey}|slot${slotIndex}|dots`)
  const out: { dx: number; dy: number }[] = []
  for (let i = 0; i < count; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const u1 = (seed >>> 0) / 0xffffffff
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0
    const u2 = (seed >>> 0) / 0xffffffff
    const r = 3.5 + u1 * 9
    const ang = u2 * Math.PI * 2
    out.push({ dx: Math.cos(ang) * r, dy: Math.sin(ang) * r })
  }
  return out
}

export function makeClusterVisual(
  countryKey: string,
  slotIndex: number,
  world: WorldLayout | null | undefined,
  spawnedAtSessionMs: number,
  avoidWorld: readonly { x: number; y: number }[],
): InfectionClusterVisual {
  const centroid = world?.centroidsByKey?.[countryKey]
  const candidates = world?.candidatePointsByKey?.[countryKey]

  const finish = (ox: number, oy: number): InfectionClusterVisual => ({
    id: `${countryKey}-c${slotIndex}`,
    ox,
    oy,
    dots: stableClusterDots(countryKey, slotIndex, DOTS_PER_CLUSTER),
    spawnedAtSessionMs,
  })

  const tryWithMinD = (minD: number): InfectionClusterVisual | null => {
    if (!centroid) return null

    if (candidates && candidates.length > 0) {
      const rng = mulberry32(
        (hashStr(`${countryKey}|cvis|${slotIndex}`) ^
          spawnedAtSessionMs ^
          (avoidWorld.length * 2654435761)) >>>
          0,
      )
      for (let attempt = 0; attempt < CLUSTER_PLACEMENT_TRIES; attempt++) {
        const idx =
          (Math.floor(rng() * candidates.length) + attempt * 17) %
          candidates.length
        const p = candidates[idx]!
        const { jx, jy } = clusterSpawnJitterPx(
          countryKey,
          slotIndex + attempt * 31,
        )
        const ox = p.x - centroid.x + jx * 1.2
        const oy = p.y - centroid.y + jy * 1.2
        const wx = centroid.x + ox
        const wy = centroid.y + oy
        if (isFarEnoughFrom(wx, wy, avoidWorld, minD)) {
          return finish(ox, oy)
        }
      }
    }

    let seed =
      hashStr(`${countryKey}|cluster|${slotIndex}|fb`) ^ spawnedAtSessionMs
    for (let attempt = 0; attempt < 22; attempt++) {
      seed = (Math.imul(seed, 1664525) + 1013904223 + attempt) >>> 0
      let ox = ((seed % 4096) / 4096) * 56 - 28
      seed = (Math.imul(seed, 1103515245) + 12345) >>> 0
      let oy = ((seed % 4096) / 4096) * 50 - 25
      const { jx, jy } = clusterSpawnJitterPx(
        countryKey,
        slotIndex + attempt * 13,
      )
      ox += jx
      oy += jy
      const wx = centroid.x + ox
      const wy = centroid.y + oy
      if (isFarEnoughFrom(wx, wy, avoidWorld, minD)) {
        return finish(ox, oy)
      }
    }
    return null
  }

  let vis =
    tryWithMinD(CLUSTER_MIN_DIST_STRICT_PX) ??
    tryWithMinD(CLUSTER_MIN_DIST_RELAX_PX) ??
    tryWithMinD(CLUSTER_MIN_DIST_LAST_RESORT_PX)

  if (!vis && centroid) {
    if (candidates && candidates.length > 0) {
      const rng = mulberry32(hashStr(`${countryKey}|cvis|lr|${slotIndex}`))
      const p = candidates[Math.floor(rng() * candidates.length)]!
      const { jx, jy } = clusterSpawnJitterPx(countryKey, slotIndex + 999)
      vis = finish(p.x - centroid.x + jx, p.y - centroid.y + jy)
    } else {
      let seed = hashStr(`${countryKey}|cluster|${slotIndex}|lr`)
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      const ox = ((seed % 4096) / 4096) * 44 - 22
      seed = (Math.imul(seed, 1103515245) + 12345) >>> 0
      const oy = ((seed % 4096) / 4096) * 40 - 20
      const { jx, jy } = clusterSpawnJitterPx(countryKey, slotIndex)
      vis = finish(ox + jx, oy + jy)
    }
  }

  if (!vis) {
    return {
      id: `${countryKey}-c${slotIndex}`,
      ox: 0,
      oy: 0,
      dots: stableClusterDots(countryKey, slotIndex, DOTS_PER_CLUSTER),
      spawnedAtSessionMs,
    }
  }
  return vis
}

/**
 * Updates persistent cluster lists: thresholds 0.2/0.5/0.8, spread jumps, seed;
 * enforces per-country slot caps and global cap.
 */
export function syncInfectionClusters(
  prevClusters: InfectionClustersByCountry,
  prevLevels: Record<string, number>,
  nextLevels: Record<string, number>,
  spreadJumps: string[],
  world: WorldLayout,
  sessionMapActiveMs: number,
): InfectionClustersByCountry {
  const jumpSet = new Set(spreadJumps)
  const next: InfectionClustersByCountry = {}

  const worldClusterPos = (
    k: string,
    cl: InfectionClusterVisual,
  ): { x: number; y: number } | null => {
    const cent = world.centroidsByKey[k]
    if (!cent) return null
    return { x: cent.x + cl.ox, y: cent.y + cl.oy }
  }

  // Flat list of already-chosen cluster centers (world coords), used for spacing.
  // We keep only the tail to bound work per new cluster.
  const avoidTail: { x: number; y: number }[] = []
  let globalCount = 0

  for (const key of world.infectionKeys) {
    const prev = prevLevels[key] ?? 0
    const nextLv = nextLevels[key] ?? 0
    const maxSlots = Math.min(
      MAX_CLUSTERS_PER_COUNTRY,
      maxClusterSlotsForLevel(nextLv),
    )
    const arr = (prevClusters[key] ?? []).map((c) => ({
      ...c,
      spawnedAtSessionMs:
        c.spawnedAtSessionMs ??
        Math.max(0, sessionMapActiveMs - 120_000),
    }))

    while (arr.length > maxSlots) {
      arr.pop()
    }

    // Seed avoid list with already-existing clusters in this same country.
    // (These might be from a prior tick; preserve spacing within country.)
    for (const cl of arr) {
      const wp = worldClusterPos(key, cl)
      if (wp) avoidTail.push(wp)
    }
    if (avoidTail.length > CLUSTER_AVOID_LAST_N) {
      avoidTail.splice(0, avoidTail.length - CLUSTER_AVOID_LAST_N)
    }

    const tryAdd = () => {
      if (arr.length >= maxSlots) return
      if (globalCount >= MAX_CLUSTERS_GLOBAL) return
      const slot = arr.length
      arr.push(
        makeClusterVisual(
          key,
          slot,
          world,
          sessionMapActiveMs,
          // Performance: only consider the most recent cluster centers.
          avoidTail.slice(-CLUSTER_AVOID_LAST_N),
        ),
      )
      const wp = worldClusterPos(key, arr[arr.length - 1]!)
      if (wp) {
        avoidTail.push(wp)
        if (avoidTail.length > CLUSTER_AVOID_LAST_N) {
          avoidTail.splice(0, avoidTail.length - CLUSTER_AVOID_LAST_N)
        }
      }
      globalCount += 1
    }

    if (arr.length === 0 && nextLv > 0.008) {
      tryAdd()
    }

    for (const t of THRESHOLDS) {
      if (crossedThreshold(prev, nextLv, t)) tryAdd()
    }

    if (jumpSet.has(key)) {
      tryAdd()
    }

    next[key] = arr
  }

  type Flat = { key: string; level: number; c: InfectionClusterVisual }
  const flat: Flat[] = []
  for (const key of world.infectionKeys) {
    const level = nextLevels[key] ?? 0
    for (const c of next[key] ?? []) {
      flat.push({ key, level, c })
    }
  }
  flat.sort((a, b) => {
    if (b.level !== a.level) return b.level - a.level
    return a.key.localeCompare(b.key)
  })

  if (flat.length <= GLOBAL_INFECTION_CLUSTER_CAP) {
    return next
  }

  const kept = new Set(
    flat
      .slice(0, GLOBAL_INFECTION_CLUSTER_CAP)
      .map((e) => `${e.key}|${e.c.id}`),
  )
  const pruned: InfectionClustersByCountry = {}
  for (const { key, c } of flat) {
    if (!kept.has(`${key}|${c.id}`)) continue
    pruned[key] = [...(pruned[key] ?? []), c]
  }
  return pruned
}

export function pickMapPopupPoint(
  world: WorldLayout | null,
  levels: Record<string, number>,
  believers: number,
  holders: number,
  builders: number,
  existingPoints?: { x: number; y: number }[],
  infectionAnchors?: readonly { x: number; y: number }[],
  recentSpawns?: readonly RecentPopupSpawn[],
): { x: number; y: number; countryKey: string } {
  const w = MAP_VIEWBOX.width
  const h = MAP_VIEWBOX.height
  if (!world?.infectionKeys.length) {
    const x = w * (0.18 + Math.random() * 0.64)
    const y = h * (0.16 + Math.random() * 0.68)
    return { x, y, countryKey: '' }
  }

  const factionWeight =
    1 +
    Math.min(1.5, believers / 90_000) +
    Math.min(0.8, holders / 120_000) +
    Math.min(0.6, builders / 25_000)

  const keys = world.infectionKeys
  const baseWeights = keys.map((key) => {
    const lvl = levels[key] ?? 0
    return 0.04 + lvl * lvl * 2.2 * factionWeight + (lvl > 0.12 ? 0.15 : 0)
  })

  const recent = recentSpawns ?? []
  const tail = recent.slice(-12)
  const countByKey: Record<string, number> = {}
  for (const r of tail) {
    if (!r.countryKey) continue
    countByKey[r.countryKey] = (countByKey[r.countryKey] ?? 0) + 1
  }
  const lastCountry = tail[tail.length - 1]?.countryKey
  const prevCountry = tail[tail.length - 2]?.countryKey

  const pickWeightedCountry = (): string => {
    const adj = keys.map((key, i) => {
      let wi = baseWeights[i]!
      const cnt = countByKey[key] ?? 0
      if (cnt >= 4) wi *= 0.2
      else if (cnt >= 3) wi *= 0.32
      else if (cnt === 2) wi *= 0.5
      else if (cnt === 1) wi *= 0.72
      if (key === lastCountry) wi *= 0.62
      if (key === lastCountry && key === prevCountry) wi *= 0.42
      return wi
    })
    let t = adj.reduce((a, b) => a + b, 0)
    if (t <= 0) t = keys.length
    let roll = Math.random() * t
    let chosen = keys[keys.length - 1]!
    for (let i = 0; i < keys.length; i++) {
      const wi = t <= 0 ? 1 : adj[i]!
      roll -= wi
      if (roll <= 0) {
        chosen = keys[i]!
        break
      }
    }
    return chosen
  }

  const avoid: { x: number; y: number }[] = [...(existingPoints ?? [])]
  for (const r of recent) {
    avoid.push({ x: r.x, y: r.y })
  }

  const minDist = POPUP_MIN_DIST_PX
  const tooClose = (x: number, y: number) => {
    for (const p of avoid) {
      if (dist2(x, y, p.x, p.y) < minDist * minDist) return true
    }
    return false
  }

  const anchors = infectionAnchors ?? []

  for (let attempt = 0; attempt < 38; attempt++) {
    const chosen = pickWeightedCountry()
    const c = world.centroidsByKey[chosen] ?? { x: w / 2, y: h / 2 }
    const candidates = world.candidatePointsByKey?.[chosen] ?? null

    let x = c.x
    let y = c.y

    const useHotspot =
      anchors.length > 0 && Math.random() < POPUP_INFECTION_ANCHOR_CHANCE
    if (useHotspot) {
      const a = anchors[(Math.random() * anchors.length) | 0]!
      x = a.x + (Math.random() - 0.5) * POPUP_INFECTION_JITTER_X
      y = a.y + (Math.random() - 0.5) * POPUP_INFECTION_JITTER_Y
    } else if (candidates && candidates.length > 0) {
      const i0 = (Math.random() * candidates.length) | 0
      const i1 = (i0 + 1 + ((Math.random() * (candidates.length - 1)) | 0)) %
        candidates.length
      const pick =
        attempt % 2 === 0 ? candidates[i0]! : candidates[i1]!
      x = pick.x + (Math.random() - 0.5) * 58
      y = pick.y + (Math.random() - 0.5) * 48
    } else {
      x = c.x + (Math.random() - 0.5) * 88
      y = c.y + (Math.random() - 0.5) * 72
    }
    x = Math.max(16, Math.min(w - 16, x))
    y = Math.max(16, Math.min(h - 16, y))
    if (!tooClose(x, y)) {
      const countryKey = findNearestCountryKey(world, x, y)
      return { x, y, countryKey }
    }
  }

  const fallbackKey = pickWeightedCountry()
  const fallback = world.centroidsByKey[fallbackKey] ?? {
    x: w / 2,
    y: h / 2,
  }
  const x = Math.max(
    16,
    Math.min(w - 16, fallback.x + (Math.random() - 0.5) * 100),
  )
  const y = Math.max(
    16,
    Math.min(h - 16, fallback.y + (Math.random() - 0.5) * 86),
  )
  const countryKey = findNearestCountryKey(world, x, y)
  return { x, y, countryKey }
}

