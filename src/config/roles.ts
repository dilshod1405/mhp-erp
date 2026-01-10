/**
 * Centralized Role Configuration
 * 
 * This file manages all roles and their permissions.
 * Lower numbers = higher authority (IT=0 is highest)
 * Update this file to add/remove roles or change permissions.
 */

export type UserRole =
  | 'IT'
  | 'CEO'
  | 'Admin'
  | 'HR'
  | 'Accountant'
  | 'Lawyer'
  | 'Listing Coordinator'
  | 'Sales Manager'
  | 'Agent'
  | 'Social Media Manager'
  | 'Null'

/**
 * Role display order for dropdowns
 * This order should be used when displaying roles in select/dropdown components
 */
export const ROLE_ORDER: UserRole[] = [
  'IT',
  'CEO',
  'Admin',
  'HR',
  'Accountant',
  'Lawyer',
  'Listing Coordinator',
  'Sales Manager',
  'Agent',
  'Social Media Manager',
]

/**
 * Role hierarchy levels (LOWER number = HIGHER authority)
 * IT (0) has full access, CEO (1) cannot see IT, etc.
 */
export const ROLE_LEVELS: Record<UserRole, number> = {
  IT: 0,
  CEO: 1,
  Admin: 2,
  HR: 3,
  'Sales Manager': 3,
  Agent: 3,
  Lawyer: 3,
  'Social Media Manager': 3,
  'Listing Coordinator': 3,
  Accountant: 3,
  Null: 999, // Highest number (lowest authority) - users without roles
}

/**
 * Roles that can access the dashboard
 * All roles except 'Null' can access the dashboard
 */
export const DASHBOARD_ACCESS_ROLES: UserRole[] = [
  'IT',
  'CEO',
  'Admin',
  'HR',
  'Accountant',
  'Lawyer',
  'Listing Coordinator',
  'Sales Manager',
  'Agent',
  'Social Media Manager',
]

/**
 * Roles that can view employees list
 * IT, CEO, Admin, HR, Lawyer, Accountant can view (read-only for Lawyer and Accountant)
 * Listing Coordinator, Sales Manager, Agent, Social Media Manager cannot see Account pages
 */
export const EMPLOYEE_VIEW_ROLES: UserRole[] = [
  'IT',
  'CEO',
  'Admin',
  'HR',
  'Lawyer',
  'Accountant',
]

/**
 * Roles that can edit employees (full CRUD - deletion and edition)
 * IT, CEO, Admin, HR can edit
 */
export const EMPLOYEE_EDIT_ROLES: UserRole[] = [
  'IT',
  'CEO',
  'Admin',
  'HR',
]

/**
 * Roles that can edit employee roles in the modal
 * IT, Admin, and HR can change roles
 */
export const EMPLOYEE_ROLE_EDIT_ROLES: UserRole[] = [
  'IT',
  'Admin',
  'HR',
]

/**
 * Roles that can view areas (read-only access)
 * HR, Accountant, Lawyer, Listing Coordinator, Sales Manager, Agent can view
 * Social Media Manager cannot see the Areas page at all
 */
export const AREA_VIEW_ROLES: UserRole[] = [
  'HR',
  'Accountant',
  'Lawyer',
  'Listing Coordinator',
  'Sales Manager',
  'Agent',
]

/**
 * Roles that can edit areas (full CRUD access)
 * IT, CEO, Admin can create, read, update, and delete areas
 * Other roles (except Social Media Manager) have read-only access
 */
export const AREA_EDIT_ROLES: UserRole[] = [
  'IT',
  'CEO',
  'Admin',
]

/**
 * Roles that can view developers (read-only access)
 * All roles except those with edit access can view
 */
export const DEVELOPER_VIEW_ROLES: UserRole[] = [
  'HR',
  'Accountant',
  'Lawyer',
  'Listing Coordinator',
  'Sales Manager',
  'Agent',
  'Social Media Manager',
]

/**
 * Roles that can edit developers (full CRUD access)
 * IT, Admin, CEO can edit
 */
export const DEVELOPER_EDIT_ROLES: UserRole[] = [
  'IT',
  'CEO',
  'Admin',
]

/**
 * Roles that can edit projects (full CRUD access)
 * IT, Admin, CEO can edit
 */
export const PROJECT_EDIT_ROLES: UserRole[] = [
  'IT',
  'CEO',
  'Admin',
]

