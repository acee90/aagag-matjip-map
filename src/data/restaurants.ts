import { createServerFn } from '@tanstack/react-start'
import type { Restaurant } from '@/types/restaurant'

import { env } from 'cloudflare:workers'

interface RestaurantRow {
  id: number
  name: string
  address: string
  link: string
  recommendation: string
  categories: string
  region: string
  lat: number
  lng: number
}

function toRestaurant(row: RestaurantRow): Restaurant {
  return {
    name: row.name,
    address: row.address,
    link: row.link,
    recommendation: row.recommendation,
    categories: JSON.parse(row.categories),
    region: row.region,
    lat: row.lat,
    lng: row.lng,
  }
}

/** SSR용: 초기 뷰포트(강남구 zoom 15) 근처 레스토랑만 반환 */
export const getInitialRestaurants = createServerFn({ method: 'GET' }).handler(
  async () => {
    const db = (env as Cloudflare.Env).DB
    // DEFAULT_CENTER(37.4979, 127.0276) 기준 ±0.025 lat, ±0.03 lng (약 3km 반경)
    const { results } = await db
      .prepare(
        'SELECT name, address, link, recommendation, categories, region, lat, lng FROM restaurants WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?'
      )
      .bind(37.473, 37.523, 126.998, 127.058)
      .all<RestaurantRow>()

    return results.map(toRestaurant)
  }
)

/** 뷰포트 bounds 기반 레스토랑 반환 (30% 패딩 포함) */
export const getRestaurantsByBounds = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: {
      south: number
      north: number
      west: number
      east: number
    }) => data
  )
  .handler(async ({ data }) => {
    const db = (env as Cloudflare.Env).DB
    const latPad = (data.north - data.south) * 0.3
    const lngPad = (data.east - data.west) * 0.3
    const { results } = await db
      .prepare(
        'SELECT name, address, link, recommendation, categories, region, lat, lng FROM restaurants WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?'
      )
      .bind(
        data.south - latPad,
        data.north + latPad,
        data.west - lngPad,
        data.east + lngPad
      )
      .all<RestaurantRow>()

    return results.map(toRestaurant)
  })

/** 전체 카테고리 목록 (경량) */
export const getAllCategories = createServerFn({ method: 'GET' }).handler(
  async () => {
    const db = (env as Cloudflare.Env).DB
    const { results } = await db
      .prepare('SELECT DISTINCT categories FROM restaurants')
      .all<{ categories: string }>()
    const set = new Set<string>()
    results.forEach((r) =>
      JSON.parse(r.categories).forEach((c: string) => set.add(c))
    )
    return Array.from(set).sort()
  }
)
