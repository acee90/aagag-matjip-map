import { useCallback, useState } from 'react'
import {
  Container,
  NaverMap,
  Marker,
  useNavermaps,
} from 'react-naver-maps'
import type { Restaurant, MapBounds } from '@/types/restaurant'
import { INCHEON_CENTER, DEFAULT_ZOOM } from '@/lib/geo-utils'
import { MyLocationButton } from './MyLocationButton'

interface MapViewProps {
  restaurants: Restaurant[]
  selectedRestaurant: Restaurant | null
  onSelectRestaurant: (restaurant: Restaurant) => void
  onBoundsChange: (bounds: MapBounds) => void
  locationLoading: boolean
  onRequestLocation: () => void
  panToLat?: number
  panToLng?: number
}

function MapContent({
  restaurants,
  selectedRestaurant,
  onSelectRestaurant,
  onBoundsChange,
  locationLoading,
  onRequestLocation,
}: MapViewProps) {
  const navermaps = useNavermaps()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [_map, setMap] = useState<any>(null)

  const handleBoundsChanged = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (bounds: any) => {
      if (!bounds) return
      const sw = bounds.getSW()
      const ne = bounds.getNE()
      onBoundsChange({
        south: sw.lat(),
        north: ne.lat(),
        west: sw.lng(),
        east: ne.lng(),
      })
    },
    [onBoundsChange]
  )

  const handleLocationClick = useCallback(() => {
    onRequestLocation()
  }, [onRequestLocation])

  return (
    <div className="relative h-full w-full">
      <Container style={{ width: '100%', height: '100%' }}>
        <NaverMap
          defaultCenter={new navermaps.LatLng(INCHEON_CENTER.lat, INCHEON_CENTER.lng)}
          defaultZoom={DEFAULT_ZOOM}
          ref={setMap}
          onBoundsChanged={handleBoundsChanged}
          zoomControl
          zoomControlOptions={{
            position: navermaps.Position.TOP_RIGHT,
          }}
        >
          {restaurants.map((r) => {
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
    </div>
  )
}

export function MapView(props: MapViewProps) {
  return <MapContent {...props} />
}
