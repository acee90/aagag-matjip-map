import { describe, it, expect } from 'vitest'
import {
  getDistance,
  filterByBounds,
  filterByCategories,
  extractCategories,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
} from './geo-utils'
import type { Restaurant, MapBounds } from '@/types/restaurant'

// Test fixtures
const makeRestaurant = (overrides: Partial<Restaurant> = {}): Restaurant => ({
  name: '테스트 식당',
  address: '서울시 강남구',
  lat: 37.5,
  lng: 127.0,
  link: 'https://naver.me/test',
  recommendation: '맛있어요',
  categories: ['한식'],
  ...overrides,
})

describe('getDistance', () => {
  it('같은 좌표 → 0km', () => {
    expect(getDistance(37.5, 127.0, 37.5, 127.0)).toBe(0)
  })

  it('서울↔부산 거리 (~325km)', () => {
    // 서울시청 (37.5665, 126.978) ↔ 부산시청 (35.1796, 129.0756)
    const d = getDistance(37.5665, 126.978, 35.1796, 129.0756)
    expect(d).toBeGreaterThan(300)
    expect(d).toBeLessThan(350)
  })

  it('서울↔인천 거리 (~27km)', () => {
    // 서울시청 (37.5665, 126.978) ↔ 인천시청 (37.4563, 126.7052)
    const d = getDistance(37.5665, 126.978, 37.4563, 126.7052)
    expect(d).toBeGreaterThan(20)
    expect(d).toBeLessThan(35)
  })

  it('적도 위 경도 1도 ≈ 111km', () => {
    const d = getDistance(0, 0, 0, 1)
    expect(d).toBeGreaterThan(110)
    expect(d).toBeLessThan(112)
  })
})

describe('filterByBounds', () => {
  const bounds: MapBounds = {
    north: 38,
    south: 37,
    east: 128,
    west: 126,
  }

  it('범위 내 식당만 반환', () => {
    const restaurants = [
      makeRestaurant({ name: '안쪽', lat: 37.5, lng: 127.0 }),
      makeRestaurant({ name: '바깥', lat: 35.0, lng: 129.0 }),
    ]
    const result = filterByBounds(restaurants, bounds)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('안쪽')
  })

  it('경계값 포함', () => {
    const restaurants = [
      makeRestaurant({ lat: 38, lng: 128 }), // north-east corner
      makeRestaurant({ lat: 37, lng: 126 }), // south-west corner
    ]
    const result = filterByBounds(restaurants, bounds)
    expect(result).toHaveLength(2)
  })

  it('빈 배열 → 빈 배열', () => {
    expect(filterByBounds([], bounds)).toEqual([])
  })
})

describe('filterByCategories', () => {
  const restaurants = [
    makeRestaurant({ name: '한식집', categories: ['한식'] }),
    makeRestaurant({ name: '일식집', categories: ['일식'] }),
    makeRestaurant({ name: '한일식집', categories: ['한식', '일식'] }),
  ]

  it('빈 카테고리 → 전체 반환', () => {
    expect(filterByCategories(restaurants, [])).toHaveLength(3)
  })

  it('단일 카테고리 필터', () => {
    const result = filterByCategories(restaurants, ['한식'])
    expect(result).toHaveLength(2)
    expect(result.map((r) => r.name)).toContain('한식집')
    expect(result.map((r) => r.name)).toContain('한일식집')
  })

  it('다중 카테고리 필터 (OR 조건)', () => {
    const result = filterByCategories(restaurants, ['한식', '일식'])
    expect(result).toHaveLength(3)
  })

  it('매칭 없는 카테고리 → 빈 배열', () => {
    expect(filterByCategories(restaurants, ['중식'])).toHaveLength(0)
  })
})

describe('extractCategories', () => {
  it('중복 제거 및 정렬', () => {
    const restaurants = [
      makeRestaurant({ categories: ['일식', '한식'] }),
      makeRestaurant({ categories: ['한식', '중식'] }),
    ]
    expect(extractCategories(restaurants)).toEqual(['일식', '중식', '한식'])
  })

  it('빈 배열 → 빈 배열', () => {
    expect(extractCategories([])).toEqual([])
  })

  it('카테고리 없는 식당만', () => {
    const restaurants = [makeRestaurant({ categories: [] })]
    expect(extractCategories(restaurants)).toEqual([])
  })
})

describe('constants', () => {
  it('DEFAULT_CENTER는 강남구 좌표', () => {
    expect(DEFAULT_CENTER.lat).toBe(37.4979)
    expect(DEFAULT_CENTER.lng).toBe(127.0276)
  })

  it('DEFAULT_ZOOM은 16', () => {
    expect(DEFAULT_ZOOM).toBe(16)
  })
})
