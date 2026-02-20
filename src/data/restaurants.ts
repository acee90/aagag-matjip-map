import { createServerFn } from '@tanstack/react-start'
import type { Restaurant } from '@/types/restaurant'

// Import all region JSON files at build time
const modules = import.meta.glob('../../data/*.json', { eager: true }) as Record<
  string,
  { default: Array<Omit<Restaurant, 'region'> & { lat?: number; lng?: number }> }
>

export const getRestaurants = createServerFn({ method: 'GET' }).handler(
  async () => {
    const seen = new Set<string>()
    const restaurants: Restaurant[] = []

    for (const [path, mod] of Object.entries(modules)) {
      const filename = path.split('/').pop() ?? ''
      if (filename === 'restaurants-all.json' || filename === 'restaurants.json') continue

      const region = filename.replace('.json', '')
      const items = (mod.default ?? mod) as Array<Omit<Restaurant, 'region'> & { lat?: number; lng?: number }>

      for (const r of items) {
        if (!r.lat || !r.lng) continue
        const key = `${r.name}-${r.lat}-${r.lng}`
        if (seen.has(key)) continue
        seen.add(key)
        restaurants.push({ ...r, lat: r.lat, lng: r.lng, region })
      }
    }

    return restaurants
  }
)
