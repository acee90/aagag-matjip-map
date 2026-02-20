import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGeolocation } from './useGeolocation'
import { DEFAULT_CENTER } from '@/lib/geo-utils'

const mockGetCurrentPosition = vi.fn()

beforeEach(() => {
  vi.restoreAllMocks()
  // Default: geolocation supported
  Object.defineProperty(navigator, 'geolocation', {
    value: { getCurrentPosition: mockGetCurrentPosition },
    writable: true,
    configurable: true,
  })
})

describe('useGeolocation', () => {
  it('초기 상태: DEFAULT_CENTER, loading=true', () => {
    mockGetCurrentPosition.mockImplementation(() => {
      // never resolves
    })

    const { result } = renderHook(() => useGeolocation())

    expect(result.current.lat).toBe(DEFAULT_CENTER.lat)
    expect(result.current.lng).toBe(DEFAULT_CENTER.lng)
    expect(result.current.loading).toBe(true)
    expect(result.current.error).toBeNull()
    expect(result.current.located).toBe(false)
  })

  it('위치 성공 → lat/lng 업데이트, located=true', async () => {
    mockGetCurrentPosition.mockImplementation((success) => {
      success({
        coords: { latitude: 37.5665, longitude: 126.978 },
      })
    })

    const { result } = renderHook(() => useGeolocation())

    expect(result.current.lat).toBe(37.5665)
    expect(result.current.lng).toBe(126.978)
    expect(result.current.loading).toBe(false)
    expect(result.current.located).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('권한 거부 → error 메시지', () => {
    mockGetCurrentPosition.mockImplementation((_success, error) => {
      error({
        code: 1,
        PERMISSION_DENIED: 1,
      })
    })

    const { result } = renderHook(() => useGeolocation())

    expect(result.current.loading).toBe(false)
    expect(result.current.located).toBe(false)
    expect(result.current.error).toBe('위치 권한이 거부되었습니다.')
  })

  it('타임아웃 → 일반 에러 메시지', () => {
    mockGetCurrentPosition.mockImplementation((_success, error) => {
      error({
        code: 3,
        PERMISSION_DENIED: 1,
        TIMEOUT: 3,
      })
    })

    const { result } = renderHook(() => useGeolocation())

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe('위치를 가져올 수 없습니다.')
  })

  it('미지원 브라우저 → 지원 안됨 에러', () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      writable: true,
      configurable: true,
    })

    const { result } = renderHook(() => useGeolocation())

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe(
      '위치 서비스를 지원하지 않는 브라우저입니다.'
    )
  })

  it('requestLocation 재호출 시 loading 재설정', () => {
    let callCount = 0
    mockGetCurrentPosition.mockImplementation((success) => {
      callCount++
      if (callCount === 1) {
        success({ coords: { latitude: 37.0, longitude: 127.0 } })
      }
      // second call: pending
    })

    const { result } = renderHook(() => useGeolocation())

    expect(result.current.located).toBe(true)

    act(() => {
      result.current.requestLocation()
    })

    expect(result.current.loading).toBe(true)
  })
})
