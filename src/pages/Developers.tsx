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
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Pencil, Trash2, Plus, CalendarIcon } from "lucide-react"
import { canViewDevelopers, canEditDevelopers } from "@/config/roles"
import { supabase } from "@/lib/supabase"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { format } from "date-fns"

import type { Developer } from "@/types/developer"
import { CardSkeleton } from "@/components/shared/CardSkeleton"
import { formatError } from "@/lib/error-formatter"
import { toast } from "sonner"

export default function DevelopersPage() {
  const { employee } = useAuth()
  const [developers, setDevelopers] = useState<Developer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingDeveloper, setEditingDeveloper] = useState<Developer | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingDeveloperId, setDeletingDeveloperId] = useState<number | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 12
  const [foundationDate, setFoundationDate] = useState<Date | undefined>(undefined)
  const [formData, setFormData] = useState({
    title: "",
    logo: "",
  })

  const canView = canViewDevelopers(employee?.role)
  const canEdit = canEditDevelopers(employee?.role)

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  const uploadLogo = async (file: File): Promise<string> => {
    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`

    // Get access token from current session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error("No active session found")
    }

    // Upload file to storage bucket "developers_logos"
    await axios.post(
      `${supabaseUrl}/storage/v1/object/developers_logos/${fileName}`,
      file,
      {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      }
    )

    // Return the URL format: https://{{supabase_project_id}}.supabase.co/storage/v1/object/developers_logos/{{logo_name}}
    return `${supabaseUrl}/storage/v1/object/developers_logos/${fileName}`
  }

  const fetchDevelopers = useCallback(async (page: number = 1) => {
    try {
      setLoading(true)
      setError(null)

      const offset = (page - 1) * itemsPerPage
      const response = await axios.get(
        `${supabaseUrl}/rest/v1/developer?select=*&limit=${itemsPerPage}&offset=${offset}`,
        {
          headers: {
            "apikey": supabaseAnonKey,
            "Authorization": `Bearer ${supabaseAnonKey}`,
            "Content-Type": "application/json",
            "Prefer": "count=exact",
          },
        }
      )

      // Get total count from Content-Range header
      const contentRange = response.headers["content-range"]
      if (contentRange) {
        const match = contentRange.match(/\/(\d+)/)
        if (match) {
          setTotalCount(parseInt(match[1], 10))
        }
      }

      setDevelopers(response.data || [])
    } catch (err: any) {
      console.error("Error fetching developers:", err)
      toast.error(formatError(err) || "Failed to fetch developers")
    } finally {
      setLoading(false)
    }
  }, [supabaseUrl, supabaseAnonKey, itemsPerPage])

  useEffect(() => {
    if (!canView) {
      toast.error("You don't have permission to view developers")
      setLoading(false)
      return
    }
    
    fetchDevelopers(currentPage)
  }, [canView, currentPage]) // Removed fetchDevelopers from dependencies

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file")
        return
      }
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleEdit = (developer: Developer) => {
    setEditingDeveloper(developer)
    setFormData({
      title: developer.title,
      logo: developer.logo || "",
    })
    setFoundationDate(developer.foundation_date ? new Date(developer.foundation_date) : undefined)
    setLogoFile(null)
    setLogoPreview(developer.logo || null)
    setIsDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingDeveloper(null)
    setFormData({
      title: "",
      logo: "",
    })
    setFoundationDate(undefined)
    setLogoFile(null)
    setLogoPreview(null)
    setIsAddDialogOpen(true)
  }

  const handleDelete = async (developerId: number) => {
    if (!confirm("Are you sure you want to delete this developer?")) {
      return
    }

    try {
      setDeletingDeveloperId(developerId)

      await axios.delete(
        `${supabaseUrl}/rest/v1/developer?id=eq.${developerId}`,
        {
          headers: {
            "apikey": supabaseAnonKey,
            "Authorization": `Bearer ${supabaseAnonKey}`,
            "Content-Type": "application/json",
          },
        }
      )

      await fetchDevelopers(currentPage)
      toast.success("Developer deleted successfully")
    } catch (err: any) {
      console.error("Error deleting developer:", err)
      const message = formatError(err) || "Failed to delete developer. Please try again."
      toast.error(message)
    } finally {
      setDeletingDeveloperId(null)
    }
  }

  const handleSave = async () => {
    if (!formData.title.trim() || !foundationDate) {
      toast.error("Please fill in all required fields")
      return
    }

    try {
      setIsSaving(true)

      let logoUrl = formData.logo

      // Upload logo if a new file was selected
      if (logoFile) {
        logoUrl = await uploadLogo(logoFile)
      }

      // Format date as YYYY-MM-DD
      const formattedDate = format(foundationDate, 'yyyy-MM-dd')

      const requestBody: any = {
        title: formData.title.trim(),
        foundation_date: formattedDate,
      }

      // Only include logo if it has a value
      if (logoUrl) {
        requestBody.logo = logoUrl
      } else {
        // If logo was removed, set it to null
        requestBody.logo = null
      }

      if (editingDeveloper) {
        // Update existing developer
        await axios.patch(
          `${supabaseUrl}/rest/v1/developer?id=eq.${editingDeveloper.id}`,
          requestBody,
          {
            headers: {
              "apikey": supabaseAnonKey,
              "Authorization": `Bearer ${supabaseAnonKey}`,
              "Content-Type": "application/json",
              "Prefer": "return=representation",
            },
          }
        )
      } else {
        // Create new developer
        await axios.post(
          `${supabaseUrl}/rest/v1/developer`,
          requestBody,
          {
            headers: {
              "apikey": supabaseAnonKey,
              "Authorization": `Bearer ${supabaseAnonKey}`,
              "Content-Type": "application/json",
              "Prefer": "return=representation",
            },
          }
        )
      }

      setIsDialogOpen(false)
      setIsAddDialogOpen(false)
      await fetchDevelopers(currentPage)
      toast.success(editingDeveloper ? "Developer updated successfully" : "Developer created successfully")
    } catch (err: any) {
      console.error("Error saving developer:", err)
      const message = formatError(err) || "Failed to save developer"
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  if (!canView) {
    return (
      <RoleBasedLayout>
        <div className="flex flex-col gap-4 p-4 pt-0">
          <div className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Developers</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold">Access Denied</h1>
              <p className="text-muted-foreground mt-2">
                You don't have permission to view developers.
              </p>
            </div>
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
                <BreadcrumbPage>Developers</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Developers</h1>
            {canEdit && (
              <Button onClick={handleAdd} className="cursor-pointer">
                <Plus className="mr-2 h-4 w-4" />
                Add Developer
              </Button>
            )}
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {loading ? (
            <CardSkeleton count={8} showActions={canEdit} />
          ) : developers.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">No developers found. Click "Add Developer" to create one.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {developers.map((developer) => (
                <Card key={developer.id} className="flex flex-col hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold truncate">{developer.title}</h3>
                    </div>
                    {canEdit && (
                      <div className="flex gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(developer)}
                          className="cursor-pointer h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(developer.id)}
                          disabled={deletingDeveloperId === developer.id}
                          className="cursor-pointer h-8 w-8"
                        >
                          {deletingDeveloperId === developer.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center flex-1 pt-4">
                    <div className="w-full aspect-square flex items-center justify-center mb-4 bg-muted rounded-lg p-4">
                      {developer.logo ? (
                        <img 
                          src={developer.logo} 
                          alt={`${developer.title} logo`}
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                            const parent = (e.target as HTMLImageElement).parentElement
                            if (parent && !parent.querySelector('.no-logo-text')) {
                              const text = document.createElement('span')
                              text.className = 'no-logo-text text-muted-foreground text-sm'
                              text.textContent = 'No logo'
                              parent.appendChild(text)
                            }
                          }}
                        />
                      ) : (
                        <span className="text-muted-foreground text-sm">No logo</span>
                      )}
                    </div>
                    <div className="w-full space-y-1 text-sm">
                      {developer.foundation_date && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Founded:</span>
                          <span className="font-medium">
                            {new Date(developer.foundation_date).toISOString().split('T')[0]}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex justify-center mt-4">
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

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Developer</DialogTitle>
            <DialogDescription>
              Update the developer information below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="edit-logo">Logo</FieldLabel>
                <Input
                  id="edit-logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  disabled={isSaving}
                  className="cursor-pointer"
                />
              </Field>
              {logoPreview && (
                <div className="mt-2">
                  <img 
                    src={logoPreview} 
                    alt="Logo preview" 
                    className="h-20 w-20 object-contain border rounded"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {logoFile ? `Selected: ${logoFile.name}` : "Current logo"}
                  </p>
                </div>
              )}
            </FieldGroup>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="edit-title">Title *</FieldLabel>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Enter developer title"
                  disabled={isSaving}
                />
              </Field>
            </FieldGroup>
            <FieldGroup>
              <Field>
                <FieldLabel>Foundation Date *</FieldLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal cursor-pointer"
                      disabled={isSaving}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {foundationDate ? format(foundationDate, "PPP") : <span className="text-muted-foreground">Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={foundationDate}
                      onSelect={setFoundationDate}
                      initialFocus
                      captionLayout="dropdown"
                      fromYear={1900}
                      toYear={new Date().getFullYear()}
                    />
                  </PopoverContent>
                </Popover>
              </Field>
            </FieldGroup>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Developer</DialogTitle>
            <DialogDescription>
              Create a new developer by filling in the information below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="add-logo">Logo</FieldLabel>
                <Input
                  id="add-logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  disabled={isSaving}
                  className="cursor-pointer"
                />
              </Field>
              {logoPreview && (
                <div className="mt-2">
                  <img 
                    src={logoPreview} 
                    alt="Logo preview" 
                    className="h-20 w-20 object-contain border rounded"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Selected: {logoFile?.name}
                  </p>
                </div>
              )}
            </FieldGroup>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="add-title">Title *</FieldLabel>
                <Input
                  id="add-title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Enter developer title"
                  disabled={isSaving}
                />
              </Field>
            </FieldGroup>
            <FieldGroup>
              <Field>
                <FieldLabel>Foundation Date *</FieldLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal cursor-pointer"
                      disabled={isSaving}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {foundationDate ? format(foundationDate, "PPP") : <span className="text-muted-foreground">Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={foundationDate}
                      onSelect={setFoundationDate}
                      initialFocus
                      captionLayout="dropdown"
                      fromYear={1900}
                      toYear={new Date().getFullYear()}
                    />
                  </PopoverContent>
                </Popover>
              </Field>
            </FieldGroup>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Creating..." : "Create Developer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </RoleBasedLayout>
  )
}

