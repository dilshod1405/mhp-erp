# Role-Based Access Control (RBAC) Usage Examples

This document provides examples of how to use the RBAC system in the application.

## 1. Protecting Routes

### Basic Protection (Any Authenticated User)
```tsx
import { ProtectedRoute } from '@/components/ProtectedRoute'

<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  }
/>
```

### Role-Based Route Protection
```tsx
// Require specific role
<Route
  path="/admin/dashboard"
  element={
    <ProtectedRoute requiredRole="admin">
      <AdminDashboardPage />
    </ProtectedRoute>
  }
/>

// Require any of multiple roles
<Route
  path="/manager/dashboard"
  element={
    <ProtectedRoute requiredRoles={["admin", "manager"]}>
      <ManagerDashboardPage />
    </ProtectedRoute>
  }
/>
```

## 2. Protecting UI Elements

### Using RoleGuard Component
```tsx
import { RoleGuard } from '@/components/RoleGuard'

// Show button only to admins
<RoleGuard requiredRole="admin">
  <Button onClick={handleDelete}>Delete User</Button>
</RoleGuard>

// Show to multiple roles
<RoleGuard requiredRoles={["admin", "manager"]}>
  <Button onClick={handleEdit}>Edit Settings</Button>
</RoleGuard>

// With fallback
<RoleGuard 
  requiredRole="admin" 
  fallback={<p>You don't have permission</p>}
>
  <AdminPanel />
</RoleGuard>
```

## 3. Using Auth Context

```tsx
import { useAuth } from '@/contexts/AuthContext'

function MyComponent() {
  const { user, employee, loading, logout } = useAuth()
  
  if (loading) return <div>Loading...</div>
  
  return (
    <div>
      <p>Email: {user?.email}</p>
      <p>Name: {employee?.full_name}</p>
      <p>Role: {employee?.role}</p>
      <button onClick={logout}>Logout</button>
    </div>
  )
}
```

## 4. Role Hierarchy

The system uses a role hierarchy:
- `admin` (100) - Highest level
- `manager` (75)
- `employee` (50)
- `agent` (25) - Lowest level

Users with higher roles automatically have access to lower role permissions.

## 5. Programmatic Role Checking

```tsx
import { hasRoleAccess, hasAnyRole } from '@/lib/rbac'
import { useAuth } from '@/contexts/AuthContext'

function MyComponent() {
  const { employee } = useAuth()
  
  const canEdit = hasRoleAccess(employee?.role, 'manager')
  const canView = hasAnyRole(employee?.role, ['admin', 'manager', 'employee'])
  
  return (
    <div>
      {canEdit && <EditButton />}
      {canView && <ViewButton />}
    </div>
  )
}
```

## 6. Role-Based Redirects

After login, users are automatically redirected based on their role:
- `admin` → `/admin/dashboard`
- `manager` → `/manager/dashboard`
- `employee` → `/employee/dashboard`
- `agent` → `/agent/dashboard`
- Default → `/dashboard`

You can also manually get redirect path:
```tsx
import { getRoleRedirectPath } from '@/lib/rbac'

const path = getRoleRedirectPath(employee?.role)
navigate(path)
```

