export interface Property {
  id: number
  project_id: number | null
  owner_id: number | null
  pf_id: string | null
  type: string
  bedrooms: number | null
  square_meter: number | null
  price: number | null
  latitude: number | null
  longitude: number | null
  created_at: string
  updated_at: string
}

export type PropertyListingType = 'live' | 'pocket' | 'archive'
