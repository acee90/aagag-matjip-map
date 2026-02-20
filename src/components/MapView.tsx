import { useCallback, useState, useEffect, useRef, useMemo } from 'react'
import {
  Container,
  NaverMap,
  Marker,
  useNavermaps,
} from 'react-naver-maps'
import type { Restaurant, MapBounds, Cluster } from '@/types/restaurant'
import { DEFAULT_CENTER, DEFAULT_ZOOM, CLUSTER_ZOOM_THRESHOLD } from '@/lib/geo-utils'
import { MyLocationButton } from './MyLocationButton'

interface MapViewProps {
  restaurants: Restaurant[]
  clusters: Cluster[]
  currentZoom: number
  selectedRestaurant: Restaurant | null
  selectedCluster: Cluster | null
  onSelectRestaurant: (restaurant: Restaurant) => void
  onSelectCluster: (cluster: Cluster) => void
  onBoundsChange: (bounds: MapBounds) => void
  onZoomChange: (zoom: number) => void
  locationLoading: boolean
  onRequestLocation: () => void
  userLat?: number
  userLng?: number
  userLocated?: boolean
  onMapReady?: () => void
}

function MapContent({
  restaurants,
  clusters,
  currentZoom,
  selectedRestaurant,
  selectedCluster,
  onSelectRestaurant,
  onSelectCluster,
  onBoundsChange,
  onZoomChange,
  locationLoading,
  onRequestLocation,
  userLat,
  userLng,
  userLocated,
  onMapReady,
}: MapViewProps) {
  const navermaps = useNavermaps()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [map, setMap] = useState<any>(null)
  const manualPan = useRef(false)

  // Notify parent when map is initialized
  useEffect(() => {
    if (map && onMapReady) onMapReady()
  }, [map, onMapReady])

  // Pan only on manual request (MyLocationButton)
  useEffect(() => {
    if (map && userLocated && userLat && userLng && manualPan.current) {
      manualPan.current = false
      map.panTo(new navermaps.LatLng(userLat, userLng), { duration: 200 })
    }
  }, [map, userLocated, userLat, userLng, navermaps])

  // Pan to selected restaurant
  useEffect(() => {
    if (map && selectedRestaurant) {
      map.panTo(new navermaps.LatLng(selectedRestaurant.lat, selectedRestaurant.lng), { duration: 200 })
    }
  }, [map, selectedRestaurant, navermaps])

  const boundsTimer = useRef<ReturnType<typeof setTimeout>>(null)

  const handleBoundsChanged = useMemo(
    () =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (bounds: any) => {
        if (!bounds) return
        if (boundsTimer.current) clearTimeout(boundsTimer.current)
        boundsTimer.current = setTimeout(() => {
          const sw = bounds.getSW()
          const ne = bounds.getNE()
          onBoundsChange({
            south: sw.lat(),
            north: ne.lat(),
            west: sw.lng(),
            east: ne.lng(),
          })
        }, 200)
      },
    [onBoundsChange]
  )

  const handleLocationClick = useCallback(() => {
    manualPan.current = true
    onRequestLocation()
  }, [onRequestLocation])

  const handleZoomChanged = useCallback(
    (zoom: number) => {
      onZoomChange(zoom)
    },
    [onZoomChange]
  )

  const isClusterMode = currentZoom < CLUSTER_ZOOM_THRESHOLD

  // Use user location as initial center if available at render time, otherwise DEFAULT_CENTER
  const initialCenter = userLocated && userLat && userLng
    ? new navermaps.LatLng(userLat, userLng)
    : new navermaps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng)

  return (
    <div className="relative h-full w-full">
      <Container style={{ width: '100%', height: '100%' }}>
        <NaverMap
          defaultCenter={initialCenter}
          defaultZoom={DEFAULT_ZOOM}
          ref={setMap}
          onBoundsChanged={handleBoundsChanged}
          onZoomChanged={handleZoomChanged}
          zoomControl
          zoomControlOptions={{
            position: navermaps.Position.TOP_RIGHT,
          }}
        >
          {isClusterMode
            ? clusters.map((cluster) => {
                const isSelected =
                  selectedCluster?.lat === cluster.lat &&
                  selectedCluster?.lng === cluster.lng

                return (
                  <Marker
                    key={`cluster-${cluster.lat}-${cluster.lng}`}
                    position={new navermaps.LatLng(cluster.lat, cluster.lng)}
                    onClick={() => onSelectCluster(cluster)}
                    icon={{
                      content: `<div style="
                        background: ${isSelected ? '#fff' : '#f97316'};
                        color: ${isSelected ? '#f97316' : '#fff'};
                        border: 3px solid ${isSelected ? '#f97316' : '#ea580c'};
                        border-radius: 50%;
                        width: ${Math.min(24 + cluster.count * 2, 56)}px;
                        height: ${Math.min(24 + cluster.count * 2, 56)}px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: ${cluster.count >= 100 ? 11 : 13}px;
                        font-weight: 700;
                        box-shadow: 0 2px 8px ${isSelected ? 'rgba(249,115,22,0.6)' : 'rgba(249,115,22,0.4)'};
                        transform: translate(-50%, -50%);
                      ">${cluster.count}</div>`,
                      anchor: new navermaps.Point(0, 0),
                    }}
                    zIndex={isSelected ? 1000 : cluster.count}
                  />
                )
              })
            : restaurants.map((r) => {
                const isSelected =
                  selectedRestaurant?.name === r.name &&
                  selectedRestaurant?.lat === r.lat

                return (
                  <Marker
                    key={`${r.name}-${r.lat}-${r.lng}`}
                    position={new navermaps.LatLng(r.lat, r.lng)}
                    onClick={() => onSelectRestaurant(r)}
                    icon={{
                      content: `<div style="
                        background: ${isSelected ? '#f97316' : '#fff'};
                        color: ${isSelected ? '#fff' : '#333'};
                        border: 2px solid ${isSelected ? '#ea580c' : '#f97316'};
                        border-radius: 20px;
                        padding: 4px 8px;
                        font-size: 11px;
                        font-weight: 600;
                        white-space: nowrap;
                        box-shadow: 0 2px 6px rgba(0,0,0,0.15);
                        transform: translate(-50%, -100%);
                      ">${r.name}</div>`,
                      anchor: new navermaps.Point(0, 0),
                    }}
                    zIndex={isSelected ? 100 : 1}
                  />
                )
              })}
        </NaverMap>
      </Container>

      <MyLocationButton
        loading={locationLoading}
        onClick={handleLocationClick}
      />

      {import.meta.env.DEV && (
        <div className="absolute bottom-3 left-3 rounded bg-black/70 px-2 py-1 text-xs font-mono text-white">
          zoom: {currentZoom}
        </div>
      )}
    </div>
  )
}

export function MapView(props: MapViewProps) {
  return <MapContent {...props} />
}
