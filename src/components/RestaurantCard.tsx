import type { Restaurant } from '@/types/restaurant'
import { Badge } from '@/components/ui/badge'
import { ExternalLink } from 'lucide-react'

interface RestaurantCardProps {
  restaurant: Restaurant
  isSelected: boolean
  distance?: number
  onClick: () => void
}

export function RestaurantCard({
  restaurant,
  isSelected,
  distance,
  onClick,
}: RestaurantCardProps) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-lg border p-3 transition-all hover:shadow-md ${
        isSelected
          ? 'border-orange-400 bg-orange-50 shadow-md'
          : 'border-border bg-card hover:border-orange-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-sm text-foreground leading-tight">
          {restaurant.name}
        </h3>
        <a
          href={restaurant.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 text-muted-foreground hover:text-orange-500 transition-colors"
          aria-label="네이버 지도에서 보기"
        >
          <ExternalLink className="size-4" />
        </a>
      </div>

      <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
        {restaurant.address}
      </p>

      {restaurant.recommendation && (
        <p className="mt-1.5 text-xs text-foreground/80 line-clamp-2">
          {restaurant.recommendation}
        </p>
      )}

      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        {restaurant.categories.map((cat) => (
          <Badge
            key={cat}
            variant="secondary"
            className="text-[10px] px-1.5 py-0"
          >
            {cat}
          </Badge>
        ))}
        {distance !== undefined && (
          <span className="ml-auto text-[10px] text-muted-foreground">
            {distance < 1
              ? `${Math.round(distance * 1000)}m`
              : `${distance.toFixed(1)}km`}
          </span>
        )}
      </div>
    </div>
  )
}
