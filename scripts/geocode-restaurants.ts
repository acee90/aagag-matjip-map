import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

interface Restaurant {
  name: string
  address: string
  link: string
  recommendation: string
  categories: string[]
  lat?: number
  lng?: number
}

// Nominatim (OpenStreetMap) - free, no API key needed
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

async function geocode(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=kr`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'matjip-map-geocoder/1.0',
    },
  })

  if (!res.ok) {
    console.error(`  API error ${res.status}: ${res.statusText}`)
    return null
  }

  const data = await res.json()
  if (data.length > 0) {
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  }

  return null
}

// Fallback: try shorter address (remove building details)
async function geocodeWithFallback(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  // First try full address
  let result = await geocode(address)
  if (result) return result

  // Fallback: remove building/floor details (after last number)
  const simplified = address
    .replace(/\s+\d+층.*$/, '')
    .replace(/\s+[가-힣]+빌딩.*$/, '')
    .replace(/\s+[가-힣]+상가.*$/, '')
    .replace(/\s+\d+호.*$/, '')
    .trim()

  if (simplified !== address) {
    await sleep(1100) // Nominatim rate limit: 1 req/sec
    result = await geocode(simplified)
    if (result) return result
  }

  // Fallback: just district-level (e.g., "인천 부평구")
  const parts = address.split(' ')
  if (parts.length >= 2) {
    const district = parts.slice(0, 2).join(' ')
    await sleep(1100)
    result = await geocode(district)
    if (result) return result
  }

  return null
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const dataPath = resolve(import.meta.dir, '../data/인천.json')
  const raw = readFileSync(dataPath, 'utf-8')
  const restaurants: Restaurant[] = JSON.parse(raw)

  const failed: string[] = []
  let geocoded = 0
  let skipped = 0

  for (let i = 0; i < restaurants.length; i++) {
    const r = restaurants[i]

    if (r.lat && r.lng) {
      skipped++
      console.log(
        `[${i + 1}/${restaurants.length}] ⏭ ${r.name} (already geocoded)`
      )
      continue
    }

    console.log(`[${i + 1}/${restaurants.length}] 🔍 ${r.name}: ${r.address}`)

    const result = await geocodeWithFallback(r.address)
    if (result) {
      r.lat = result.lat
      r.lng = result.lng
      geocoded++
      console.log(`  ✅ ${result.lat}, ${result.lng}`)
    } else {
      failed.push(`${r.name}: ${r.address}`)
      console.log(`  ❌ Geocoding failed`)
    }

    // Nominatim rate limit: 1 request per second
    await sleep(1100)
  }

  writeFileSync(dataPath, JSON.stringify(restaurants, null, 2), 'utf-8')

  console.log('\n--- Summary ---')
  console.log(`Total: ${restaurants.length}`)
  console.log(`Geocoded: ${geocoded}`)
  console.log(`Skipped (already had coords): ${skipped}`)
  console.log(`Failed: ${failed.length}`)

  if (failed.length > 0) {
    console.log('\nFailed addresses (need manual correction):')
    failed.forEach((f) => console.log(`  - ${f}`))
  }
}

main().catch(console.error)
