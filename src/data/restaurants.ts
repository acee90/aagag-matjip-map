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

export const getRestaurants = createServerFn({ method: 'GET' }).handler(
  async () => {
    const db = (env as Cloudflare.Env).DB
    const { results } = await db
      .prepare('SELECT name, address, link, recommendation, categories, region, lat, lng FROM restaurants')
      .all<RestaurantRow>()

    return results.map((row): Restaurant => ({
      name: row.name,
      address: row.address,
      link: row.link,
      recommendation: row.recommendation,
      categories: JSON.parse(row.categories),
      region: row.region,
      lat: row.lat,
      lng: row.lng,
    }))
  }
)
