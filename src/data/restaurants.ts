import { createServerFn } from '@tanstack/react-start'
import type { Restaurant } from '@/types/restaurant'
import rawData from '../../data/인천.json'

export const getRestaurants = createServerFn({ method: 'GET' }).handler(
  async () => {
    const restaurants = rawData as Restaurant[]
    // Only return restaurants with valid coordinates, deduplicated
    const seen = new Set<string>()
    return restaurants.filter((r) => {
      if (!r.lat || !r.lng) return false
      const key = `${r.name}-${r.lat}-${r.lng}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }
)
