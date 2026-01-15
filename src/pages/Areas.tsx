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
import { Pencil, Trash2, Plus } from "lucide-react"
import { AdvancedSearchBar, type SearchColumn } from "@/components/shared/AdvancedSearchBar"
import { parseQuery } from "@/lib/query-parser"
import { canViewAreas, canEditAreas } from "@/config/roles"
import { CITIES } from "@/config/cities"

import type { Area } from "@/types/area"
import { TableSkeleton } from "@/components/shared/TableSkeleton"
import { formatError } from "@/lib/error-formatter"
import { toast } from "sonner"

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
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 10
  
  // Column configuration for search bar
  const searchColumns: SearchColumn[] = [
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'city', label: 'City', type: 'text' },
  ]
  const [formData, setFormData] = useState({
    title: "",
    city: "",
  })

  const canView = canViewAreas(employee?.role)
  const canEdit = canEditAreas(employee?.role)

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  const fetchAreas = useCallback(async (page: number = 1) => {
    try {
      setLoading(true)
      setError(null)

      const offset = (page - 1) * itemsPerPage
      const parsed = parseQuery(searchQuery, searchColumns)
      
      // Skip incomplete filters
      const completeFilters = parsed.filters.filter(f => f.value && f.value.trim())
      const effectiveParsed = {
        ...parsed,
        filters: completeFilters
      }
      
      let url = `${supabaseUrl}/rest/v1/area?select=*`
      
      // Add text search
      if (effectiveParsed.textSearch && effectiveParsed.textSearch.trim()) {
        const searchPattern = `*${effectiveParsed.textSearch.trim()}*`
        url += `&or=(title.ilike.${encodeURIComponent(searchPattern)},city.ilike.${encodeURIComponent(searchPattern)})`
      }
      
      // Add filters
      for (const filter of effectiveParsed.filters) {
        const column = searchColumns.find(col => col.key === filter.column)
        if (!column) continue
        
        switch (filter.operator) {
          case '=':
          default:
            url += `&${filter.column}=ilike.${encodeURIComponent(`%${filter.value}%`)}`
            break
        }
      }
      
      // Add sorting
      if (effectiveParsed.sort) {
        url += `&order=${effectiveParsed.sort.column}.${effectiveParsed.sort.direction}`
      }
      
      url += `&limit=${itemsPerPage}&offset=${offset}`

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
      toast.error(formatError(err) || "Failed to fetch areas")
    } finally {
      setLoading(false)
    }
  }, [supabaseUrl, supabaseAnonKey, itemsPerPage, searchQuery, searchColumns])

  useEffect(() => {
    if (!canView) {
      toast.error("You don't have permission to view areas")
      setLoading(false)
      return
    }
    
    // Debounced search
    const timeoutId = setTimeout(() => {
      setCurrentPage(1)
      fetchAreas(1)
    }, searchQuery.trim() ? 1500 : 0)

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView, searchQuery])

  // Fetch when page changes
  useEffect(() => {
    if (!canView) return
    fetchAreas(currentPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView, currentPage])

  const handleSearchApply = useCallback((query: string) => {
    setSearchQuery(query)
    setCurrentPage(1)
  }, [])

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

  const handleDelete = async (areaId: number) => {
    if (!confirm("Are you sure you want to delete this area?")) {
      return
    }

    try {
      setDeletingAreaId(areaId)

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

      await fetchAreas(currentPage, selectedCity)
      toast.success("Area deleted successfully")
    } catch (err: any) {
      console.error("Error deleting area:", err)
      const message = formatError(err) || "Failed to delete area. Please try again."
      toast.error(message)
    } finally {
      setDeletingAreaId(null)
    }
  }

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.city.trim()) {
      toast.error("Please fill in all required fields")
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
      toast.success(editingArea ? "Area updated successfully" : "Area created successfully")
    } catch (err: any) {
      console.error("Error saving area:", err)
      const message = formatError(err) || "Failed to save area"
      toast.error(message)
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

          {/* Unified Search/Filter/Sort Bar */}
          <div className="mb-4">
            <AdvancedSearchBar
              columns={searchColumns}
              value={searchQuery}
              onChange={setSearchQuery}
              onApply={handleSearchApply}
            />
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
                        {searchQuery.trim() 
                          ? "No areas found matching your search."
                          : "No areas found. Click \"Add Area\" to create one."
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
              <Field>
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
              </Field>
            </FieldGroup>
            <FieldGroup>
              <Field>
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
            <DialogTitle>Add New Area</DialogTitle>
            <DialogDescription>
              Create a new area by filling in the information below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <FieldGroup>
              <Field>
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
              </Field>
            </FieldGroup>
            <FieldGroup>
              <Field>
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
              {isSaving ? "Creating..." : "Create Area"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </RoleBasedLayout>
  )
}

