import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock cloudflare:workers-dependent module
vi.mock('@/data/reports', () => ({
  submitReport: vi.fn(),
}))

import { RestaurantCard } from './RestaurantCard'
import type { Restaurant } from '@/types/restaurant'

const baseRestaurant: Restaurant = {
  name: '맛있는 식당',
  address: '서울시 강남구 역삼동 123',
  lat: 37.5,
  lng: 127.0,
  link: 'https://naver.me/test',
  recommendation: '여기 정말 맛있어요!',
  categories: ['한식', '분식'],
}

describe('RestaurantCard', () => {
  it('식당 정보 렌더링', () => {
    render(
      <RestaurantCard
        restaurant={baseRestaurant}
        isSelected={false}
        onClick={() => {}}
      />
    )

    expect(screen.getByText('맛있는 식당')).toBeDefined()
    expect(screen.getByText('서울시 강남구 역삼동 123')).toBeDefined()
    expect(screen.getByText('여기 정말 맛있어요!')).toBeDefined()
    expect(screen.getByText('한식')).toBeDefined()
    expect(screen.getByText('분식')).toBeDefined()
  })

  it('추천글 없으면 미표시', () => {
    const restaurant = { ...baseRestaurant, recommendation: '' }
    const { container } = render(
      <RestaurantCard
        restaurant={restaurant}
        isSelected={false}
        onClick={() => {}}
      />
    )

    // recommendation paragraph should not exist
    const paragraphs = container.querySelectorAll('p')
    const texts = Array.from(paragraphs).map((p) => p.textContent)
    expect(texts).not.toContain('')
  })

  it('거리 < 1km → 미터 표시', () => {
    render(
      <RestaurantCard
        restaurant={baseRestaurant}
        isSelected={false}
        distance={0.5}
        onClick={() => {}}
      />
    )

    expect(screen.getByText('500m')).toBeDefined()
  })

  it('거리 >= 1km → km 표시', () => {
    render(
      <RestaurantCard
        restaurant={baseRestaurant}
        isSelected={false}
        distance={3.7}
        onClick={() => {}}
      />
    )

    expect(screen.getByText('3.7km')).toBeDefined()
  })

  it('거리 미제공 시 거리 미표시', () => {
    const { container } = render(
      <RestaurantCard
        restaurant={baseRestaurant}
        isSelected={false}
        onClick={() => {}}
      />
    )

    const spans = container.querySelectorAll('span')
    const hasDistance = Array.from(spans).some(
      (s) => s.textContent?.includes('km') || s.textContent?.includes('m')
    )
    expect(hasDistance).toBe(false)
  })

  it('선택 상태 스타일링', () => {
    const { container } = render(
      <RestaurantCard
        restaurant={baseRestaurant}
        isSelected={true}
        onClick={() => {}}
      />
    )

    const card = container.firstElementChild as HTMLElement
    expect(card.className).toContain('border-orange-400')
  })

  it('미선택 상태 스타일링', () => {
    const { container } = render(
      <RestaurantCard
        restaurant={baseRestaurant}
        isSelected={false}
        onClick={() => {}}
      />
    )

    const card = container.firstElementChild as HTMLElement
    expect(card.className).not.toContain('border-orange-400')
  })

  it('카드 클릭 시 onClick 호출', () => {
    const onClick = vi.fn()
    const { container } = render(
      <RestaurantCard
        restaurant={baseRestaurant}
        isSelected={false}
        onClick={onClick}
      />
    )

    fireEvent.click(container.firstElementChild as HTMLElement)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('외부 링크 클릭 시 카드 onClick 미호출', () => {
    const onClick = vi.fn()
    render(
      <RestaurantCard
        restaurant={baseRestaurant}
        isSelected={false}
        onClick={onClick}
      />
    )

    const link = screen.getByLabelText('네이버 지도에서 보기')
    fireEvent.click(link)
    // stopPropagation prevents card onClick
    expect(onClick).not.toHaveBeenCalled()
  })

  it('외부 링크의 href와 target 확인', () => {
    render(
      <RestaurantCard
        restaurant={baseRestaurant}
        isSelected={false}
        onClick={() => {}}
      />
    )

    const link = screen.getByLabelText('네이버 지도에서 보기')
    expect(link.getAttribute('href')).toBe('https://naver.me/test')
    expect(link.getAttribute('target')).toBe('_blank')
  })
})
