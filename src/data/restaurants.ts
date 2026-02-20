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

/** 클라이언트용: 전체 레스토랑 반환 */
export const getRestaurants = createServerFn({ method: 'GET' }).handler(
  async () => {
    const db = (env as Cloudflare.Env).DB
    const { results } = await db
      .prepare('SELECT name, address, link, recommendation, categories, region, lat, lng FROM restaurants')
      .all<RestaurantRow>()

    return results.map(toRestaurant)
  }
)
