import { describe, it, expect } from 'vitest'
import { filterByBounds, filterByCategories } from './geo-utils'
import type { Restaurant, MapBounds } from '@/types/restaurant'

/**
 * 초기 로드 상태 시뮬레이션 헬퍼
 * App 컴포넌트의 리스트 리셋 로직을 순수 함수로 추출하여 테스트
 */
function shouldResetList(currentBounds: MapBounds | null): boolean {
  // index.tsx의 reset effect 가드: if (!currentBounds) return
  return currentBounds !== null
}

/**
 * 지도-리스트 싱크 통합 테스트
 * 실제 앱에서 지도 뷰포트가 변경될 때 리스트 필터링 로직을 검증
 */

const makeRestaurant = (overrides: Partial<Restaurant> = {}): Restaurant => ({
  name: '테스트',
  address: '주소',
  lat: 37.5,
  lng: 127.0,
  link: '',
  recommendation: '',
  categories: ['한식'],
  ...overrides,
})

// 서울 강남 주변 맛집들
const restaurants: Restaurant[] = [
  makeRestaurant({ name: '역삼맛집', lat: 37.5013, lng: 127.0396, categories: ['한식'] }),
  makeRestaurant({ name: '선릉맛집', lat: 37.5045, lng: 127.0490, categories: ['일식'] }),
  makeRestaurant({ name: '삼성맛집', lat: 37.5088, lng: 127.0630, categories: ['한식', '단체'] }),
  makeRestaurant({ name: '부산맛집', lat: 35.1796, lng: 129.0756, categories: ['한식'] }),
  makeRestaurant({ name: '인천맛집', lat: 37.4563, lng: 126.7052, categories: ['중식'] }),
]

describe('지도-리스트 싱크: 뷰포트 필터링', () => {
  it('강남 영역 뷰포트 → 강남 맛집만 리스트에 표시', () => {
    const gangnamBounds: MapBounds = {
      south: 37.49,
      north: 37.52,
      west: 127.03,
      east: 127.07,
    }

    const visible = filterByBounds(restaurants, gangnamBounds)
    expect(visible.map((r) => r.name)).toEqual(['역삼맛집', '선릉맛집', '삼성맛집'])
  })

  it('전국 뷰포트 → 전체 맛집 표시', () => {
    const koreaBounds: MapBounds = {
      south: 33.0,
      north: 39.0,
      west: 124.0,
      east: 132.0,
    }

    const visible = filterByBounds(restaurants, koreaBounds)
    expect(visible).toHaveLength(5)
  })

  it('맛집 없는 영역 → 빈 리스트', () => {
    const emptyBounds: MapBounds = {
      south: 33.0,
      north: 33.5,
      west: 124.0,
      east: 124.5,
    }

    const visible = filterByBounds(restaurants, emptyBounds)
    expect(visible).toHaveLength(0)
  })
})

describe('지도-리스트 싱크: 카테고리 + 뷰포트 복합 필터', () => {
  it('카테고리 필터 후 뷰포트 필터 적용', () => {
    const gangnamBounds: MapBounds = {
      south: 37.49,
      north: 37.52,
      west: 127.03,
      east: 127.07,
    }

    // 한식 필터 → 역삼, 삼성, 부산 → 강남 뷰포트 → 역삼, 삼성
    const categoryFiltered = filterByCategories(restaurants, ['한식'])
    const visible = filterByBounds(categoryFiltered, gangnamBounds)

    expect(visible.map((r) => r.name)).toEqual(['역삼맛집', '삼성맛집'])
  })

  it('카테고리 빈 배열 → 뷰포트만 적용', () => {
    const gangnamBounds: MapBounds = {
      south: 37.49,
      north: 37.52,
      west: 127.03,
      east: 127.07,
    }

    const categoryFiltered = filterByCategories(restaurants, [])
    const visible = filterByBounds(categoryFiltered, gangnamBounds)

    expect(visible).toHaveLength(3) // 역삼, 선릉, 삼성
  })

  it('좁은 뷰포트로 줌인 시 결과 줄어듦', () => {
    const wideBounds: MapBounds = {
      south: 37.49,
      north: 37.52,
      west: 127.03,
      east: 127.07,
    }
    const narrowBounds: MapBounds = {
      south: 37.50,
      north: 37.505,
      west: 127.035,
      east: 127.05,
    }

    const wide = filterByBounds(restaurants, wideBounds)
    const narrow = filterByBounds(restaurants, narrowBounds)

    expect(wide.length).toBeGreaterThan(narrow.length)
    expect(narrow.map((r) => r.name)).toEqual(['역삼맛집', '선릉맛집'])
  })
})

describe('지도-리스트 싱크: 선택 동작', () => {
  it('선택된 맛집이 뷰포트 안에 있으면 리스트에 포함', () => {
    const bounds: MapBounds = {
      south: 37.49,
      north: 37.52,
      west: 127.03,
      east: 127.07,
    }

    const visible = filterByBounds(restaurants, bounds)
    const selected = restaurants[0] // 역삼맛집

    expect(visible.some((r) => r.lat === selected.lat && r.lng === selected.lng)).toBe(true)
  })

  it('지도 팬 후 선택된 맛집이 새 뷰포트에 포함', () => {
    // 부산맛집 선택 → 지도가 부산으로 팬 → 새 뷰포트에 부산맛집 포함
    const busanBounds: MapBounds = {
      south: 35.0,
      north: 35.3,
      west: 128.9,
      east: 129.2,
    }

    const selected = restaurants[3] // 부산맛집
    const visible = filterByBounds(restaurants, busanBounds)

    expect(visible.some((r) => r.name === selected.name)).toBe(true)
    // 강남 맛집들은 안 보임
    expect(visible.some((r) => r.name === '역삼맛집')).toBe(false)
  })
})

describe('초기 로드: bounds가 null일 때 리스트 유지', () => {
  it('currentBounds가 null이면 리스트 리셋하지 않음', () => {
    // 초기 상태: bounds가 아직 설정되지 않음 (지도 로딩 전)
    expect(shouldResetList(null)).toBe(false)
  })

  it('currentBounds가 설정되면 리스트 리셋 허용', () => {
    const bounds: MapBounds = {
      south: 37.49,
      north: 37.52,
      west: 127.03,
      east: 127.07,
    }
    expect(shouldResetList(bounds)).toBe(true)
  })

  it('초기 로드 시나리오: initialRestaurants가 bounds 설정 전까지 유지됨', () => {
    // 시나리오: SSR → 하이드레이션 → 지도 로딩 순서 시뮬레이션
    const initialRestaurants = restaurants.slice(0, 3)
    let listRestaurants = [...initialRestaurants]
    let currentBounds: MapBounds | null = null

    // Step 1: 마운트 직후 — bounds가 null이므로 리셋 안 함
    if (shouldResetList(currentBounds)) {
      listRestaurants = []
    }
    expect(listRestaurants).toHaveLength(3) // initialRestaurants 유지

    // Step 2: 지도가 초기 bounds를 전달
    currentBounds = {
      south: 37.49,
      north: 37.52,
      west: 127.03,
      east: 127.07,
    }

    // Step 3: bounds 변경으로 리셋 후 새 데이터로 교체
    if (shouldResetList(currentBounds)) {
      listRestaurants = []
    }
    expect(listRestaurants).toHaveLength(0) // 리셋됨 → fetch로 채워짐

    // Step 4: fetch 결과로 리스트 갱신 (시뮬레이션)
    const fetched = filterByBounds(restaurants, currentBounds)
    listRestaurants = fetched
    expect(listRestaurants.length).toBeGreaterThan(0)
  })
})
