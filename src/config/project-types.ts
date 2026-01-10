// Project type enum
export type ProjectType = 'Off Plan' | 'Ready' | 'Secondary'

export const PROJECT_TYPES: ProjectType[] = [
  'Off Plan',
  'Ready',
  'Secondary',
]

export const PROJECT_TYPE_DISPLAY_NAMES: Record<ProjectType, string> = {
  'Off Plan': 'Off Plan',
  'Ready': 'Ready',
  'Secondary': 'Secondary',
}

// URL slugs for routing
export const PROJECT_TYPE_SLUGS: Record<ProjectType, string> = {
  'Off Plan': 'off-plan',
  'Ready': 'ready',
  'Secondary': 'secondary',
}

// Reverse lookup from slug to type
export const SLUG_TO_PROJECT_TYPE: Record<string, ProjectType> = {
  'off-plan': 'Off Plan',
  'ready': 'Ready',
  'secondary': 'Secondary',
}

