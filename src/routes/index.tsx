import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { NavermapsProvider } from 'react-naver-maps'
import {
  getInitialRestaurants,
  getRestaurantsByBounds,
  getAllCategories,
} from '@/data/restaurants'
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
  filterByCategories,
  clusterRestaurants,
  CLUSTER_ZOOM_THRESHOLD,
  DEFAULT_ZOOM,
} from '@/lib/geo-utils'
import type { Restaurant, MapBounds, Cluster } from '@/types/restaurant'
import { List, UtensilsCrossed } from 'lucide-react'

export const Route = createFileRoute('/')({
  loader: () => getInitialRestaurants(),
  component: App,
})

function App() {
  const initialRestaurants = Route.useLoaderData()
  const [boundsRestaurants, setBoundsRestaurants] =
    useState<Restaurant[]>(initialRestaurants)
  const [allCategories, setAllCategories] = useState<string[]>([])

  const [currentBounds, setCurrentBounds] = useState<MapBounds | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null)
  const [mobileListOpen, setMobileListOpen] = useState(false)
  const [currentZoom, setCurrentZoom] = useState(DEFAULT_ZOOM)
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null)

  const {
    lat: userLat,
    lng: userLng,
    loading: locationLoading,
    located: userLocated,
    initializing,
    requestLocation,
  } = useGeolocation()

  // Fetch all categories once on mount
  useEffect(() => {
    getAllCategories().then(setAllCategories)
  }, [])

  // Abort controller for bounds-based fetch
  const abortRef = useRef<AbortController | null>(null)

  // Fetch restaurants by bounds
  useEffect(() => {
    if (!currentBounds) return

    // Cancel previous in-flight request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    getRestaurantsByBounds({
      data: currentBounds,
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) {
          setBoundsRestaurants(data)
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Failed to fetch restaurants by bounds:', err)
        }
      })

    return () => controller.abort()
  }, [currentBounds])

  // Category filter (client-side on bounds data)
  const categoryFiltered = useMemo(
    () => filterByCategories(boundsRestaurants, selectedCategories),
    [boundsRestaurants, selectedCategories]
  )

  const isClusterMode = currentZoom < CLUSTER_ZOOM_THRESHOLD

  // Clusters for low zoom levels
  const clusters = useMemo(
    () =>
      isClusterMode ? clusterRestaurants(categoryFiltered, currentZoom) : [],
    [categoryFiltered, currentZoom, isClusterMode]
  )

  // Visible restaurants for list panel
  const visibleRestaurants = useMemo(() => {
    if (isClusterMode) {
      return selectedCluster ? selectedCluster.restaurants : []
    }
    return categoryFiltered
  }, [categoryFiltered, isClusterMode, selectedCluster])

  const handleBoundsChange = useCallback((bounds: MapBounds) => {
    setCurrentBounds(bounds)
  }, [])

  const handleZoomChange = useCallback((zoom: number) => {
    setCurrentZoom(zoom)
    // Clear cluster selection when switching to individual mode
    if (zoom >= CLUSTER_ZOOM_THRESHOLD) {
      setSelectedCluster(null)
    }
  }, [])

  const handleSelectCluster = useCallback((cluster: Cluster) => {
    setSelectedCluster(cluster)
    setMobileListOpen(true)
  }, [])

  const handleSelectRestaurant = useCallback((restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant)
  }, [])

  const handleSelectFromList = useCallback((restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant)
    setMobileListOpen(false)
  }, [])

  // Client-only rendering guard for NavermapsProvider
  const [isClient, setIsClient] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  useEffect(() => {
    setIsClient(true)
  }, [])

  const showLoading = !isClient || initializing || !mapReady

  return (
    <>
      {showLoading && (
        <div className="fixed inset-0 z-50 flex h-dvh items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3">
            <UtensilsCrossed className="size-8 text-orange-500 animate-pulse" />
            <p className="text-sm text-muted-foreground">
              지도를 불러오는 중...
            </p>
          </div>
        </div>
      )}

      {isClient && !initializing && (
        <NavermapsProvider
          ncpKeyId={import.meta.env.VITE_NAVER_MAP_CLIENT_ID}
        >
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
                목록{' '}
                {isClusterMode && !selectedCluster
                  ? categoryFiltered.length
                  : visibleRestaurants.length}
              </button>
            </header>

            {/* Main content */}
            <div className="flex flex-1 overflow-hidden">
              {/* Map */}
              <div className="flex-1 relative">
                <MapView
                  restaurants={categoryFiltered}
                  clusters={clusters}
                  currentZoom={currentZoom}
                  selectedRestaurant={selectedRestaurant}
                  selectedCluster={selectedCluster}
                  onSelectRestaurant={handleSelectRestaurant}
                  onSelectCluster={handleSelectCluster}
                  onBoundsChange={handleBoundsChange}
                  onZoomChange={handleZoomChange}
                  locationLoading={locationLoading}
                  onRequestLocation={requestLocation}
                  userLat={userLat}
                  userLng={userLng}
                  userLocated={userLocated}
                  onMapReady={() => setMapReady(true)}
                />
              </div>

              {/* Desktop sidebar */}
              <aside className="hidden md:flex w-80 lg:w-96 shrink-0 border-l bg-white">
                <RestaurantList
                  restaurants={visibleRestaurants}
                  categories={allCategories}
                  selectedCategories={selectedCategories}
                  onCategoriesChange={setSelectedCategories}
                  selectedRestaurant={selectedRestaurant}
                  onSelectRestaurant={handleSelectFromList}
                  userLat={userLat}
                  userLng={userLng}
                  clusterMode={isClusterMode}
                  totalCount={categoryFiltered.length}
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
                  restaurants={visibleRestaurants}
                  categories={allCategories}
                  selectedCategories={selectedCategories}
                  onCategoriesChange={setSelectedCategories}
                  selectedRestaurant={selectedRestaurant}
                  onSelectRestaurant={handleSelectFromList}
                  userLat={userLat}
                  userLng={userLng}
                  clusterMode={isClusterMode}
                  totalCount={categoryFiltered.length}
                />
              </SheetContent>
            </Sheet>
          </div>
        </NavermapsProvider>
      )}
    </>
  )
}