/**
 * Roles that can view properties (read-only access)
 * All roles can view properties (except Null)
 */
export const PROPERTY_VIEW_ROLES: UserRole[] = [
  'HR',
  'Accountant',
  'Lawyer',
  'Listing Coordinator',
  'Sales Manager',
  'Agent',
  'Social Media Manager',
]

/**
 * Roles that can edit properties (full CRUD access)
 * IT, Admin, CEO can edit
 */
export const PROPERTY_EDIT_ROLES: UserRole[] = [
  'IT',
  'CEO',
  'Admin',
]

/**
 * Role display names (for UI)
 */
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  IT: 'IT',
  CEO: 'CEO',
  Admin: 'Admin',
  'Sales Manager': 'Sales Manager',
  HR: 'HR',
  Agent: 'Agent',
  Lawyer: 'Lawyer',
  'Social Media Manager': 'Social Media Manager',
  'Listing Coordinator': 'Listing Coordinator',
  Accountant: 'Accountant',
  Null: 'No Role',
}

/**
 * Get all available roles sorted by level (ascending - lower number first)
 */
export function getAllRoles(): UserRole[] {
  return (Object.keys(ROLE_LEVELS) as UserRole[]).sort((a, b) => 
    ROLE_LEVELS[a] - ROLE_LEVELS[b]
  )
}

/**
 * Get roles that a user can see/edit based on their role level
 * Users can only see/edit roles with level >= their level
 */
export function getAccessibleRoles(userRole: UserRole | null | undefined): UserRole[] {
  if (!userRole) return []
  
  const userLevel = ROLE_LEVELS[userRole]
  
  return getAllRoles().filter(role => {
    const roleLevel = ROLE_LEVELS[role]
    // Can see roles with level >= their level (lower number or equal)
    return roleLevel >= userLevel
  })
}

/**
 * Check if a role can access the dashboard
 * All roles can access the dashboard except Null (null/undefined roles)
 */
export function canAccessDashboard(role: UserRole | null | undefined): boolean {
  if (!role) return false
  // All roles can access except 'Null'
  return role !== 'Null'
}

/**
 * Check if a role can edit employees
 */
export function canEditEmployees(role: UserRole | null | undefined): boolean {
  if (!role) return false
  return EMPLOYEE_EDIT_ROLES.includes(role)
}

/**
 * Check if a role can view employees list
 */
export function canViewEmployees(role: UserRole | null | undefined): boolean {
  if (!role) return false
  return EMPLOYEE_VIEW_ROLES.includes(role)
}

/**
 * Check if a role can edit employee roles in modal
 */
export function canEditEmployeeRole(role: UserRole | null | undefined): boolean {
  if (!role) return false
  return EMPLOYEE_ROLE_EDIT_ROLES.includes(role)
}

/**
 * Check if a role can view areas (read-only)
 */
export function canViewAreas(role: UserRole | null | undefined): boolean {
  if (!role) return false
  return AREA_VIEW_ROLES.includes(role) || AREA_EDIT_ROLES.includes(role)
}

/**
 * Check if a role can edit areas (full CRUD)
 */
export function canEditAreas(role: UserRole | null | undefined): boolean {
  if (!role) return false
  return AREA_EDIT_ROLES.includes(role)
}

/**
 * Check if a role can view developers (read-only)
 */
export function canViewDevelopers(role: UserRole | null | undefined): boolean {
  if (!role) return false
  return DEVELOPER_VIEW_ROLES.includes(role) || DEVELOPER_EDIT_ROLES.includes(role)
}

/**
 * Check if a role can edit developers (full CRUD)
 */
export function canEditDevelopers(role: UserRole | null | undefined): boolean {
  if (!role) return false
  return DEVELOPER_EDIT_ROLES.includes(role)
}

/**
 * Check if a role can edit projects (full CRUD)
 * IT, CEO, Admin (roles 0, 1, 2) can edit
 */
export function canEditProjects(role: UserRole | null | undefined): boolean {
  if (!role) return false
  return PROJECT_EDIT_ROLES.includes(role)
}

/**
 * Check if a role can view properties (read-only)
 * All authenticated roles can view properties (except Null)
 */
export function canViewProperties(role: UserRole | null | undefined): boolean {
  if (!role) return false
  // All roles except Null can view properties
  return role !== 'Null'
}

/**
 * Check if a role can edit properties (full CRUD)
 */
export function canEditProperties(role: UserRole | null | undefined): boolean {
  if (!role) return false
  return PROPERTY_EDIT_ROLES.includes(role)
}

