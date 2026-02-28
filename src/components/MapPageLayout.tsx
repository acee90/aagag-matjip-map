import { NavermapsProvider } from 'react-naver-maps'
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
import { useMapPageContext } from '@/contexts/MapPageContext'
import { List, UtensilsCrossed } from 'lucide-react'

export function MapPageLayout() {
  const {
    initialRestaurants,
    categoryFiltered,
    clusters,
    currentZoom,
    selectedRestaurant,
    selectedCluster,
    visibleRestaurants,
    allCategories,
    selectedCategories,
    setSelectedCategories,
    mobileListOpen,
    setMobileListOpen,
    listHasMore,
    listLoading,
    panTo,
    isClient,
    initializing,
    mapLoading,
    setMapReady,
    userLat,
    userLng,
    locationLoading,
    userLocated,
    requestLocation,
    handleBoundsChange,
    handleZoomChange,
    handleSelectCluster,
    handleSelectRestaurant,
    handleSelectFromList,
    handleLoadMore,
    handleSearchSelect,
    clearSelectedRestaurant,
  } = useMapPageContext()

  // JSON-LD structured data for SEO & AEO
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: '애객 맛집 지도',
      url: 'https://aagag.matjip.site',
      description:
        '전국 맛집 지도 - 애객이 엄선한 맛집을 지도에서 한눈에 찾아보세요.',
      applicationCategory: 'FoodService',
      operatingSystem: 'Web',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: '애객 추천 맛집',
      description: '애객이 엄선한 전국 맛집 목록',
      numberOfItems: initialRestaurants.length,
      itemListElement: initialRestaurants.slice(0, 50).map((r, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Restaurant',
          name: r.name,
          address: {
            '@type': 'PostalAddress',
            streetAddress: r.address,
            addressCountry: 'KR',
          },
          geo: {
            '@type': 'GeoCoordinates',
            latitude: r.lat,
            longitude: r.lng,
          },
          ...(r.categories.length > 0 && {
            servesCuisine: r.categories,
          }),
          ...(r.recommendation && {
            description: r.recommendation,
          }),
          ...(r.link && { url: r.link }),
        },
      })),
    },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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
          {/* Map area */}
          <div className="flex-1 relative">
            {mapLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background">
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
              </NavermapsProvider>
            )}
            {/* Mobile bottom card for selected restaurant */}
            {selectedRestaurant && (
              <MobileRestaurantDetail
                restaurant={selectedRestaurant}
                onClose={clearSelectedRestaurant}
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
          <SheetContent
            side="bottom"
            className="h-[70dvh] md:hidden p-0"
            overlayClassName="md:hidden"
          >
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
    </>
  )
}
