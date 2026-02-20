import type { MapBounds, Restaurant, Cluster } from '@/types/restaurant'

/** Haversine distance in km between two points */
export function getDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180
}

/** Filter restaurants within map bounds (with optional padding ratio) */
export function filterByBounds(
  restaurants: Restaurant[],
  bounds: MapBounds,
  padding = 0
): Restaurant[] {
  const latPad = (bounds.north - bounds.south) * padding
  const lngPad = (bounds.east - bounds.west) * padding
  return restaurants.filter(
    (r) =>
      r.lat >= bounds.south - latPad &&
      r.lat <= bounds.north + latPad &&
      r.lng >= bounds.west - lngPad &&
      r.lng <= bounds.east + lngPad
  )
}

/** Filter restaurants by selected categories */
export function filterByCategories(
  restaurants: Restaurant[],
  categories: string[]
): Restaurant[] {
  if (categories.length === 0) return restaurants
  return restaurants.filter((r) =>
    r.categories.some((c) => categories.includes(c))
  )
}

/** Extract unique categories from restaurant list */
export function extractCategories(restaurants: Restaurant[]): string[] {
  const set = new Set<string>()
  restaurants.forEach((r) => r.categories.forEach((c) => set.add(c)))
  return Array.from(set).sort()
}

/** Zoom level below which clustering is enabled */
export const CLUSTER_ZOOM_THRESHOLD = Number(import.meta.env.VITE_CLUSTER_ZOOM_THRESHOLD) || 16

/** Cluster restaurants into grid cells based on zoom level */
export function clusterRestaurants(
  restaurants: Restaurant[],
  zoom: number
): Cluster[] {
  if (restaurants.length === 0) return []

  // Grid cell size in degrees — larger cells at lower zoom
  const cellSize = 360 / Math.pow(2, zoom)

  const grid = new Map<string, Restaurant[]>()

  for (const r of restaurants) {
    const cellX = Math.floor(r.lng / cellSize)
    const cellY = Math.floor(r.lat / cellSize)
    const key = `${cellX}:${cellY}`
    const list = grid.get(key)
    if (list) {
      list.push(r)
    } else {
      grid.set(key, [r])
    }
  }

  const clusters: Cluster[] = []
  for (const group of grid.values()) {
    const lat = group.reduce((s, r) => s + r.lat, 0) / group.length
    const lng = group.reduce((s, r) => s + r.lng, 0) / group.length
    clusters.push({ lat, lng, restaurants: group, count: group.length })
  }

  return clusters
}

/** Default center: 강남구 */
export const DEFAULT_CENTER = { lat: 37.4979, lng: 127.0276 }
export const DEFAULT_ZOOM = Number(import.meta.env.VITE_DEFAULT_ZOOM) || 16
