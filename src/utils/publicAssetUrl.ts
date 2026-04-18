/**
 * URL for files in `public/` (e.g. `maps/world.svg` → `/maps/world.svg` or `/base/maps/...`).
 * edit values in src/game/config/*.json — asset paths use this helper in UI code.
 */
export function publicAssetUrl(pathFromPublicRoot: string): string {
  const p = pathFromPublicRoot.replace(/^\/+/, '')
  const base = import.meta.env.BASE_URL
  return `${base}${p}`
}
