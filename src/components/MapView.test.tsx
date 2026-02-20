import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import type { Restaurant } from '@/types/restaurant'

// Mock naver maps
const mockPanTo = vi.fn()
const mockLatLng = vi.fn((lat: number, lng: number) => ({ lat, lng }))
const mockPoint = vi.fn((x: number, y: number) => ({ x, y }))

const mockMap = {
  panTo: mockPanTo,
}

const mockNavermaps = {
  LatLng: mockLatLng,
  Point: mockPoint,
  Position: { TOP_RIGHT: 3 },
}

// Mock MyLocationButton
vi.mock('./MyLocationButton', () => ({
  MyLocationButton: ({ onClick, loading }: { onClick: () => void; loading: boolean }) => (
    <button data-testid="my-location-btn" onClick={onClick} disabled={loading}>
      위치
    </button>
  ),
}))

// Mock react-naver-maps
vi.mock('react-naver-maps', async () => {
  const React = await import('react')
  return {
    Container: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="map-container">{children}</div>
    ),
    NaverMap: React.forwardRef(({ children, ...rest }: any, ref: any) => {
      React.useImperativeHandle(ref, () => mockMap)
      return <div data-testid="naver-map">{children}</div>
    }),
    Marker: ({ onClick }: { onClick: () => void }) => (
      <div data-testid="marker" onClick={onClick} />
    ),
    useNavermaps: () => mockNavermaps,
  }
})

// Import after mock
import { MapView } from './MapView'

const makeRestaurant = (overrides: Partial<Restaurant> = {}): Restaurant => ({
  name: '테스트 식당',
  address: '서울시 강남구',
  lat: 37.5,
  lng: 127.0,
  link: 'https://naver.me/test',
  recommendation: '맛있어요',
  categories: ['한식'],
  ...overrides,
})

const defaultProps = {
  restaurants: [makeRestaurant()],
  clusters: [],
  currentZoom: 15,
  selectedRestaurant: null as Restaurant | null,
  selectedCluster: null,
  onSelectRestaurant: vi.fn(),
  onSelectCluster: vi.fn(),
  onBoundsChange: vi.fn(),
  onZoomChange: vi.fn(),
  locationLoading: false,
  onRequestLocation: vi.fn(),
  onMapReady: vi.fn(),
}

describe('MapView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('선택된 맛집이 변경되면 panTo 호출', () => {
    const selected = makeRestaurant({ lat: 35.1, lng: 129.0 })

    render(<MapView {...defaultProps} selectedRestaurant={selected} />)

    expect(mockPanTo).toHaveBeenCalled()
    expect(mockLatLng).toHaveBeenCalledWith(35.1, 129.0)
  })

  it('선택된 맛집 없으면 panTo 미호출', () => {
    render(<MapView {...defaultProps} selectedRestaurant={null} />)

    expect(mockPanTo).not.toHaveBeenCalled()
  })

  it('유저 위치 확보 시 자동 panTo 안함 (manualPan만 허용)', () => {
    render(
      <MapView
        {...defaultProps}
        userLat={37.56}
        userLng={126.97}
        userLocated={true}
      />
    )

    // Auto-pan removed: panTo should NOT be called just because userLocated=true
    expect(mockPanTo).not.toHaveBeenCalled()
  })

  it('onMapReady 콜백 호출', () => {
    const onMapReady = vi.fn()

    render(<MapView {...defaultProps} onMapReady={onMapReady} />)

    expect(onMapReady).toHaveBeenCalled()
  })

  it('마커 클릭 시 onSelectRestaurant 호출', () => {
    const onSelect = vi.fn()
    const restaurant = makeRestaurant({ name: '클릭 식당' })

    const { getAllByTestId } = render(
      <MapView
        {...defaultProps}
        restaurants={[restaurant]}
        onSelectRestaurant={onSelect}
      />
    )

    const markers = getAllByTestId('marker')
    markers[0].click()
    expect(onSelect).toHaveBeenCalledWith(restaurant)
  })

  it('MyLocationButton 클릭 시 onRequestLocation 호출', () => {
    const onRequestLocation = vi.fn()

    const { getByTestId } = render(
      <MapView {...defaultProps} onRequestLocation={onRequestLocation} />
    )

    getByTestId('my-location-btn').click()
    expect(onRequestLocation).toHaveBeenCalled()
  })
})
