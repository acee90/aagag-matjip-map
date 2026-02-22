import { useEffect, useRef } from 'react'
import type { Restaurant } from '@/types/restaurant'
import { RestaurantCard } from './RestaurantCard'
import { CategoryFilter } from './CategoryFilter'
import { getDistance } from '@/lib/geo-utils'
import { Mail, UtensilsCrossed } from 'lucide-react'

interface RestaurantListProps {
  restaurants: Restaurant[]
  categories: string[]
  selectedCategories: string[]
  onCategoriesChange: (categories: string[]) => void
  selectedRestaurant: Restaurant | null
  onSelectRestaurant: (restaurant: Restaurant) => void
  userLat?: number
  userLng?: number
}

export function RestaurantList({
  restaurants,
  categories,
  selectedCategories,
  onCategoriesChange,
  selectedRestaurant,
  onSelectRestaurant,
  userLat,
  userLng,
}: RestaurantListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Scroll to selected restaurant card
  useEffect(() => {
    if (!selectedRestaurant || !scrollContainerRef.current) return
    const el = scrollContainerRef.current.querySelector(
      `[data-restaurant="${selectedRestaurant.lat}-${selectedRestaurant.lng}"]`
    )
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selectedRestaurant])

  // Sort by distance if user location available
  const sorted = userLat && userLng
    ? [...restaurants].sort(
        (a, b) =>
          getDistance(userLat, userLng, a.lat, a.lng) -
          getDistance(userLat, userLng, b.lat, b.lng)
      )
    : restaurants

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b p-3">
        <div className="flex items-center gap-2 mb-2">
          <UtensilsCrossed className="size-4 text-orange-500" />
          <h2 className="font-semibold text-sm">
            맛집 목록
            <span className="ml-1.5 text-muted-foreground font-normal">
              {restaurants.length}개
            </span>
          </h2>
        </div>
        <CategoryFilter
          categories={categories}
          selected={selectedCategories}
          onChange={onCategoriesChange}
        />
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <UtensilsCrossed className="size-8 mb-2 opacity-50" />
            <p className="text-sm">이 영역에 맛집이 없습니다</p>
            <p className="text-xs mt-1">지도를 이동하거나 필터를 변경해보세요</p>
          </div>
        ) : (
          sorted.map((r) => (
            <RestaurantCard
              key={`${r.name}-${r.lat}-${r.lng}`}
              restaurant={r}
              isSelected={selectedRestaurant?.name === r.name && selectedRestaurant?.lat === r.lat}
              distance={
                userLat && userLng
                  ? getDistance(userLat, userLng, r.lat, r.lng)
                  : undefined
              }
              onClick={() => onSelectRestaurant(r)}
            />
          ))
        )}

        <div className="flex items-center justify-center gap-1.5 py-6 text-xs text-muted-foreground">
          <Mail className="size-3" />
          <a href="mailto:contact@matjip.site" className="hover:text-foreground transition-colors">
            contact@matjip.site
          </a>
        </div>
      </div>
    </div>
  )
}
