"use client"

import * as React from "react"
import { Link } from "react-router-dom"
import {
  HeartHandshake,
  Building,
  Presentation,
  Contact,
  Landmark,
  MapPin,
  Users,
  Database,
} from "lucide-react"


import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import logo from "@/assets/logo.PNG?url"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuth } from "@/contexts/AuthContext"
import { hasRoleAccess } from "@/lib/rbac"
import { canViewEmployees, canViewAreas, canViewDevelopers } from "@/config/roles"
import type { UserRole } from "@/types/auth"
import type { LucideIcon } from "lucide-react"

interface NavItem {
  title: string
  url: string
  icon: LucideIcon
  isActive?: boolean
  requiredRole?: UserRole
  items?: Array<{
    title: string
    url: string
    requiredRole?: UserRole
  }>
}

export function AppSidebar({ 
  userRole,
  ...props 
}: React.ComponentProps<typeof Sidebar> & { userRole?: UserRole }) {
  const { employee, user, logout } = useAuth()

  const allNavItems: NavItem[] = [
    {
      title: "Deals",
      url: "/deals",
      icon: HeartHandshake,
      isActive: true,
    },
    {
      title: "Properties",
      url: "/properties",
      icon: Building,
      items: [
        {
          title: "Live listings",
          url: "/properties/live",
        },
        {
          title: "Pocket listings",
          url: "/properties/pocket",
        },
      ],
    },
    {
      title: "Database",
      url: "/database",
      icon: Database,
    },
    {
      title: "Projects",
      url: "/projects",
      icon: Presentation,
      items: [
        {
          title: "Off Plan",
          url: "/projects/off-plan",
        },
        {
          title: "Ready",
          url: "/projects/ready",
        },
        {
          title: "Secondary",
          url: "/projects/secondary",
        },
      ],
    },
    {
      title: "Contacts",
      url: "/contacts",
      icon: Contact,
    },
    {
      title: "Developers",
      url: "/developers",
      icon: Landmark,
    },
    {
      title: "Areas",
      url: "/areas",
      icon: MapPin,
      requiredRole: "Admin", // IT, Admin, CEO can access (level 0, 1, 2)
    },
    {
      title: "Accounts",
      url: "/employees",
      icon: Users,
      items: [
        {
          title: "Employees",
          url: "/employees",
        },
        {
          title: "Users",
          url: "/users",
        },
      ],
      // Visible to roles that can view employees
    },
  ]

  // Filter nav items based on role
  const navMain = allNavItems.filter((item) => {
    // Special handling for Accounts (Employees/Users) - use canViewEmployees check
    if (item.url === "/employees" || item.title === "Accounts") {
      return canViewEmployees(userRole)
    }
    
    // Special handling for Areas - IT, Admin, CEO can edit; HR, Accountant, Lawyer, Listing Coordinator, Sales Manager, Agent can view
    if (item.url === "/areas") {
      return canViewAreas(userRole)
    }
    
    // Special handling for Developers - IT, Admin, CEO can edit; Other roles can view
    if (item.url === "/developers") {
      return canViewDevelopers(userRole)
    }
    
    if (item.requiredRole && !hasRoleAccess(userRole, item.requiredRole)) {
      return false
    }
    if (item.items) {
      item.items = item.items.filter((subItem) => {
        if (subItem.requiredRole && !hasRoleAccess(userRole, subItem.requiredRole)) {
          return false
        }
        return true
      })
    }
    return true
  })

  const sidebarUser = employee
    ? {
        name: employee.full_name || "User",
        email: employee.email,
        avatar: employee.avatar || "/avatars/default.jpg",
      }
    : user
    ? {
        name: user.email.split("@")[0],
        email: user.email,
        avatar: "/avatars/default.jpg",
      }
    : {
        name: "Guest",
        email: "",
        avatar: "/avatars/default.jpg",
      }

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader className="!p-0 !gap-0 !m-0 !pt-0 !pb-0">
        <SidebarMenu className="!p-0 !gap-0 !m-0">
          <SidebarMenuItem className="!p-0 !m-0 !list-none">
            <SidebarMenuButton size="lg" asChild className="!flex-row !gap-2 !h-auto !py-0 !px-4 !m-0 !p-0 !min-h-0 !items-center !justify-center">
              <Link to="/dashboard" className="!flex !flex-row !items-center !justify-center !gap-2 !w-full !py-2 !px-2 !m-0">
                <img src={logo} alt="Master Homes Properties" className="h-8 w-auto object-contain !m-0 !block" />
                <span className="truncate font-bold text-foreground whitespace-nowrap">Master Homes Properties</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="!pt-0 !gap-0">
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={sidebarUser} onLogout={logout} />
      </SidebarFooter>
    </Sidebar>
  )
}
