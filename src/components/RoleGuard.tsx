import type { ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import type { UserRole } from '@/types/auth'
import { hasRoleAccess, hasAnyRole } from '@/lib/rbac'

interface RoleGuardProps {
  children: ReactNode
  requiredRole?: UserRole
  requiredRoles?: UserRole[]
  fallback?: ReactNode
}

/**
 * Component to conditionally render children based on user role
 * Useful for hiding/showing UI elements based on permissions
 */
export function RoleGuard({
  children,
  requiredRole,
  requiredRoles,
  fallback = null,
}: RoleGuardProps) {
  const { employee } = useAuth()

  if (requiredRole && !hasRoleAccess(employee?.role, requiredRole)) {
    return <>{fallback}</>
  }

  if (requiredRoles && !hasAnyRole(employee?.role, requiredRoles)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

