import { useState, useCallback } from 'react'
import { DEFAULT_CENTER } from '@/lib/geo-utils'

interface GeolocationState {
  lat: number
  lng: number
  loading: boolean
  error: string | null
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    lat: DEFAULT_CENTER.lat,
    lng: DEFAULT_CENTER.lng,
    loading: false,
    error: null,
  })

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({ ...prev, error: '위치 서비스를 지원하지 않는 브라우저입니다.' }))
      return
    }

    setState((prev) => ({ ...prev, loading: true, error: null }))

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          loading: false,
          error: null,
        })
      },
      (err) => {
        setState((prev) => ({
          ...prev,
          loading: false,
          error:
            err.code === err.PERMISSION_DENIED
              ? '위치 권한이 거부되었습니다. 인천 중심부로 표시합니다.'
              : '위치를 가져올 수 없습니다.',
        }))
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }, [])

  return { ...state, requestLocation }
}
