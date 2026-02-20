import { createServerFn } from '@tanstack/react-start'
import type { AddressReport } from '@/types/restaurant'

import { env } from 'cloudflare:workers'

export const submitReport = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      restaurantName: string
      restaurantAddress: string
      suggestedAddress: string
      comment: string
    }) => data
  )
  .handler(async ({ data }) => {
    const db = (env as Cloudflare.Env).DB
    await db
      .prepare(
        'INSERT INTO address_reports (restaurant_name, restaurant_address, suggested_address, comment) VALUES (?, ?, ?, ?)'
      )
      .bind(
        data.restaurantName,
        data.restaurantAddress,
        data.suggestedAddress,
        data.comment
      )
      .run()
    return { success: true }
  })

export const getReports = createServerFn({ method: 'GET' }).handler(
  async () => {
    const db = (env as Cloudflare.Env).DB
    const { results } = await db
      .prepare('SELECT * FROM address_reports ORDER BY created_at DESC')
      .all<AddressReport>()
    return results
  }
)
