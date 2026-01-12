import { useEffect, useState, useCallback } from "react"
import { RoleBasedLayout } from "@/components/RoleBasedLayout"
import axios from "axios"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/AuthContext"
import type { Employee } from "@/types/auth"
import { uploadAvatar } from "@/lib/storage"
import { supabase } from "@/lib/supabase"
import { TableSkeleton } from "@/components/shared/TableSkeleton"
import { toast } from "sonner"
import { formatError } from "@/lib/error-formatter"
import { 
  canEditEmployees, 
  canViewEmployees, 
  canEditEmployeeRole,
  canEditEmployeeRoleByLevel,
  getEditableRoles,
  ROLE_DISPLAY_NAMES,
  ROLE_ORDER,
  type UserRole
} from "@/config/roles"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Pencil, Trash2, Search } from "lucide-react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function UsersPage() {
  const { employee, loading: authLoading } = useAuth()
  const [users, setUsers] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<Employee | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 10
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    avatar: "",
    role: "" as UserRole | "",
  })

  const canEdit = canEditEmployees(employee?.role)
  const canView = canViewEmployees(employee?.role)
  const canEditRole = canEditEmployeeRole(employee?.role)
  const editableRoles = getEditableRoles(employee?.role)

  const fetchUsers = useCallback(async (searchTerm?: string, page: number = 1) => {
    try {
      setLoading(true)
      setError(null)

      // Use REST API directly
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const offset = (page - 1) * itemsPerPage
      let url = `${supabaseUrl}/rest/v1/account?select=id,user_id,email,phone,full_name,avatar,role&order=id.asc`
      
      // Add search filter if search term exists
      if (searchTerm && searchTerm.trim()) {
        const searchPattern = `*${searchTerm.trim()}*`
        // Search by full_name, email, or phone
        url += `&or=(full_name.ilike.${encodeURIComponent(searchPattern)},email.ilike.${encodeURIComponent(searchPattern)},phone.ilike.${encodeURIComponent(searchPattern)})`
      }
      
      url += `&limit=${itemsPerPage}&offset=${offset}`
      
      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Prefer': 'count=exact',
        },
      })

      // Get total count from Content-Range header
      const contentRange = response.headers["content-range"]
      if (contentRange) {
        const match = contentRange.match(/\/(\d+)/)
        if (match) {
          setTotalCount(parseInt(match[1], 10))
        }
      }

      const allUsers = response.data as Employee[]

      // Filter to only show users with null roles
      // Also exclude logged-in user itself
      const usersWithNullRole = allUsers.filter(emp => {
        // Skip users with roles (they go to Employees page)
        if (emp.role !== null && emp.role !== undefined) {
          return false
        }
        
        // Exclude logged-in user itself
        if (employee?.user_id && emp.user_id === employee.user_id) {
          return false
        }
        
        return true
      })
      
      setUsers(usersWithNullRole)
    } catch (err) {
      const errorMessage = formatError(err) || "Failed to fetch users"
      toast.error(errorMessage)
      console.error("Error fetching users:", err)
    } finally {
      setLoading(false)
    }
  }, [itemsPerPage])

  // Main effect: fetch users when dependencies change
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return
    }

    // Check permissions after auth is loaded
    if (!canView) {
      toast.error("You don't have permission to view users")
      setLoading(false)
      return
    }

    // If there's a search query, use debounced search
    if (searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        setCurrentPage(1) // Reset to first page when search changes
        fetchUsers(searchQuery, 1)
      }, 1500) // 1.5 second debounce - wait for user to finish typing

      return () => clearTimeout(timeoutId)
    } else {
      // No search query, fetch current page
      fetchUsers(undefined, currentPage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, canView, currentPage, searchQuery]) // fetchUsers is stable, no need to include in deps

  const handleSearch = () => {
    setCurrentPage(1)
    fetchUsers(searchQuery, 1)
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  const handleEdit = (user: Employee) => {
    setEditingUser(user)
    // Convert null role to "Null" string for form
    setFormData({
      full_name: user.full_name || "",
      email: user.email || "",
      password: "", // Password is not editable, only for new users
      phone: user.phone || "",
      avatar: user.avatar || "",
      role: (user.role === null || user.role === undefined ? 'Null' : user.role) as UserRole | "",
    })
    setAvatarFile(null)
    setAvatarPreview(user.avatar || null)
    setIsDialogOpen(true)
  }


  const handleDeleteUser = async (user: Employee) => {
    if (!confirm(`Are you sure you want to delete ${user.full_name || user.email}?`)) {
      return
    }

    try {
      setDeletingUserId(user.user_id)
      setError(null)
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      if (!supabaseServiceKey) {
        throw new Error("Service key is not configured")
      }

      // Step 1: Delete auth user using admin API
      await axios.delete(
        `${supabaseUrl}/auth/v1/admin/users/${user.user_id}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
        }
      )

      // Step 2: Delete account record from database
      await axios.delete(
        `${supabaseUrl}/rest/v1/account?user_id=eq.${user.user_id}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Prefer': 'return=minimal',
          },
        }
      )

      await fetchUsers(searchQuery, currentPage)
    } catch (err) {
      const errorMessage = formatError(err) || "Failed to delete user"
      toast.error(errorMessage)
      console.error("Error deleting user:", err)
    } finally {
      setDeletingUserId(null)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB')
        return
      }

      setAvatarFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    if (!editingUser) return

    try {
      setIsSaving(true)
      // Validate email format (only if email is provided and not empty)
      if (formData.email && formData.email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        toast.error('Please enter a valid email address')
        setIsSaving(false)
        return
      }

      // Check for duplicate email (excluding current user, only if email is provided and not empty)
      if (formData.email && formData.email.trim() !== '') {
        const duplicateUser = users.find(
          user => user.email && user.email.trim() !== '' && user.email === formData.email && user.user_id !== editingUser.user_id
        )
        if (duplicateUser) {
          toast.error(`Email "${formData.email}" is already in use by another user`)
          setIsSaving(false)
          return
        }
      }

      // Get access token from Supabase auth
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No active session found')
      }

      let avatarUrl = formData.avatar

      // Upload avatar if a new file was selected
      if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile, session.access_token)
      }

      const updateData: Record<string, unknown> = {}

      // Only update fields that have changed
      if (formData.full_name !== (editingUser.full_name || "")) {
        updateData.full_name = formData.full_name
      }
      
      // Only update email if it changed
      if (formData.email !== (editingUser.email || "")) {
        updateData.email = formData.email
      }
      
      // Only update phone if it changed
      if (formData.phone !== (editingUser.phone || "")) {
        updateData.phone = formData.phone
      }

      // Only include avatar if it changed
      if (avatarUrl && avatarUrl !== editingUser.avatar) {
        updateData.avatar = avatarUrl
      }

      // Update role if user has permission and a role is selected
      if (canEditRole && formData.role) {
        // If user has no role (null), allow assigning any editable role
        if (!editingUser.role) {
          const canEditThisRole = canEditEmployeeRoleByLevel(
            employee?.role, 
            formData.role as UserRole
          )
          if (canEditThisRole && formData.role !== editingUser.role) {
            // Convert "Null" string to null for API
            updateData.role = formData.role === 'Null' ? null : formData.role
          }
        } else {
          // If user already has a role, check if we can edit it
          const canEditThisRole = canEditEmployeeRoleByLevel(
            employee?.role, 
            formData.role as UserRole
          )
          if (canEditThisRole && formData.role !== editingUser.role) {
            // Convert "Null" string to null for API
            updateData.role = formData.role === 'Null' ? null : formData.role
          }
        }
      }
      
      // Don't send empty update
      if (Object.keys(updateData).length === 0) {
        setIsDialogOpen(false)
        return
      }

      // Use REST API directly with anon key
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      try {
        await axios.patch(
          `${supabaseUrl}/rest/v1/account?user_id=eq.${editingUser.user_id}`,
          updateData,
          {
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseAnonKey,
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'Prefer': 'return=minimal',
            },
          }
        )
      } catch (error: any) {
        throw error
      }

      setIsDialogOpen(false)
      setEditingUser(null)
      setAvatarFile(null)
      setAvatarPreview(null)
      await fetchUsers(searchQuery, currentPage)
      toast.success("User updated successfully")
    } catch (err) {
      const errorMessage = formatError(err) || "Failed to update user"
      toast.error(errorMessage)
      console.error("Error updating user:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveAdd = async () => {
    try {
      setIsSaving(true)
      // Validate required fields
      if (!formData.full_name || !formData.email || !formData.password) {
        toast.error('Full name, email, and password are required')
        setIsSaving(false)
        return
      }

      // Validate password strength
      if (formData.password.length < 6) {
        toast.error('Password must be at least 6 characters long')
        setIsSaving(false)
        return
      }

      // Validate email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        toast.error('Please enter a valid email address')
        setIsSaving(false)
        return
      }

      // Check for duplicate email (only if email is provided and not empty)
      if (formData.email && formData.email.trim() !== '') {
        const duplicateUser = users.find(
          user => user.email && user.email.trim() !== '' && user.email === formData.email
        )
        if (duplicateUser) {
          toast.error(`Email "${formData.email}" is already in use by another user`)
          setIsSaving(false)
          return
        }
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      // Sign up the user - this automatically creates the account record
      try {
        await axios.post(
          `${supabaseUrl}/auth/v1/signup`,
          {
            email: formData.email,
            password: formData.password,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseAnonKey,
            },
          }
        )
      } catch (error: any) {
        const errorData = error.response?.data || { message: error.message }
        let errorMessage = errorData.message || errorData.error_description || errorData.error || "Failed to create user account"
        
        // Check for duplicate email error
        if (errorMessage.includes('already registered') || 
            errorMessage.includes('email') && errorMessage.includes('already') ||
            errorMessage.includes('User already registered')) {
          errorMessage = `Email "${formData.email}" is already in use. Please use a different email address.`
        }
        
        toast.error(errorMessage)
        setIsSaving(false)
        return
      }

      // Signup successful - account is automatically created
      // If we need to update additional fields (full_name, phone, avatar), we can do it here
      // But for now, just refresh the list
      setIsAddDialogOpen(false)
      setAvatarFile(null)
      setAvatarPreview(null)
      setFormData({
        full_name: "",
        email: "",
        password: "",
        phone: "",
        avatar: "",
        role: "" as UserRole | "",
      })
      setIsSaving(false)
      await fetchUsers(searchQuery, currentPage)
      toast.success("User created successfully")
    } catch (err) {
      const errorMessage = formatError(err) || "Failed to add user"
      toast.error(errorMessage)
      console.error("Error adding user:", err)
      setIsSaving(false)
    }
  }

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <RoleBasedLayout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </RoleBasedLayout>
    )
  }

  if (!canView) {
    return (
      <RoleBasedLayout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Access Denied</h1>
            <p className="text-muted-foreground mt-2">
              You don't have permission to view users.
            </p>
          </div>
        </div>
      </RoleBasedLayout>
    )
  }

  return (
    <RoleBasedLayout>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Users</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Users</h1>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch()
                  }
                }}
                className="pr-10 cursor-pointer"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSearch}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 cursor-pointer"
                title="Search"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {loading ? (
            <TableSkeleton
              columns={5}
              rows={10}
              hasActions={canEdit}
              columnHeaders={["Avatar", "Full Name", "Email", "Phone", "Role"]}
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Avatar</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    {canEdit && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canEdit ? 6 : 5} className="text-center py-8">
                        <p className="text-muted-foreground">No users found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => {
                      const initials = user.full_name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2) || "N/A"
                      
                      return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar || undefined} alt={user.full_name || ""} />
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-medium">{user.full_name || "N/A"}</TableCell>
                        <TableCell>{user.email || "N/A"}</TableCell>
                        <TableCell>{user.phone || "N/A"}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full bg-destructive/10 text-destructive px-2.5 py-0.5 text-xs font-medium">
                            No Role
                          </span>
                        </TableCell>
                        {canEdit && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(user)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteUser(user)}
                                disabled={deletingUserId === user.user_id}
                              >
                                {deletingUserId === user.user_id ? (
                                  <div className="h-4 w-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        if (currentPage > 1) {
                          setCurrentPage(currentPage - 1)
                        }
                      }}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault()
                              setCurrentPage(page)
                            }}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )
                    }
                    return null
                  })}
                  
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        if (currentPage < totalPages) {
                          setCurrentPage(currentPage + 1)
                        }
                      }}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <FieldGroup>
              <Field>
                <FieldLabel>Avatar</FieldLabel>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 cursor-pointer" onClick={() => document.getElementById('avatar_file_input')?.click()}>
                    <AvatarImage src={avatarPreview || editingUser?.avatar || undefined} alt={editingUser?.full_name || ""} />
                    <AvatarFallback>
                      {editingUser?.full_name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2) || "N"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Input
                      id="avatar_file_input"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="cursor-pointer"
                      style={{ display: 'none' }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('avatar_file_input')?.click()}
                      disabled={isSaving}
                    >
                      Choose Image
                    </Button>
                    {avatarFile && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Selected: {avatarFile.name}
                      </p>
                    )}
                    {!avatarFile && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Click to choose an image from your device
                      </p>
                    )}
                  </div>
                </div>
              </Field>
              <Field>
                <FieldLabel htmlFor="full_name">Full Name</FieldLabel>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  disabled={isSaving}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                  disabled
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="phone">Phone</FieldLabel>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  disabled={isSaving}
                />
              </Field>
              {canEditRole && editableRoles.length > 0 ? (
                <Field>
                  <FieldLabel htmlFor="role">Role</FieldLabel>
                  <Select
                    value={formData.role}
                    onValueChange={(value) =>
                      setFormData({ ...formData, role: value as UserRole })
                    }
                    disabled={isSaving}
                  >
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {editableRoles
                        .sort((a, b) => {
                          const indexA = ROLE_ORDER.indexOf(a)
                          const indexB = ROLE_ORDER.indexOf(b)
                          // If role not in order list, put it at the end
                          if (indexA === -1 && indexB === -1) return 0
                          if (indexA === -1) return 1
                          if (indexB === -1) return -1
                          return indexA - indexB
                        })
                        .map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_DISPLAY_NAMES[role]}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </Field>
              ) : editingUser ? (
                <Field>
                  <FieldLabel>Role</FieldLabel>
                  <div className="px-3 py-2 rounded-md border bg-muted text-sm">
                    {editingUser.role || "No Role"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Role cannot be changed from this interface. Contact administrator to change role.
                  </p>
                </Field>
              ) : null}
            </FieldGroup>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>
              Add a new user to the system. Fill in all required information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <FieldGroup>
              <Field>
                <FieldLabel>Avatar</FieldLabel>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 cursor-pointer" onClick={() => document.getElementById('add_avatar_file_input')?.click()}>
                    <AvatarImage src={avatarPreview || undefined} alt="" />
                    <AvatarFallback>N</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Input
                      id="add_avatar_file_input"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="cursor-pointer"
                      style={{ display: 'none' }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('add_avatar_file_input')?.click()}
                    >
                      Choose Image
                    </Button>
                    {avatarFile && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Selected: {avatarFile.name}
                      </p>
                    )}
                    {!avatarFile && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Click to choose an image from your device
                      </p>
                    )}
                  </div>
                </div>
              </Field>
              <Field>
                <FieldLabel htmlFor="add_full_name">Full Name</FieldLabel>
                <Input
                  id="add_full_name"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="add_email">Email</FieldLabel>
                <Input
                  id="add_email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="add_password">Password</FieldLabel>
                <Input
                  id="add_password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  disabled={isSaving}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Password must be at least 6 characters long
                </p>
              </Field>
              <Field>
                <FieldLabel htmlFor="add_phone">Phone</FieldLabel>
                <Input
                  id="add_phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </Field>
            </FieldGroup>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveAdd} disabled={isSaving}>
              {isSaving ? "Adding..." : "Add User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RoleBasedLayout>
  )
}

