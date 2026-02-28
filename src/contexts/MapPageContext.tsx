import { createContext, useContext } from 'react'
import { useMapPage, type MapPageState } from '@/hooks/useMapPage'
import type { Restaurant } from '@/types/restaurant'

const MapPageContext = createContext<MapPageState | null>(null)

export function MapPageProvider({
  initialRestaurants,
  children,
}: {
  initialRestaurants: Restaurant[]
  children: React.ReactNode
}) {
  const state = useMapPage(initialRestaurants)
  return (
    <MapPageContext.Provider value={state}>{children}</MapPageContext.Provider>
  )
}

export function useMapPageContext(): MapPageState {
  const ctx = useContext(MapPageContext)
  if (!ctx) {
    throw new Error('useMapPageContext must be used within a MapPageProvider')
  }
  return ctx
}
