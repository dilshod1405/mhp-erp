import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { UserRole } from '@/types/auth'
import { hasRoleAccess, hasAnyRole, canAccessDashboard } from '@/lib/rbac'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole
  requiredRoles?: UserRole[]
  redirectTo?: string
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredRoles,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { user, employee, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  // Check if user's role can access dashboard
  if (!canAccessDashboard(employee?.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  // Check role-based access
  if (requiredRole && !hasRoleAccess(employee?.role, requiredRole)) {
    return <Navigate to="/unauthorized" replace />
  }

  if (requiredRoles && !hasAnyRole(employee?.role, requiredRoles)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}

