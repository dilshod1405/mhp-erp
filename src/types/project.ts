import type { ProjectType } from "@/config/project-types"

export interface Project {
  id: number
  developer_id: number | null
  area_id: number | null
  slug: string
  price: number | null
  latitude: number | null
  longitude: number | null
  file_brochure: string | null
  file_floor_plan: string | null
  type: ProjectType
  created_at: string
  updated_at: string
}

// Simplified Project interface for Properties page
export interface ProjectBasic {
  id: number
  slug: string
}
