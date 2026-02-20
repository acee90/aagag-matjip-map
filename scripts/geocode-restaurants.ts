import { readFileSync, writeFileSync, readdirSync } from 'fs'
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
    headers: { 'User-Agent': 'matjip-map-geocoder/1.0' },
  })

  if (!res.ok) return null

  const data = await res.json()
  if (data.length > 0) {
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  }
  return null
}

async function geocodeWithFallback(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  let result = await geocode(address)
  if (result) return result

  const simplified = address
    .replace(/\s+\d+층.*$/, '')
    .replace(/\s+[가-힣]+빌딩.*$/, '')
    .replace(/\s+[가-힣]+상가.*$/, '')
    .replace(/\s+\d+호.*$/, '')
    .trim()

  if (simplified !== address) {
    await sleep(1100)
    result = await geocode(simplified)
    if (result) return result
  }

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

async function geocodeFile(filePath: string): Promise<{ geocoded: number; skipped: number; failed: string[] }> {
  const raw = readFileSync(filePath, 'utf-8')
  const restaurants: Restaurant[] = JSON.parse(raw)

  const failed: string[] = []
  let geocoded = 0
  let skipped = 0

  for (let i = 0; i < restaurants.length; i++) {
    const r = restaurants[i]

    if (r.lat && r.lng) {
      skipped++
      continue
    }

    console.log(`  [${i + 1}/${restaurants.length}] ${r.name}: ${r.address}`)

    const result = await geocodeWithFallback(r.address)
    if (result) {
      r.lat = result.lat
      r.lng = result.lng
      geocoded++
      console.log(`    OK ${result.lat}, ${result.lng}`)
    } else {
      failed.push(`${r.name}: ${r.address}`)
      console.log(`    FAIL`)
    }

    await sleep(1100)
  }

  writeFileSync(filePath, JSON.stringify(restaurants, null, 2), 'utf-8')
  return { geocoded, skipped, failed }
}

async function main() {
  const dataDir = resolve(import.meta.dir, '../data')
  const files = readdirSync(dataDir)
    .filter((f: string) => f.endsWith('.json') && f !== 'restaurants-all.json')
    .sort()

  let totalGeocoded = 0
  let totalSkipped = 0
  const allFailed: string[] = []
  const startTime = Date.now()

  for (const file of files) {
    const filePath = resolve(dataDir, file)
    const raw = readFileSync(filePath, 'utf-8')
    const data: Restaurant[] = JSON.parse(raw)
    const needsGeocode = data.some((r) => !r.lat || !r.lng)

    if (!needsGeocode) {
      totalSkipped += data.length
      console.log(`SKIP ${file} (${data.length})`)
      continue
    }

    const missing = data.filter((r) => !r.lat || !r.lng).length
    console.log(`\n>> ${file} (${missing}/${data.length})`)

    const result = await geocodeFile(filePath)
    totalGeocoded += result.geocoded
    totalSkipped += result.skipped
    allFailed.push(...result.failed.map((f) => `[${file}] ${f}`))

    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)
    console.log(`  DONE +${result.geocoded} fail=${result.failed.length} (${elapsed}min elapsed)`)
  }

  console.log('\n\n========== FINAL ==========')
  console.log(`Geocoded: ${totalGeocoded}`)
  console.log(`Skipped: ${totalSkipped}`)
  console.log(`Failed: ${allFailed.length}`)
  console.log(`Time: ${((Date.now() - startTime) / 1000 / 60).toFixed(1)}min`)

  if (allFailed.length > 0) {
    console.log('\nFailed:')
    allFailed.forEach((f) => console.log(`  - ${f}`))
  }
}

main().catch(console.error)
