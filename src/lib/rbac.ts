import type { UserRole } from '@/config/roles'
import { ROLE_LEVELS } from '@/config/roles'

/**
 * Check if a user's role has access to a required role based on hierarchy
 * Lower number = higher authority, so users can access roles with level >= their level
 */
export function hasRoleAccess(userRole: UserRole | null | undefined, requiredRole: UserRole): boolean {
  if (!userRole) return false
  
  const userLevel = ROLE_LEVELS[userRole] ?? 999
  const requiredLevel = ROLE_LEVELS[requiredRole] ?? 999
  
  // User can access if required role level >= user level (lower number or equal)
  // IT (0) can access all, CEO (1) can access >= 1, etc.
  return requiredLevel >= userLevel
}

/**
 * Check if a user's role matches any of the required roles
 */
export function hasAnyRole(userRole: UserRole | null | undefined, requiredRoles: UserRole[]): boolean {
  if (!userRole) return false
  return requiredRoles.some(requiredRole => {
    const userLevel = ROLE_LEVELS[userRole] || 0
    const requiredLevel = ROLE_LEVELS[requiredRole] || 0
    return userLevel >= requiredLevel
  })
}

/**
 * Check if user has one of the specified roles exactly (not hierarchy-based)
 */
export function hasExactRole(userRole: UserRole | null | undefined, allowedRoles: UserRole[]): boolean {
  if (!userRole) return false
  return allowedRoles.includes(userRole)
}

/**
 * Get role-based redirect path after login
 */
export function getRoleRedirectPath(): string {
  // All roles redirect to dashboard for now
  // You can customize this per role if needed by adding a role parameter
  // Example: export function getRoleRedirectPath(role: UserRole | null | undefined): string {
  //   if (role === 'Admin') return '/admin/dashboard'
  //   return '/dashboard'
  // }
  return '/dashboard'
}

/**
 * Check if role can access dashboard
 * All roles can access the dashboard except null/undefined
 */
export function canAccessDashboard(role: UserRole | null | undefined): boolean {
  // If role is null or undefined, cannot access
  if (!role || role === null) return false
  // All roles (except null) can access the dashboard
  return role !== 'Null'
}

