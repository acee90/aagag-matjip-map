import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

interface RawRestaurant {
  name: string
  address: string
  link?: string
  recommendation?: string
  categories?: string[]
  lat?: number
  lng?: number
}

const DATA_DIR = join(import.meta.dir, '..', 'data')
const OUTPUT = join(import.meta.dir, 'seed-restaurants.sql')
const SKIP_FILES = new Set(['restaurants-all.json', 'restaurants.json'])

function escapeSQL(str: string): string {
  return str.replace(/'/g, "''")
}

async function main() {
  const files = (await readdir(DATA_DIR)).filter(
    (f) => f.endsWith('.json') && !SKIP_FILES.has(f)
  )

  const seen = new Set<string>()
  const rows: string[] = []

  for (const file of files) {
    const region = file.replace('.json', '')
    const raw = JSON.parse(await readFile(join(DATA_DIR, file), 'utf-8')) as RawRestaurant[]

    for (const r of raw) {
      if (!r.lat || !r.lng) continue
      const key = `${r.name}-${r.lat}-${r.lng}`
      if (seen.has(key)) continue
      seen.add(key)

      const name = escapeSQL(r.name)
      const address = escapeSQL(r.address)
      const link = escapeSQL(r.link ?? '')
      const recommendation = escapeSQL(r.recommendation ?? '')
      const categories = escapeSQL(JSON.stringify(r.categories ?? []))
      const regionEsc = escapeSQL(region)

      rows.push(
        `('${name}', '${address}', '${link}', '${recommendation}', '${categories}', '${regionEsc}', ${r.lat}, ${r.lng})`
      )
    }
  }

  // Use individual INSERT statements (D1 has strict statement size limits)
  const statements: string[] = ['DELETE FROM restaurants;']

  for (const row of rows) {
    statements.push(
      `INSERT INTO restaurants (name, address, link, recommendation, categories, region, lat, lng) VALUES ${row};`
    )
  }

  await writeFile(OUTPUT, statements.join('\n\n') + '\n')
  console.log(`Generated ${OUTPUT} with ${rows.length} restaurants`)
}

main().catch(console.error)
