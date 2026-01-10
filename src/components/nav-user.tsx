import { useState } from "react"
import axios from "axios"
import {
  ChevronsUpDown,
  LogOut,
  Pencil,
} from "lucide-react"
import { useNavigate } from "react-router-dom"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
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
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { uploadAvatar } from "@/lib/storage"
import { supabase } from "@/lib/supabase"

export function NavUser({
  user,
  onLogout,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
  onLogout?: () => Promise<void>
}) {
  const { isMobile } = useSidebar()
  const navigate = useNavigate()
  const { employee, fetchEmployeeData } = useAuth()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    avatar: "",
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout()
      navigate("/login", { replace: true })
    }
  }

  const handleEditProfile = () => {
    if (employee) {
      setFormData({
        full_name: employee.full_name || "",
        phone: employee.phone || "",
        avatar: employee.avatar || "",
      })
      setAvatarFile(null)
      setAvatarPreview(employee.avatar || null)
      setIsEditDialogOpen(true)
      setError(null)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB')
        return
      }

      setAvatarFile(file)
      setError(null)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveProfile = async () => {
    if (!employee?.user_id) return

    try {
      setIsSaving(true)
      setError(null)

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

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const updateData: Record<string, unknown> = {
        full_name: formData.full_name,
        phone: formData.phone,
      }

      // Only include avatar if it changed
      if (avatarUrl && avatarUrl !== employee.avatar) {
        updateData.avatar = avatarUrl
      }

      await axios.patch(
        `${supabaseUrl}/rest/v1/account?user_id=eq.${employee.user_id}`,
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

      setIsEditDialogOpen(false)
      setAvatarFile(null)
      setAvatarPreview(null)
      // Refresh employee data
      if (fetchEmployeeData) {
        await fetchEmployeeData()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update profile"
      setError(errorMessage)
      console.error("Error updating profile:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={handleEditProfile}>
                <Pencil />
                Edit Profile
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your profile information. Email cannot be changed.
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
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={avatarPreview || employee?.avatar || undefined} alt={employee?.full_name || ""} />
                    <AvatarFallback>
                      {(employee?.full_name || user.name)
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Input
                      id="profile_avatar"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="cursor-pointer"
                      style={{ display: 'none' }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('profile_avatar')?.click()}
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
                <FieldLabel htmlFor="profile_full_name">Full Name</FieldLabel>
                <Input
                  id="profile_full_name"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="profile_phone">Phone</FieldLabel>
                <Input
                  id="profile_phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </Field>
              <Field>
                <FieldLabel>Email</FieldLabel>
                <div className="px-3 py-2 rounded-md border bg-muted text-sm">
                  {employee?.email || user.email}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Email cannot be changed.
                </p>
              </Field>
            </FieldGroup>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarMenu>
  )
}
