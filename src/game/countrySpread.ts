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
}

const NEIGHBOR_DIST = 118

let parsedPaths: WorldPathDef[] | null = null
let layout: WorldLayout | null = null

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)!
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
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

  layout = { infectionKeys, centroidsByKey, neighborsByKey }
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
      Math.max(0.06, growthLevel) *
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
): InfectionClusterVisual {
  let seed = hashStr(`${countryKey}|cluster|${slotIndex}|pos`)
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  const ox = ((seed % 4096) / 4096) * 44 - 22
  seed = (Math.imul(seed, 1103515245) + 12345) >>> 0
  const oy = ((seed % 4096) / 4096) * 40 - 20
  return {
    id: `${countryKey}-c${slotIndex}`,
    ox,
    oy,
    dots: stableClusterDots(countryKey, slotIndex, DOTS_PER_CLUSTER),
  }
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
): InfectionClustersByCountry {
  const jumpSet = new Set(spreadJumps)
  const next: InfectionClustersByCountry = {}

  for (const key of world.infectionKeys) {
    const prev = prevLevels[key] ?? 0
    const nextLv = nextLevels[key] ?? 0
    const maxSlots = maxClusterSlotsForLevel(nextLv)
    const arr = [...(prevClusters[key] ?? [])]

    while (arr.length > maxSlots) {
      arr.pop()
    }

    const tryAdd = () => {
      if (arr.length >= maxSlots) return
      const slot = arr.length
      arr.push(makeClusterVisual(key, slot))
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
): { x: number; y: number } {
  const w = MAP_VIEWBOX.width
  const h = MAP_VIEWBOX.height
  if (!world?.infectionKeys.length) {
    return {
      x: w * 0.35 + (Math.random() - 0.5) * 120,
      y: h * 0.42 + (Math.random() - 0.5) * 100,
    }
  }

  const factionWeight =
    1 +
    Math.min(1.5, believers / 90_000) +
    Math.min(0.8, holders / 120_000) +
    Math.min(0.6, builders / 25_000)

  const keys = world.infectionKeys
  const weights = keys.map((key) => {
    const lvl = levels[key] ?? 0
    return 0.04 + lvl * lvl * 2.2 * factionWeight + (lvl > 0.12 ? 0.15 : 0)
  })
  let total = weights.reduce((a, b) => a + b, 0)
  if (total <= 0) total = keys.length

  let roll = Math.random() * total
  let chosen = keys[keys.length - 1]!
  for (let i = 0; i < keys.length; i++) {
    const wi = total <= 0 ? 1 : weights[i]!
    roll -= wi
    if (roll <= 0) {
      chosen = keys[i]!
      break
    }
  }

  const c = world.centroidsByKey[chosen] ?? { x: w / 2, y: h / 2 }
  const jx = (Math.random() - 0.5) * 28
  const jy = (Math.random() - 0.5) * 22
  return {
    x: Math.max(16, Math.min(w - 16, c.x + jx)),
    y: Math.max(16, Math.min(h - 16, c.y + jy)),
  }
}

