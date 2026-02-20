import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGeolocation } from './useGeolocation'
import { DEFAULT_CENTER } from '@/lib/geo-utils'

const mockGetCurrentPosition = vi.fn()
const mockPermissionsQuery = vi.fn()

beforeEach(() => {
  vi.restoreAllMocks()
  // Default: geolocation supported, permissions API available
  Object.defineProperty(navigator, 'geolocation', {
    value: { getCurrentPosition: mockGetCurrentPosition },
    writable: true,
    configurable: true,
  })
  Object.defineProperty(navigator, 'permissions', {
    value: { query: mockPermissionsQuery },
    writable: true,
    configurable: true,
  })
  // Default: permission is 'prompt' (not granted) → initializing resolves immediately
  mockPermissionsQuery.mockResolvedValue({ state: 'prompt' })
})

describe('useGeolocation', () => {
  it('초기 상태: DEFAULT_CENTER, loading=false (auto-request 없음)', async () => {
    const { result } = renderHook(() => useGeolocation())

    expect(result.current.lat).toBe(DEFAULT_CENTER.lat)
    expect(result.current.lng).toBe(DEFAULT_CENTER.lng)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.located).toBe(false)
  })

  it('권한 granted → 자동으로 위치 획득', async () => {
    mockPermissionsQuery.mockResolvedValue({ state: 'granted' })
    mockGetCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 37.5665, longitude: 126.978 } })
    })

    const { result } = renderHook(() => useGeolocation())

    // Wait for permissions check + geolocation
    await vi.waitFor(() => {
      expect(result.current.located).toBe(true)
    })

    expect(result.current.lat).toBe(37.5665)
    expect(result.current.lng).toBe(126.978)
    expect(result.current.loading).toBe(false)
    expect(result.current.initializing).toBe(false)
  })

  it('권한 prompt → 위치 요청 안함, initializing=false', async () => {
    mockPermissionsQuery.mockResolvedValue({ state: 'prompt' })

    const { result } = renderHook(() => useGeolocation())

    await vi.waitFor(() => {
      expect(result.current.initializing).toBe(false)
    })

    expect(result.current.located).toBe(false)
    expect(mockGetCurrentPosition).not.toHaveBeenCalled()
  })

  it('requestLocation 호출 → 위치 성공', () => {
    mockGetCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 37.0, longitude: 127.0 } })
    })

    const { result } = renderHook(() => useGeolocation())

    act(() => {
      result.current.requestLocation()
    })

    expect(result.current.lat).toBe(37.0)
    expect(result.current.lng).toBe(127.0)
    expect(result.current.located).toBe(true)
    expect(result.current.loading).toBe(false)
  })

  it('requestLocation 권한 거부 → error 메시지', () => {
    mockGetCurrentPosition.mockImplementation((_success, error) => {
      error({ code: 1, PERMISSION_DENIED: 1 })
    })

    const { result } = renderHook(() => useGeolocation())

    act(() => {
      result.current.requestLocation()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.located).toBe(false)
    expect(result.current.error).toBe('위치 권한이 거부되었습니다.')
  })

  it('미지원 브라우저 → requestLocation에서 에러', () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      writable: true,
      configurable: true,
    })

    const { result } = renderHook(() => useGeolocation())

    act(() => {
      result.current.requestLocation()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe('위치 서비스를 지원하지 않는 브라우저입니다.')
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

    act(() => {
      result.current.requestLocation()
    })
    expect(result.current.located).toBe(true)

    act(() => {
      result.current.requestLocation()
    })
    expect(result.current.loading).toBe(true)
  })
})
