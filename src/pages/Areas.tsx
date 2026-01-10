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
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Pencil, Trash2, Plus, X } from "lucide-react"
import { canViewAreas, canEditAreas } from "@/config/roles"
import { CITIES } from "@/config/cities"

import type { Area } from "@/types/area"
import { TableSkeleton } from "@/components/shared/TableSkeleton"

export default function AreasPage() {
  const { employee } = useAuth()
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingArea, setEditingArea] = useState<Area | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingAreaId, setDeletingAreaId] = useState<number | null>(null)
  const [selectedCity, setSelectedCity] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 10
  const [formData, setFormData] = useState({
    title: "",
    city: "",
  })

  const canView = canViewAreas(employee?.role)
  const canEdit = canEditAreas(employee?.role)

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  const fetchAreas = useCallback(async (page: number = 1, cityFilter?: string) => {
    try {
      setLoading(true)
      setError(null)

      const offset = (page - 1) * itemsPerPage
      let url = `${supabaseUrl}/rest/v1/area?select=*&limit=${itemsPerPage}&offset=${offset}`
      
      // Add city filter if not "all"
      if (cityFilter && cityFilter !== "all") {
        url += `&city=eq.${encodeURIComponent(cityFilter)}`
      }

      const response = await axios.get(url, {
        headers: {
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`,
          "Content-Type": "application/json",
          "Prefer": "count=exact",
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

      setAreas(response.data || [])
    } catch (err: any) {
      console.error("Error fetching areas:", err)
      setError(err.message || "Failed to fetch areas")
    } finally {
      setLoading(false)
    }
  }, [supabaseUrl, supabaseAnonKey, itemsPerPage])

  useEffect(() => {
    if (!canView) {
      setError("You don't have permission to view areas")
      setLoading(false)
      return
    }
    
    // Reset to page 1 when city filter changes
    if (selectedCity !== "all") {
      setCurrentPage(1)
    }
    
    fetchAreas(selectedCity !== "all" ? 1 : currentPage, selectedCity)
  }, [canView, currentPage, selectedCity]) // Removed fetchAreas from dependencies

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  const handleEdit = (area: Area) => {
    setEditingArea(area)
    setFormData({
      title: area.title,
      city: area.city,
    })
    setIsDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingArea(null)
    setFormData({
      title: "",
      city: "",
    })
    setIsAddDialogOpen(true)
  }

  const parseErrorMessage = (errorText: string): string => {
    try {
      const errorJson = JSON.parse(errorText)
      
      // Foreign key constraint violation (code 23503)
      if (errorJson.code === "23503") {
        // Check which table is referencing the area
        if (errorJson.details?.includes("project")) {
          return "Cannot delete this area because it is currently being used by one or more projects. Please remove the area from all projects before deleting it."
        }
        if (errorJson.details?.includes("property")) {
          return "Cannot delete this area because it is currently being used by one or more properties. Please remove the area from all properties before deleting it."
        }
        // Generic foreign key error
        return "Cannot delete this area because it is currently being used by other records. Please remove all references to this area before deleting it."
      }
      
      // Return the message if available, otherwise return generic error
      return errorJson.message || "Failed to delete area. Please try again."
    } catch {
      // If parsing fails, return the original error text or a generic message
      return "Failed to delete area. Please try again."
    }
  }

  const handleDelete = async (areaId: number) => {
    if (!confirm("Are you sure you want to delete this area?")) {
      return
    }

    try {
      setDeletingAreaId(areaId)

      try {
        await axios.delete(
          `${supabaseUrl}/rest/v1/area?id=eq.${areaId}`,
          {
            headers: {
              "apikey": supabaseAnonKey,
              "Authorization": `Bearer ${supabaseAnonKey}`,
              "Content-Type": "application/json",
            },
          }
        )
      } catch (error: any) {
        const errorText = error.response?.data || error.message
        const userFriendlyMessage = parseErrorMessage(typeof errorText === 'string' ? errorText : JSON.stringify(errorText))
        throw new Error(userFriendlyMessage)
      }

      await fetchAreas(currentPage, selectedCity)
    } catch (err: any) {
      console.error("Error deleting area:", err)
      alert(err.message || "Failed to delete area. Please try again.")
    } finally {
      setDeletingAreaId(null)
    }
  }

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.city.trim()) {
      alert("Please fill in all required fields")
      return
    }

    try {
      setIsSaving(true)

      if (editingArea) {
        // Update existing area
        await axios.patch(
          `${supabaseUrl}/rest/v1/area?id=eq.${editingArea.id}`,
          {
            title: formData.title.trim(),
            city: formData.city.trim(),
          },
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
        // Create new area
        await axios.post(
          `${supabaseUrl}/rest/v1/area`,
          {
            title: formData.title.trim(),
            city: formData.city.trim(),
          },
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
      await fetchAreas(currentPage, selectedCity)
    } catch (err: any) {
      console.error("Error saving area:", err)
      alert(err.message || "Failed to save area")
    } finally {
      setIsSaving(false)
    }
  }

  // Areas are already filtered by the API based on selectedCity

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
                  <BreadcrumbPage>Areas</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold">Access Denied</h1>
              <p className="text-muted-foreground mt-2">
                You don't have permission to view areas.
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
                <BreadcrumbPage>Areas</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Areas</h1>
            {canEdit && (
              <Button onClick={handleAdd} className="cursor-pointer">
                <Plus className="mr-2 h-4 w-4" />
                Add Area
              </Button>
            )}
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Filter Section */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FieldLabel htmlFor="city-filter">Filter by City:</FieldLabel>
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger id="city-filter" className="w-[250px]">
                  <SelectValue placeholder="All Cities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {CITIES.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCity !== "all" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedCity("all")}
                  className="cursor-pointer"
                  title="Clear filter"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {selectedCity !== "all" && (
              <span className="text-sm text-muted-foreground">
                Showing {areas.length} area{areas.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {loading ? (
            <TableSkeleton
              columns={4}
              rows={10}
              hasActions={canEdit}
              columnHeaders={["ID", "Title", "City", "Created At"]}
            />
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Created At</TableHead>
                    {canEdit && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {areas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canEdit ? 5 : 4} className="text-center text-muted-foreground">
                        {selectedCity === "all" 
                          ? "No areas found. Click \"Add Area\" to create one."
                          : `No areas found for ${selectedCity}.`
                        }
                      </TableCell>
                    </TableRow>
                  ) : (
                    areas.map((area) => (
                      <TableRow key={area.id}>
                        <TableCell className="font-medium">{area.id}</TableCell>
                        <TableCell>{area.title}</TableCell>
                        <TableCell>{area.city}</TableCell>
                        <TableCell>
                          {area.created_at ? new Date(area.created_at).toISOString().split('T')[0] : '-'}
                        </TableCell>
                        {canEdit && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(area)}
                                className="cursor-pointer"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(area.id)}
                                disabled={deletingAreaId === area.id}
                                className="cursor-pointer"
                              >
                                {deletingAreaId === area.id ? (
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
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
            <DialogTitle>Edit Area</DialogTitle>
            <DialogDescription>
              Update the area information below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <FieldGroup>
              <FieldLabel htmlFor="edit-title">Title *</FieldLabel>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Enter area title"
                disabled={isSaving}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel htmlFor="edit-city">City *</FieldLabel>
              <Select
                value={formData.city}
                onValueChange={(value) =>
                  setFormData({ ...formData, city: value })
                }
                disabled={isSaving}
              >
                <SelectTrigger id="edit-city">
                  <SelectValue placeholder="Select a city" />
                </SelectTrigger>
                <SelectContent>
                  {CITIES.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <DialogTitle>Add New Area</DialogTitle>
            <DialogDescription>
              Create a new area by filling in the information below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <FieldGroup>
              <FieldLabel htmlFor="add-title">Title *</FieldLabel>
              <Input
                id="add-title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Enter area title"
                disabled={isSaving}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel htmlFor="add-city">City *</FieldLabel>
              <Select
                value={formData.city}
                onValueChange={(value) =>
                  setFormData({ ...formData, city: value })
                }
                disabled={isSaving}
              >
                <SelectTrigger id="add-city">
                  <SelectValue placeholder="Select a city" />
                </SelectTrigger>
                <SelectContent>
                  {CITIES.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              {isSaving ? "Creating..." : "Create Area"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </RoleBasedLayout>
  )
}

