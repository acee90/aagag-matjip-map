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
        'SELECT name, address, link, recommendation, categories, region, lat, lng FROM restaurants WHERE deleted_at IS NULL AND lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?'
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
        'SELECT name, address, link, recommendation, categories, region, lat, lng FROM restaurants WHERE deleted_at IS NULL AND lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?'
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

/** 서버사이드 클러스터링: bounds+zoom 기반으로 {lat, lng, count}[] 반환 */
export const getClustersByBounds = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: { south: number; north: number; west: number; east: number; zoom: number }) => data
  )
  .handler(async ({ data }) => {
    const db = (env as Cloudflare.Env).DB
    const latPad = (data.north - data.south) * 0.3
    const lngPad = (data.east - data.west) * 0.3
    const cellSize = 360 / Math.pow(2, data.zoom)
    const { results } = await db
      .prepare(
        `SELECT
           CAST(FLOOR(lat / ?) AS INTEGER) AS cellY,
           CAST(FLOOR(lng / ?) AS INTEGER) AS cellX,
           AVG(lat) AS lat,
           AVG(lng) AS lng,
           COUNT(*) AS count
         FROM restaurants
         WHERE deleted_at IS NULL AND lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?
         GROUP BY cellY, cellX`
      )
      .bind(
        cellSize, cellSize,
        data.south - latPad, data.north + latPad,
        data.west - lngPad, data.east + lngPad
      )
      .all<{ cellY: number; cellX: number; lat: number; lng: number; count: number }>()
    return results.map((r) => ({ lat: r.lat, lng: r.lng, count: r.count }))
  })

/** 뷰포트 중심 기준 거리순 맛집 반환 (전체 DB, 카테고리 필터 포함, 페이지네이션) */
export const getRestaurantsNearby = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: { lat: number; lng: number; categories?: string[]; offset?: number }) => data
  )
  .handler(async ({ data }) => {
    const db = (env as Cloudflare.Env).DB
    const params: (string | number)[] = []
    const limit = 20
    const offset = data.offset ?? 0

    let sql =
      'SELECT name, address, link, recommendation, categories, region, lat, lng FROM restaurants WHERE deleted_at IS NULL'

    if (data.categories && data.categories.length > 0) {
      const placeholders = data.categories.map(() => '?').join(',')
      sql += ` AND EXISTS (SELECT 1 FROM json_each(categories) WHERE json_each.value IN (${placeholders}))`
      params.push(...data.categories)
    }

    // Fetch limit+1 to determine hasMore
    sql += ' ORDER BY ((lat - ?) * (lat - ?) + (lng - ?) * (lng - ?)) LIMIT ? OFFSET ?'
    params.push(data.lat, data.lat, data.lng, data.lng, limit + 1, offset)

    const { results } = await db
      .prepare(sql)
      .bind(...params)
      .all<RestaurantRow>()

    const hasMore = results.length > limit
    return {
      items: results.slice(0, limit).map(toRestaurant),
      hasMore,
    }
  })

/** 이름/주소 검색 (최대 20건) */
export const searchRestaurants = createServerFn({ method: 'GET' })
  .inputValidator((data: { query: string }) => data)
  .handler(async ({ data }) => {
    const q = data.query.trim()
    if (!q) return []
    const db = (env as Cloudflare.Env).DB
    const like = `%${q}%`
    const { results } = await db
      .prepare(
        'SELECT name, address, link, recommendation, categories, region, lat, lng FROM restaurants WHERE deleted_at IS NULL AND (name LIKE ? OR address LIKE ?) LIMIT 20'
      )
      .bind(like, like)
      .all<RestaurantRow>()
    return results.map(toRestaurant)
  })

/** 전체 카테고리 목록 (경량) */
export const getAllCategories = createServerFn({ method: 'GET' }).handler(
  async () => {
    const db = (env as Cloudflare.Env).DB
    const { results } = await db
      .prepare('SELECT DISTINCT categories FROM restaurants WHERE deleted_at IS NULL')
      .all<{ categories: string }>()
    const set = new Set<string>()
    results.forEach((r) =>
      JSON.parse(r.categories).forEach((c: string) => set.add(c))
    )
    return Array.from(set).sort()
  }
)
