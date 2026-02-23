import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { NavermapsProvider } from 'react-naver-maps'
import {
  getInitialRestaurants,
  getRestaurantsByBounds,
  getClustersByBounds,
  getRestaurantsNearby,
  getAllCategories,
} from '@/data/restaurants'
import { MapView } from '@/components/MapView'
import { SearchBar } from '@/components/SearchBar'
import { RestaurantList } from '@/components/RestaurantList'
import { MobileRestaurantDetail } from '@/components/MobileRestaurantDetail'
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
  getClusterCellBounds,
  CLUSTER_ZOOM_THRESHOLD,
  DEFAULT_ZOOM,
} from '@/lib/geo-utils'
import type { Restaurant, MapBounds, ClusterSummary } from '@/types/restaurant'
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
  const [clusters, setClusters] = useState<ClusterSummary[]>([])
  const [selectedCluster, setSelectedCluster] = useState<ClusterSummary | null>(null)
  const [clusterRestaurants, setClusterRestaurants] = useState<Restaurant[]>([])
  const [listRestaurants, setListRestaurants] = useState<Restaurant[]>([])
  const [listHasMore, setListHasMore] = useState(false)
  const [listOffset, setListOffset] = useState(0)
  const [listLoading, setListLoading] = useState(false)
  const [panTo, setPanTo] = useState<{ lat: number; lng: number; zoom?: number } | undefined>()

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

  const isClusterMode = currentZoom < CLUSTER_ZOOM_THRESHOLD

  // Abort controller for bounds-based fetch
  const listAbortRef = useRef<AbortController | null>(null)

  // Fetch map markers (bounds-based) and clusters
  useEffect(() => {
    if (!currentBounds) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    // Fetch restaurants for map markers
    getRestaurantsByBounds({
      data: currentBounds,
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) setBoundsRestaurants(data)
      })
      .catch((err) => {
        if (err.name !== 'AbortError')
          console.error('Failed to fetch restaurants by bounds:', err)
      })

    if (isClusterMode) {
      getClustersByBounds({
        data: { ...currentBounds, zoom: currentZoom },
        signal: controller.signal,
      })
        .then((data) => {
          if (!controller.signal.aborted) setClusters(data)
        })
        .catch((err) => {
          if (err.name !== 'AbortError')
            console.error('Failed to fetch clusters:', err)
        })
    }

    return () => controller.abort()
  }, [currentBounds, isClusterMode, currentZoom])

  // Reset list when bounds or categories change
  useEffect(() => {
    setListOffset(0)
    setListRestaurants([])
    setListHasMore(false)
  }, [currentBounds, selectedCategories])

  // Fetch list restaurants (distance-based, paginated)
  useEffect(() => {
    if (!currentBounds) return

    listAbortRef.current?.abort()
    const controller = new AbortController()
    listAbortRef.current = controller

    const centerLat = (currentBounds.north + currentBounds.south) / 2
    const centerLng = (currentBounds.east + currentBounds.west) / 2

    setListLoading(true)
    getRestaurantsNearby({
      data: {
        lat: centerLat,
        lng: centerLng,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        offset: listOffset,
      },
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) {
          setListRestaurants((prev) =>
            listOffset === 0 ? data.items : [...prev, ...data.items]
          )
          setListHasMore(data.hasMore)
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError')
          console.error('Failed to fetch nearby restaurants:', err)
      })
      .finally(() => {
        if (!controller.signal.aborted) setListLoading(false)
      })

    return () => controller.abort()
  }, [currentBounds, selectedCategories, listOffset])

  // Map markers: viewport-based with client-side category filter
  const categoryFiltered = useMemo(
    () => filterByCategories(boundsRestaurants, selectedCategories),
    [boundsRestaurants, selectedCategories]
  )

  // List panel: distance-based from entire DB (cluster mode uses cluster-specific fetch)
  const visibleRestaurants = useMemo(() => {
    if (isClusterMode && selectedCluster) {
      return filterByCategories(clusterRestaurants, selectedCategories)
    }
    return listRestaurants
  }, [listRestaurants, isClusterMode, selectedCluster, clusterRestaurants, selectedCategories])

  const handleBoundsChange = useCallback((bounds: MapBounds) => {
    setCurrentBounds(bounds)
  }, [])

  const handleZoomChange = useCallback((zoom: number) => {
    setCurrentZoom(zoom)
    // Clear cluster selection when switching to individual mode
    if (zoom >= CLUSTER_ZOOM_THRESHOLD) {
      setSelectedCluster(null)
      setClusterRestaurants([])
    }
  }, [])

  const handleSelectCluster = useCallback((cluster: ClusterSummary) => {
    setSelectedCluster(cluster)
    setMobileListOpen(true)
    // Fetch restaurants within this cluster's cell
    const cellBounds = getClusterCellBounds(cluster.lat, cluster.lng, currentZoom)
    getRestaurantsByBounds({ data: cellBounds })
      .then(setClusterRestaurants)
      .catch((err) => console.error('Failed to fetch cluster restaurants:', err))
  }, [currentZoom])

  const handleSelectRestaurant = useCallback((restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant)
  }, [])

  const handleSelectFromList = useCallback((restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant)
    setMobileListOpen(false)
  }, [])

  const handleLoadMore = useCallback(() => {
    setListOffset((prev) => prev + 20)
  }, [])

  const handleSearchSelect = useCallback((restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant)
    setPanTo({ lat: restaurant.lat, lng: restaurant.lng, zoom: CLUSTER_ZOOM_THRESHOLD })
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
            <header className="shrink-0 flex items-center gap-3 border-b bg-white px-4 py-2.5 z-20">
              <div className="flex items-center gap-2 shrink-0">
                <UtensilsCrossed className="size-5 text-orange-500" />
                <h1 className="font-bold text-base hidden sm:block">애객 맛집</h1>
              </div>
              <SearchBar onSelect={handleSearchSelect} />
              {/* Mobile list toggle */}
              <button
                className="flex items-center gap-1.5 rounded-lg bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-600 hover:bg-orange-100 transition-colors md:hidden"
                onClick={() => setMobileListOpen(true)}
              >
                <List className="size-4" />
                목록 {visibleRestaurants.length}
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
                  panTo={panTo}
                />
                {/* Mobile bottom card for selected restaurant */}
                {selectedRestaurant && (
                  <MobileRestaurantDetail
                    restaurant={selectedRestaurant}
                    onClose={() => setSelectedRestaurant(null)}
                  />
                )}
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
                  hasMore={listHasMore}
                  loading={listLoading}
                  onLoadMore={handleLoadMore}
                />
              </aside>
            </div>

            {/* Mobile bottom sheet */}
            <Sheet open={mobileListOpen} onOpenChange={setMobileListOpen}>
              <SheetContent side="bottom" className="h-[70dvh] md:hidden p-0" overlayClassName="md:hidden">
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
                  hasMore={listHasMore}
                  loading={listLoading}
                  onLoadMore={handleLoadMore}
                />
              </SheetContent>
            </Sheet>
          </div>
        </NavermapsProvider>
      )}
    </>
  )
}
