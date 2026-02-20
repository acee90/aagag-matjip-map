import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo, useCallback, useEffect } from 'react'
import { NavermapsProvider } from 'react-naver-maps'
import { getRestaurants } from '@/data/restaurants'
import { MapView } from '@/components/MapView'
import { RestaurantList } from '@/components/RestaurantList'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { useGeolocation } from '@/hooks/useGeolocation'
import {
  filterByBounds,
  filterByCategories,
  extractCategories,
} from '@/lib/geo-utils'
import type { Restaurant, MapBounds } from '@/types/restaurant'
import { List, Search, UtensilsCrossed } from 'lucide-react'

export const Route = createFileRoute('/')({
  loader: () => getRestaurants(),
  component: App,
})

function App() {
  const allRestaurants = Route.useLoaderData()

  const [currentBounds, setCurrentBounds] = useState<MapBounds | null>(null)
  const [searchBounds, setSearchBounds] = useState<MapBounds | null>(null)
  const [mapMoved, setMapMoved] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null)
  const [mobileListOpen, setMobileListOpen] = useState(false)

  const { lat: userLat, lng: userLng, loading: locationLoading, located: userLocated, requestLocation } =
    useGeolocation()

  const allCategories = useMemo(
    () => extractCategories(allRestaurants),
    [allRestaurants]
  )

  // Apply filters: categories → searchBounds (only when user clicks search)
  const filteredRestaurants = useMemo(() => {
    let result = filterByCategories(allRestaurants, selectedCategories)
    if (searchBounds) {
      result = filterByBounds(result, searchBounds)
    }
    return result
  }, [allRestaurants, selectedCategories, searchBounds])

  const handleBoundsChange = useCallback((bounds: MapBounds) => {
    setCurrentBounds(bounds)
    setMapMoved(true)
  }, [])

  const handleSearchArea = useCallback(() => {
    if (currentBounds) {
      setSearchBounds(currentBounds)
      setMapMoved(false)
    }
  }, [currentBounds])

  const handleSelectRestaurant = useCallback((restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant)
  }, [])

  const handleSelectFromList = useCallback((restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant)
    setMobileListOpen(false)
  }, [])

  // Client-only rendering guard for NavermapsProvider
  const [isClient, setIsClient] = useState(false)
  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <UtensilsCrossed className="size-8 text-orange-500 animate-pulse" />
          <p className="text-sm text-muted-foreground">지도를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <NavermapsProvider ncpKeyId={import.meta.env.VITE_NAVER_MAP_CLIENT_ID}>
      <div className="flex h-dvh flex-col">
        {/* Header */}
        <header className="shrink-0 flex items-center justify-between border-b bg-white px-4 py-2.5 z-20">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="size-5 text-orange-500" />
            <h1 className="font-bold text-base">애객 맛집</h1>
          </div>
          {/* Mobile list toggle */}
          <button
            className="flex items-center gap-1.5 rounded-lg bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-600 hover:bg-orange-100 transition-colors md:hidden"
            onClick={() => setMobileListOpen(true)}
          >
            <List className="size-4" />
            목록 {filteredRestaurants.length}
          </button>
        </header>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Map */}
          <div className="flex-1 relative">
            <MapView
              restaurants={filteredRestaurants}
              selectedRestaurant={selectedRestaurant}
              onSelectRestaurant={handleSelectRestaurant}
              onBoundsChange={handleBoundsChange}
              locationLoading={locationLoading}
              onRequestLocation={requestLocation}
              userLat={userLat}
              userLng={userLng}
              userLocated={userLocated}
            />
            {/* Search this area button */}
            {mapMoved && (
              <button
                className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-lg border border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                onClick={handleSearchArea}
              >
                <Search className="size-4" />
                이 지역 검색
              </button>
            )}
          </div>

          {/* Desktop sidebar */}
          <aside className="hidden md:flex w-80 lg:w-96 shrink-0 border-l bg-white">
            <RestaurantList
              restaurants={filteredRestaurants}
              categories={allCategories}
              selectedCategories={selectedCategories}
              onCategoriesChange={setSelectedCategories}
              selectedRestaurant={selectedRestaurant}
              onSelectRestaurant={handleSelectFromList}
              userLat={userLat}
              userLng={userLng}
            />
          </aside>
        </div>

        {/* Mobile bottom sheet */}
        <Sheet open={mobileListOpen} onOpenChange={setMobileListOpen}>
          <SheetContent side="bottom" className="h-[70dvh] md:hidden p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>맛집 목록</SheetTitle>
              <SheetDescription>지도 영역 내 맛집 목록</SheetDescription>
            </SheetHeader>
            <RestaurantList
              restaurants={filteredRestaurants}
              categories={allCategories}
              selectedCategories={selectedCategories}
              onCategoriesChange={setSelectedCategories}
              selectedRestaurant={selectedRestaurant}
              onSelectRestaurant={handleSelectFromList}
              userLat={userLat}
              userLng={userLng}
            />
          </SheetContent>
        </Sheet>
      </div>
    </NavermapsProvider>
  )
}
