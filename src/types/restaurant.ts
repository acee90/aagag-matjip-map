export interface Restaurant {
  name: string
  address: string
  lat: number
  lng: number
  link: string
  recommendation: string
  categories: string[]
  region?: string
}

export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

export interface Cluster {
  lat: number
  lng: number
  restaurants: Restaurant[]
  count: number
}

export interface AddressReport {
  id: number
  restaurant_name: string
  restaurant_address: string
  suggested_address: string
  comment: string
  created_at: string
  status: string
}
