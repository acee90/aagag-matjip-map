import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  getRestaurantsByBounds,
  getClustersByBounds,
  getRestaurantsNearby,
  getAllCategories,
} from '@/data/restaurants'
import { useGeolocation } from '@/hooks/useGeolocation'
import {
  filterByCategories,
  getClusterCellBounds,
  CLUSTER_ZOOM_THRESHOLD,
  DEFAULT_ZOOM,
} from '@/lib/geo-utils'
import type { Restaurant, MapBounds, ClusterSummary } from '@/types/restaurant'

export interface MapPageState {
  // Data
  boundsRestaurants: Restaurant[]
  allCategories: string[]
  clusters: ClusterSummary[]
  clusterRestaurants: Restaurant[]
  listRestaurants: Restaurant[]
  categoryFiltered: Restaurant[]
  visibleRestaurants: Restaurant[]
  initialRestaurants: Restaurant[]

  // Selection
  selectedCategories: string[]
  setSelectedCategories: React.Dispatch<React.SetStateAction<string[]>>
  selectedRestaurant: Restaurant | null
  selectedCluster: ClusterSummary | null

  // UI state
  mobileListOpen: boolean
  setMobileListOpen: React.Dispatch<React.SetStateAction<boolean>>
  currentZoom: number
  isClusterMode: boolean
  listHasMore: boolean
  listLoading: boolean
  panTo: { lat: number; lng: number; zoom?: number } | undefined

  // Client/map readiness
  isClient: boolean
  mapReady: boolean
  mapLoading: boolean
  setMapReady: React.Dispatch<React.SetStateAction<boolean>>

  // Geolocation
  userLat: number
  userLng: number
  locationLoading: boolean
  userLocated: boolean
  initializing: boolean
  requestLocation: () => void

  // Handlers
  handleBoundsChange: (bounds: MapBounds) => void
  handleZoomChange: (zoom: number) => void
  handleSelectCluster: (cluster: ClusterSummary) => void
  handleSelectRestaurant: (restaurant: Restaurant) => void
  handleSelectFromList: (restaurant: Restaurant) => void
  handleLoadMore: () => void
  handleSearchSelect: (restaurant: Restaurant) => void
  clearSelectedRestaurant: () => void
}

export function useMapPage(initialRestaurants: Restaurant[]): MapPageState {
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
  const [selectedCluster, setSelectedCluster] =
    useState<ClusterSummary | null>(null)
  const [clusterRestaurants, setClusterRestaurants] = useState<Restaurant[]>([])
  const [listRestaurants, setListRestaurants] =
    useState<Restaurant[]>(initialRestaurants)
  const [listHasMore, setListHasMore] = useState(false)
  const [listOffset, setListOffset] = useState(0)
  const [listLoading, setListLoading] = useState(false)
  const [panTo, setPanTo] =
    useState<{ lat: number; lng: number; zoom?: number } | undefined>()

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

  // Abort controller for list fetch
  const listAbortRef = useRef<AbortController | null>(null)

  // Fetch map markers (bounds-based) and clusters
  useEffect(() => {
    if (!currentBounds) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

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
    if (!currentBounds) return
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
        categories:
          selectedCategories.length > 0 ? selectedCategories : undefined,
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
  }, [
    listRestaurants,
    isClusterMode,
    selectedCluster,
    clusterRestaurants,
    selectedCategories,
  ])

  const handleBoundsChange = useCallback((bounds: MapBounds) => {
    setCurrentBounds(bounds)
  }, [])

  const handleZoomChange = useCallback((zoom: number) => {
    setCurrentZoom(zoom)
    if (zoom >= CLUSTER_ZOOM_THRESHOLD) {
      setSelectedCluster(null)
      setClusterRestaurants([])
    }
  }, [])

  const handleSelectCluster = useCallback(
    (cluster: ClusterSummary) => {
      setSelectedCluster(cluster)
      setMobileListOpen(true)
      const cellBounds = getClusterCellBounds(
        cluster.lat,
        cluster.lng,
        currentZoom
      )
      getRestaurantsByBounds({ data: cellBounds })
        .then(setClusterRestaurants)
        .catch((err) =>
          console.error('Failed to fetch cluster restaurants:', err)
        )
    },
    [currentZoom]
  )

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
    setPanTo({
      lat: restaurant.lat,
      lng: restaurant.lng,
      zoom: CLUSTER_ZOOM_THRESHOLD,
    })
  }, [])

  const clearSelectedRestaurant = useCallback(() => {
    setSelectedRestaurant(null)
  }, [])

  // Client-only rendering guard for NavermapsProvider
  const [isClient, setIsClient] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  useEffect(() => {
    setIsClient(true)
  }, [])

  const mapLoading = !isClient || initializing || !mapReady

  return {
    // Data
    boundsRestaurants,
    allCategories,
    clusters,
    clusterRestaurants,
    listRestaurants,
    categoryFiltered,
    visibleRestaurants,
    initialRestaurants,

    // Selection
    selectedCategories,
    setSelectedCategories,
    selectedRestaurant,
    selectedCluster,

    // UI state
    mobileListOpen,
    setMobileListOpen,
    currentZoom,
    isClusterMode,
    listHasMore,
    listLoading,
    panTo,

    // Client/map readiness
    isClient,
    mapReady,
    mapLoading,
    setMapReady,

    // Geolocation
    userLat,
    userLng,
    locationLoading,
    userLocated,
    initializing,
    requestLocation,

    // Handlers
    handleBoundsChange,
    handleZoomChange,
    handleSelectCluster,
    handleSelectRestaurant,
    handleSelectFromList,
    handleLoadMore,
    handleSearchSelect,
    clearSelectedRestaurant,
  }
}
