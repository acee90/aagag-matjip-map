import type { Restaurant } from '@/types/restaurant'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, X, MapPinned } from 'lucide-react'
import { useState } from 'react'
import { ReportDialog } from '@/components/ReportDialog'

interface MobileRestaurantDetailProps {
  restaurant: Restaurant
  onClose: () => void
}

export function MobileRestaurantDetail({
  restaurant,
  onClose,
}: MobileRestaurantDetailProps) {
  const [reportOpen, setReportOpen] = useState(false)

  return (
    <>
      <div className="absolute bottom-3 left-3 right-3 z-30 rounded-xl border bg-white shadow-lg md:hidden animate-in slide-in-from-bottom-4 duration-200">
        <div className="p-3">
          {/* Header: name + actions */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm leading-tight flex-1">
              {restaurant.name}
            </h3>
            <div className="flex items-center gap-1 shrink-0">
              <a
                href={restaurant.link}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 text-muted-foreground hover:text-orange-500 transition-colors"
                aria-label="네이버 지도에서 보기"
              >
                <ExternalLink className="size-4" />
              </a>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="닫기"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Address + report */}
          <div className="mt-1 flex items-center gap-1">
            <p className="text-xs text-muted-foreground line-clamp-1 flex-1">
              {restaurant.address}
            </p>
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="shrink-0 flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-orange-500 transition-colors"
              aria-label="지도 위치 다름 제보"
            >
              <MapPinned className="size-3" />
            </button>
          </div>

          {/* Recommendation */}
          {restaurant.recommendation && (
            <p className="mt-1.5 text-xs text-foreground/80 line-clamp-2">
              {restaurant.recommendation}
            </p>
          )}

          {/* Categories */}
          {restaurant.categories.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {restaurant.categories.map((cat) => (
                <Badge
                  key={cat}
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0"
                >
                  {cat}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        restaurantName={restaurant.name}
        restaurantAddress={restaurant.address}
      />
    </>
  )
}
