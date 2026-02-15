export interface Restaurant {
  name: string
  address: string
  lat: number
  lng: number
  link: string
  recommendation: string
  categories: string[]
}

export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}
