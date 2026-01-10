import type { ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { AppSidebar } from '@/components/app-sidebar'
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar'

interface RoleBasedLayoutProps {
  children: ReactNode
  requiredRole?: string
  requiredRoles?: string[]
}

export function RoleBasedLayout({
  children,
}: RoleBasedLayoutProps) {
  const { employee, loading } = useAuth()

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

  return (
    <SidebarProvider>
      <AppSidebar userRole={employee?.role || undefined} />
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}

