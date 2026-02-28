import { createFileRoute } from '@tanstack/react-router'
import { getInitialRestaurants } from '@/data/restaurants'
import { MapPageProvider } from '@/contexts/MapPageContext'
import { MapPageLayout } from '@/components/MapPageLayout'

export const Route = createFileRoute('/')({
  loader: () => getInitialRestaurants(),
  component: App,
})

function App() {
  const initialRestaurants = Route.useLoaderData()
  return (
    <MapPageProvider initialRestaurants={initialRestaurants}>
      <MapPageLayout />
    </MapPageProvider>
  )
}
