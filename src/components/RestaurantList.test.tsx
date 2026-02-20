import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RestaurantList } from './RestaurantList'
import type { Restaurant } from '@/types/restaurant'

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

const restaurants: Restaurant[] = [
  makeRestaurant({ name: '가나다식당', lat: 37.51, lng: 127.01 }),
  makeRestaurant({ name: '라마바식당', lat: 37.52, lng: 127.02, categories: ['일식'] }),
  makeRestaurant({ name: '사아자식당', lat: 37.53, lng: 127.03, categories: ['중식'] }),
]

const categories = ['한식', '일식', '중식']

const defaultProps = {
  restaurants,
  categories,
  selectedCategories: [] as string[],
  onCategoriesChange: vi.fn(),
  selectedRestaurant: null as Restaurant | null,
  onSelectRestaurant: vi.fn(),
}

describe('RestaurantList', () => {
  it('맛집 목록 렌더링 및 개수 표시', () => {
    render(<RestaurantList {...defaultProps} />)

    expect(screen.getByText('가나다식당')).toBeDefined()
    expect(screen.getByText('라마바식당')).toBeDefined()
    expect(screen.getByText('사아자식당')).toBeDefined()
    expect(screen.getByText('3개')).toBeDefined()
  })

  it('빈 목록일 때 안내 메시지 표시', () => {
    render(<RestaurantList {...defaultProps} restaurants={[]} />)

    expect(screen.getByText('이 영역에 맛집이 없습니다')).toBeDefined()
  })

  it('카드 클릭 시 onSelectRestaurant 호출', () => {
    const onSelect = vi.fn()
    render(
      <RestaurantList {...defaultProps} onSelectRestaurant={onSelect} />
    )

    fireEvent.click(screen.getByText('라마바식당'))
    expect(onSelect).toHaveBeenCalledOnce()
    expect(onSelect).toHaveBeenCalledWith(restaurants[1])
  })

  it('선택된 맛집 카드에 data-restaurant 속성 존재', () => {
    const selected = restaurants[0]
    const { container } = render(
      <RestaurantList {...defaultProps} selectedRestaurant={selected} />
    )

    const el = container.querySelector(
      `[data-restaurant="${selected.lat}-${selected.lng}"]`
    )
    expect(el).not.toBeNull()
  })

  it('선택된 맛집 카드가 하이라이트 스타일 적용', () => {
    const selected = restaurants[1]
    const { container } = render(
      <RestaurantList {...defaultProps} selectedRestaurant={selected} />
    )

    const el = container.querySelector(
      `[data-restaurant="${selected.lat}-${selected.lng}"]`
    )
    expect(el?.className).toContain('border-orange-400')
  })

  it('선택된 맛집 변경 시 scrollIntoView 호출', () => {
    const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView')

    const { rerender } = render(
      <RestaurantList {...defaultProps} selectedRestaurant={restaurants[0]} />
    )

    scrollSpy.mockClear()

    rerender(
      <RestaurantList {...defaultProps} selectedRestaurant={restaurants[2]} />
    )

    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' })
    scrollSpy.mockRestore()
  })

  it('유저 위치 있을 때 거리순 정렬', () => {
    const farRestaurant = makeRestaurant({ name: '먼식당', lat: 35.0, lng: 129.0 })
    const nearRestaurant = makeRestaurant({ name: '가까운식당', lat: 37.501, lng: 127.001 })

    const { container } = render(
      <RestaurantList
        {...defaultProps}
        restaurants={[farRestaurant, nearRestaurant]}
        userLat={37.5}
        userLng={127.0}
      />
    )

    const cards = container.querySelectorAll('[data-restaurant]')
    // 가까운 식당이 먼저 나와야 함
    expect(cards[0].textContent).toContain('가까운식당')
    expect(cards[1].textContent).toContain('먼식당')
  })

  it('유저 위치 없을 때 원본 순서 유지', () => {
    const { container } = render(
      <RestaurantList {...defaultProps} />
    )

    const cards = container.querySelectorAll('[data-restaurant]')
    expect(cards[0].textContent).toContain('가나다식당')
    expect(cards[1].textContent).toContain('라마바식당')
    expect(cards[2].textContent).toContain('사아자식당')
  })
})