/**
 * Check if user can see a specific employee based on role hierarchy
 * User cannot see employees with lower level (higher authority)
 * - IT (0) can see 1, 2, 3 (CEO, Admin, others)
 * - CEO (1) can see 2, 3 (Admin, others)
 * - Admin (2) can see 3 (others)
 * - Level 3 (HR, Lawyer, Accountant, etc.) can see 3 only (same level)
 */
export function canSeeEmployee(userRole: UserRole | null | undefined, employeeRole: UserRole | null | undefined): boolean {
  if (!userRole || !employeeRole) return false
  
  const userLevel = ROLE_LEVELS[userRole]
  const employeeLevel = ROLE_LEVELS[employeeRole]
  
  // Level 0 (IT) can see levels > 0 (1, 2, 3)
  // Level 1 (CEO) can see levels > 1 (2, 3)
  // Level 2 (Admin) can see levels > 2 (3)
  // Level 3 (HR, Lawyer, Accountant, etc.) can see levels >= 3 (3 only - same level)
  if (userLevel < 3) {
    return employeeLevel > userLevel
  } else {
    // Level 3 users can see same level (3) only, not level 2, 1, or 0
    return employeeLevel >= userLevel
  }
}

/**
 * Check if user can edit a specific employee's role
 * - IT (0) can edit 1, 2, 3
 * - CEO (1) can edit 2, 3
 * - Admin (2) can edit 3 only (cannot assign IT, CEO, Admin)
 * - HR (3) can edit 3 only (cannot assign IT, CEO, Admin)
 */
export function canEditEmployeeRoleByLevel(userRole: UserRole | null | undefined, targetEmployeeRole: UserRole | null | undefined): boolean {
  if (!userRole || !targetEmployeeRole) return false
  
  // Allow assigning Null (No Role) - all roles that can edit roles can assign Null
  if (targetEmployeeRole === 'Null') {
    // Only IT, Admin, HR can edit roles
    return userRole === 'IT' || userRole === 'CEO' || userRole === 'Admin' || userRole === 'HR'
  }
  
  const userLevel = ROLE_LEVELS[userRole]
  const targetLevel = ROLE_LEVELS[targetEmployeeRole]
  
  // IT and CEO can edit roles with bigger numbers (targetLevel > userLevel)
  if (userLevel <= 1) {
    return targetLevel > userLevel
  }
  
  // Admin (level 2) can only edit level 3 (cannot assign IT, CEO, Admin - levels 0, 1, 2)
  if (userLevel === 2) {
    return targetLevel === 3
  }
  
  // HR (level 3) can only edit level 3 (cannot assign IT, CEO, Admin - levels 0, 1, 2)
  if (userLevel === 3 && userRole === 'HR') {
    return targetLevel === 3
  }
  
  // Other users cannot edit roles
  return false
}

/**
 * Get roles that a user can edit based on hierarchy
 * - IT (0) can edit 1, 2, 3, Null
 * - CEO (1) can edit 2, 3, Null
 * - Admin (2) can edit 3, Null only (cannot assign IT, CEO, Admin)
 * - HR (3) can edit 3, Null only (cannot assign IT, CEO, Admin)
 */
export function getEditableRoles(userRole: UserRole | null | undefined): UserRole[] {
  if (!userRole) return []
  
  const userLevel = ROLE_LEVELS[userRole]
  
  // IT and CEO can edit roles with bigger numbers
  if (userLevel <= 1) {
    return getAllRoles().filter(role => {
      const roleLevel = ROLE_LEVELS[role]
      return roleLevel > userLevel
    })
  }
  
  // Admin (level 2) can only edit level 3 roles and Null (cannot assign IT, CEO, Admin)
  if (userLevel === 2) {
    return getAllRoles().filter(role => {
      const roleLevel = ROLE_LEVELS[role]
      // Can assign level 3 roles or Null (No Role)
      return roleLevel === 3 || role === 'Null'
    })
  }
  
  // HR (level 3) can only edit level 3 roles and Null (cannot assign IT, CEO, Admin)
  if (userLevel === 3 && userRole === 'HR') {
    return getAllRoles().filter(role => {
      const roleLevel = ROLE_LEVELS[role]
      // Can assign level 3 roles or Null (No Role)
      return roleLevel === 3 || role === 'Null'
    })
  }
  
  // Other users cannot edit roles
  return []
}
