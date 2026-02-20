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

export const fixReportLocation = createServerFn({ method: 'POST' })
  .inputValidator((data: { reportId: number }) => data)
  .handler(async ({ data }) => {
    const cfEnv = env as Cloudflare.Env
    const db = cfEnv.DB
    const ncpKeyId = cfEnv.VITE_NAVER_MAP_CLIENT_ID
    const ncpKey = cfEnv.NAVER_MAP_CLIENT_SECRET

    if (!ncpKeyId || !ncpKey) {
      throw new Error(
        `NCP 키 미설정: keyId=${ncpKeyId ? 'OK' : 'MISSING'}, secret=${ncpKey ? 'OK' : 'MISSING'}`
      )
    }

    // 1. 리포트 조회
    const report = await db
      .prepare('SELECT * FROM address_reports WHERE id = ?')
      .bind(data.reportId)
      .first<AddressReport>()
    if (!report) throw new Error('리포트를 찾을 수 없습니다.')

    // 2. 레스토랑 조회
    const restaurant = await db
      .prepare(
        'SELECT id, lat, lng FROM restaurants WHERE name = ? AND address = ?'
      )
      .bind(report.restaurant_name, report.restaurant_address)
      .first<{ id: number; lat: number; lng: number }>()
    if (!restaurant) throw new Error('해당 맛집을 찾을 수 없습니다.')

    // 3. NCP Geocoding API로 restaurant_address 재지오코딩
    //    (suggested_address는 "지도 위치 불일치" 등 설명 텍스트일 수 있음)
    const geocodeUrl = `https://maps.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(report.restaurant_address)}`
    const res = await fetch(geocodeUrl, {
      headers: {
        'x-ncp-apigw-api-key-id': ncpKeyId,
        'x-ncp-apigw-api-key': ncpKey,
        Accept: 'application/json',
      },
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Geocoding API 오류 ${res.status}: ${body.slice(0, 200)}`)
    }

    const geoData = (await res.json()) as {
      status: string
      addresses: Array<{ x: string; y: string }>
    }
    if (geoData.status !== 'OK' || !geoData.addresses?.length) {
      throw new Error('주소에 대한 좌표를 찾을 수 없습니다.')
    }

    const newLat = parseFloat(geoData.addresses[0].y)
    const newLng = parseFloat(geoData.addresses[0].x)
    if (isNaN(newLat) || isNaN(newLng) || newLat < 33 || newLat > 39) {
      throw new Error('유효하지 않은 좌표입니다.')
    }

    const prevLat = restaurant.lat
    const prevLng = restaurant.lng

    // 4. restaurants 좌표 업데이트
    await db
      .prepare('UPDATE restaurants SET lat = ?, lng = ? WHERE id = ?')
      .bind(newLat, newLng, restaurant.id)
      .run()

    // 5. 리포트 상태 → fixed
    await db
      .prepare("UPDATE address_reports SET status = 'fixed' WHERE id = ?")
      .bind(data.reportId)
      .run()

    return {
      success: true,
      prevLat,
      prevLng,
      newLat,
      newLng,
    }
  })
