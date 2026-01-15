import { useEffect, useState, useCallback } from "react"
import { useParams } from "react-router-dom"
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
import { PROPERTY_TYPES } from "@/config/property-types"
import { useAuth } from "@/contexts/AuthContext"
import { canEditProperties } from "@/config/roles"
import { TableSkeleton } from "@/components/shared/TableSkeleton"
import { formatError } from "@/lib/error-formatter"
import { toast } from "sonner"

import type { Property, PropertyListingType } from "@/types/property"
import type { ProjectBasic } from "@/types/project"

const PROPERTY_LISTING_TYPE_DISPLAY_NAMES: Record<PropertyListingType, string> = {
  live: 'Live Listings',
  pocket: 'Pocket Listings',
  archive: 'Archive', // Kept for type compatibility, but not used in UI
}

const SLUG_TO_LISTING_TYPE: Record<string, PropertyListingType> = {
  'live': 'live',
  'pocket': 'pocket',
}

export default function PropertiesPage() {
  const { type: typeSlug } = useParams<{ type: string }>()
  const listingType = typeSlug ? SLUG_TO_LISTING_TYPE[typeSlug] : undefined
  const { employee } = useAuth()
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  // RBAC: IT, CEO, Admin (roles 0, 1, 2) can CRUD; other roles can view only
  const canEdit = canEditProperties(employee?.role)

  const [properties, setProperties] = useState<Property[]>([])
  const [projects, setProjects] = useState<ProjectBasic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 10
  
  // Column configuration for search bar
  const searchColumns: SearchColumn[] = [
    { key: 'pf_id', label: 'PF ID', type: 'text' },
    { key: 'type', label: 'Type', type: 'text' },
    { key: 'bedrooms', label: 'Bedrooms', type: 'number' },
    { key: 'price', label: 'Price', type: 'number' },
    { key: 'square_meter', label: 'Square Meter', type: 'number' },
  ]
  const [deletingPropertyId, setDeletingPropertyId] = useState<number | null>(null)
  const [editingProperty, setEditingProperty] = useState<Property | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    project_id: "",
    pf_id: "",
    type: "",
    bedrooms: "",
    square_meter: "",
    price: "",
    latitude: "",
    longitude: "",
  })

  const fetchProperties = useCallback(async (page: number = 1) => {
    if (!listingType) return
    
    try {
      setLoading(true)
      setError(null)

      const offset = (page - 1) * itemsPerPage
      const parsed = parseQuery(searchQuery || "", searchColumns)
      
      // Skip incomplete filters
      const completeFilters = parsed.filters.filter(f => f.value && f.value.trim())
      const effectiveParsed = {
        ...parsed,
        filters: completeFilters
      }
      
      let url = `${supabaseUrl}/rest/v1/property?select=*`

      // Filter by pf_id based on listing type
      if (listingType === 'live') {
        url += `&pf_id=not.is.null`
      } else if (listingType === 'pocket') {
        url += `&pf_id=is.null`
      }

      // Add text search (only for live listings, search by pf_id)
      if (effectiveParsed.textSearch && effectiveParsed.textSearch.trim() && listingType === 'live') {
        const searchPattern = `*${effectiveParsed.textSearch.trim()}*`
        url += `&pf_id=ilike.${encodeURIComponent(searchPattern)}`
      }

      // Add filters
      for (const filter of effectiveParsed.filters) {
        const column = searchColumns.find(col => col.key === filter.column)
        if (!column) continue
        
        let filterValue: string | number = filter.value
        if (column.type === 'number') {
          const numValue = parseFloat(filter.value)
          if (!isNaN(numValue)) {
            filterValue = numValue
          } else {
            continue
          }
        }
        
        switch (filter.operator) {
          case '>':
            url += `&${filter.column}=gt.${encodeURIComponent(filterValue)}`
            break
          case '>=':
            url += `&${filter.column}=gte.${encodeURIComponent(filterValue)}`
            break
          case '<':
            url += `&${filter.column}=lt.${encodeURIComponent(filterValue)}`
            break
          case '<=':
            url += `&${filter.column}=lte.${encodeURIComponent(filterValue)}`
            break
          case '!=':
            url += `&${filter.column}=neq.${encodeURIComponent(filterValue)}`
            break
          case '=':
          default:
            if (column.type === 'number') {
              url += `&${filter.column}=eq.${encodeURIComponent(filterValue)}`
            } else {
              url += `&${filter.column}=ilike.${encodeURIComponent(`%${filter.value}%`)}`
            }
            break
        }
      }
      
      // Add sorting
      if (effectiveParsed.sort) {
        url += `&order=${effectiveParsed.sort.column}.${effectiveParsed.sort.direction}`
      } else {
        url += `&order=id.asc`
      }

      url += `&limit=${itemsPerPage}&offset=${offset}`

      const response = await axios.get(
        url,
        {
          headers: {
            "apikey": supabaseAnonKey,
            "Authorization": `Bearer ${supabaseAnonKey}`,
            "Content-Type": "application/json",
            "Prefer": "count=exact",
          },
        }
      )

      const contentRange = response.headers["content-range"]
      if (contentRange) {
        const match = contentRange.match(/\/(\d+)/)
        if (match) {
          setTotalCount(parseInt(match[1], 10))
        }
      }

      setProperties(response.data || [])
    } catch (err: unknown) {
      console.error("Error fetching properties:", err)
      const message = formatError(err) || "Failed to fetch properties"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [supabaseUrl, supabaseAnonKey, itemsPerPage, listingType, searchQuery, searchColumns])

  const fetchProjects = useCallback(async () => {
    try {
      const response = await axios.get(
        `${supabaseUrl}/rest/v1/project?select=id,slug&order=id.asc`,
        {
          headers: {
            "apikey": supabaseAnonKey,
            "Authorization": `Bearer ${supabaseAnonKey}`,
            "Content-Type": "application/json",
          },
        }
      )

      setProjects(response.data || [])
    } catch (err: unknown) {
      console.error("Error fetching projects:", err)
    }
  }, [supabaseUrl, supabaseAnonKey])

  // Reset page when listing type changes
  useEffect(() => {
    if (listingType) {
      fetchProjects()
      setCurrentPage(1)
      setSearchQuery("")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingType]) // fetchProjects is stable, no need to include in deps

  // Main effect: fetch properties when dependencies change
  useEffect(() => {
    if (!listingType) return
    
    // Debounced search
    const timeoutId = setTimeout(() => {
      setCurrentPage(1)
      fetchProperties(1)
    }, searchQuery.trim() ? 1500 : 0)

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingType, searchQuery])

  // Fetch when page changes
  useEffect(() => {
    if (!listingType) return
    fetchProperties(currentPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage])

  const handleSearchApply = useCallback((query: string) => {
    setSearchQuery(query)
    setCurrentPage(1)
  }, [])

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  const getProjectName = (projectId: number | null) => {
    if (!projectId) return "-"
    const project = projects.find((p) => p.id === projectId)
    return project ? project.slug : `Project #${projectId}`
  }

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return "-"
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  // Calculate square meters from latitude and longitude
  // This is a placeholder calculation - modify as needed based on your specific requirements
  const calculateSquareMeter = (latitude: string, longitude: string): string => {
    if (!latitude || !longitude) return ""
    
    const lat = parseFloat(latitude)
    const lng = parseFloat(longitude)
    
    if (isNaN(lat) || isNaN(lng)) return ""
    
    // Placeholder calculation: You can replace this with your specific formula
    // For now, using a simple calculation based on coordinate values
    // This can be adjusted based on your business requirements
    const calculatedArea = Math.abs(lat * lng * 100) / 10
    
    // Round to 2 decimal places
    return calculatedArea.toFixed(2)
  }

  const handleEdit = (property: Property) => {
    const lat = property.latitude?.toString() || ""
    const lng = property.longitude?.toString() || ""
    setEditingProperty(property)
    setFormData({
      project_id: property.project_id?.toString() || "",
      pf_id: property.pf_id || "",
      type: property.type || "",
      bedrooms: property.bedrooms?.toString() || "",
      square_meter: calculateSquareMeter(lat, lng) || property.square_meter?.toString() || "",
      price: property.price?.toString() || "",
      latitude: lat,
      longitude: lng,
    })
    setIsAddDialogOpen(false)
    setIsDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingProperty(null)
    setFormData({
      project_id: "",
      pf_id: "",
      type: "",
      bedrooms: "",
      square_meter: "",
      price: "",
      latitude: "",
      longitude: "",
    })
    setIsDialogOpen(false)
    setIsAddDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError(null)

      const propertyData: Record<string, unknown> = {
        project_id: formData.project_id ? parseInt(formData.project_id) : null,
        pf_id: formData.pf_id?.trim() || null,
        type: formData.type?.trim() || "",
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        square_meter: formData.square_meter ? parseFloat(formData.square_meter) : null,
        price: formData.price ? parseFloat(formData.price) : null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      }

      if (editingProperty) {
        // Update existing property
        await axios.patch(
          `${supabaseUrl}/rest/v1/property?id=eq.${editingProperty.id}`,
          propertyData,
          {
            headers: {
              "apikey": supabaseAnonKey,
              "Authorization": `Bearer ${supabaseAnonKey}`,
              "Content-Type": "application/json",
              "Prefer": "return=minimal",
            },
          }
        )

        setIsDialogOpen(false)
      } else {
        // Create new property
        await axios.post(
          `${supabaseUrl}/rest/v1/property`,
          propertyData,
          {
            headers: {
              "apikey": supabaseAnonKey,
              "Authorization": `Bearer ${supabaseAnonKey}`,
              "Content-Type": "application/json",
              "Prefer": "return=representation",
            },
          }
        )

        setIsAddDialogOpen(false)
      }

      // Refresh the list
      fetchProperties(currentPage)
      setEditingProperty(null)
      setFormData({
        project_id: "",
        pf_id: "",
        type: "",
        bedrooms: "",
        square_meter: "",
        price: "",
        latitude: "",
        longitude: "",
      })
    } catch (err: unknown) {
      console.error("Error saving property:", err)
      const message = formatError(err) || "Failed to save property"
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (propertyId: number) => {
    if (!confirm("Are you sure you want to delete this property?")) {
      return
    }

    try {
      setDeletingPropertyId(propertyId)

      await axios.delete(
        `${supabaseUrl}/rest/v1/property?id=eq.${propertyId}`,
        {
          headers: {
            "apikey": supabaseAnonKey,
            "Authorization": `Bearer ${supabaseAnonKey}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
        }
      )

      // Refresh the list
      fetchProperties(currentPage)
    } catch (err: unknown) {
      console.error("Error deleting property:", err)
      const message = formatError(err) || "Failed to delete property"
      toast.error(message)
    } finally {
      setDeletingPropertyId(null)
    }
  }

  if (!listingType) {
    return (
      <RoleBasedLayout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Invalid Listing Type</h1>
            <p className="text-muted-foreground mt-2">
              Please select a valid listing type from the sidebar.
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
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">Properties</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{PROPERTY_LISTING_TYPE_DISPLAY_NAMES[listingType]}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h1 className="text-2xl font-bold">{PROPERTY_LISTING_TYPE_DISPLAY_NAMES[listingType]}</h1>
            {canEdit && (
              <Button 
                type="button"
                onClick={handleAdd}
                className="cursor-pointer w-full sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Property
              </Button>
            )}
          </div>

          {/* Unified Search/Filter/Sort Bar */}
          <div className="mb-4">
            <AdvancedSearchBar
              columns={searchColumns}
              value={searchQuery}
              onChange={setSearchQuery}
              onApply={handleSearchApply}
            />
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {loading ? (
            <TableSkeleton
              columns={7}
              rows={10}
              hasActions={canEdit}
              columnHeaders={["PF ID", "Project", "Type", "Bedrooms", "Square Meter", "Price", "Created"]}
            />
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>PF ID</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Bedrooms</TableHead>
                    <TableHead>Square Meter</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Created</TableHead>
                    {canEdit && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {properties.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canEdit ? 8 : 7} className="text-center text-muted-foreground">
                        No {PROPERTY_LISTING_TYPE_DISPLAY_NAMES[listingType].toLowerCase()} found. {canEdit && 'Click "Add Property" to create one.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    properties.map((property) => (
                      <TableRow key={property.id}>
                        <TableCell className="font-medium">{property.pf_id || "-"}</TableCell>
                        <TableCell>{getProjectName(property.project_id)}</TableCell>
                        <TableCell>{property.type}</TableCell>
                        <TableCell>{property.bedrooms ?? "-"}</TableCell>
                        <TableCell>{property.square_meter ? `${property.square_meter} m²` : "-"}</TableCell>
                        <TableCell>{formatPrice(property.price)}</TableCell>
                        <TableCell>{new Date(property.created_at).toISOString().split('T')[0]}</TableCell>
                        {canEdit && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(property)}
                                className="cursor-pointer"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(property.id)}
                                disabled={deletingPropertyId === property.id}
                                className="cursor-pointer"
                              >
                                {deletingPropertyId === property.id ? (
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
            <DialogDescription>
              Update the property information below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {isSaving && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Saving...
              </div>
            )}
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="edit-project">Project</FieldLabel>
                <Select
                  value={formData.project_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, project_id: value === "none" ? "" : value })}
                  disabled={isSaving}
                >
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="cursor-pointer">None</SelectItem>
                    {projects && projects.length > 0 && projects.map((project) => (
                      <SelectItem key={project.id} value={project.id.toString()} className="cursor-pointer">
                        {project.slug}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-pf-id">PF ID</FieldLabel>
                <Input
                  id="edit-pf-id"
                  value={formData.pf_id || ""}
                  onChange={(e) => setFormData({ ...formData, pf_id: e.target.value })}
                  placeholder="PF-10239"
                  disabled={isSaving}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-type">Type</FieldLabel>
                <Select
                  value={formData.type || ""}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                  disabled={isSaving}
                >
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((type) => (
                      <SelectItem key={type} value={type} className="cursor-pointer">
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-bedrooms">Bedrooms</FieldLabel>
                <Input
                  id="edit-bedrooms"
                  type="number"
                  value={formData.bedrooms || ""}
                  onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                  placeholder="3"
                  disabled={isSaving}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-square-meter">Square Meter</FieldLabel>
                <Input
                  id="edit-square-meter"
                  type="number"
                  step="any"
                  value={formData.square_meter || ""}
                  placeholder="92.5"
                  disabled={true}
                  readOnly
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-price">Price (AED)</FieldLabel>
                <Input
                  id="edit-price"
                  type="number"
                  value={formData.price || ""}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="120000"
                  disabled={isSaving}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="edit-latitude">Latitude</FieldLabel>
                  <Input
                    id="edit-latitude"
                    type="number"
                    step="any"
                    value={formData.latitude || ""}
                    onChange={(e) => {
                      const newLat = e.target.value
                      const newLng = formData.longitude || ""
                      const calculatedSquareMeter = calculateSquareMeter(newLat, newLng)
                      setFormData({ ...formData, latitude: newLat, square_meter: calculatedSquareMeter })
                    }}
                    placeholder="41.311081"
                    disabled={isSaving}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-longitude">Longitude</FieldLabel>
                  <Input
                    id="edit-longitude"
                    type="number"
                    step="any"
                    value={formData.longitude || ""}
                    onChange={(e) => {
                      const newLng = e.target.value
                      const newLat = formData.latitude || ""
                      const calculatedSquareMeter = calculateSquareMeter(newLat, newLng)
                      setFormData({ ...formData, longitude: newLng, square_meter: calculatedSquareMeter })
                    }}
                    placeholder="69.240562"
                    disabled={isSaving}
                  />
                </Field>
              </div>
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
            <Button onClick={handleSave} disabled={isSaving} className="cursor-pointer">
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Property</DialogTitle>
            <DialogDescription>
              Create a new property by filling in the information below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {isSaving && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Creating...
              </div>
            )}
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="add-project">Project</FieldLabel>
                <Select
                  value={formData.project_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, project_id: value === "none" ? "" : value })}
                  disabled={isSaving}
                >
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="cursor-pointer">None</SelectItem>
                    {projects && projects.length > 0 && projects.map((project) => (
                      <SelectItem key={project.id} value={project.id.toString()} className="cursor-pointer">
                        {project.slug}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="add-pf-id">PF ID</FieldLabel>
                <Input
                  id="add-pf-id"
                  value={formData.pf_id || ""}
                  onChange={(e) => setFormData({ ...formData, pf_id: e.target.value })}
                  placeholder="PF-10239"
                  disabled={isSaving}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="add-type">Type</FieldLabel>
                <Select
                  value={formData.type || ""}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                  disabled={isSaving}
                >
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((type) => (
                      <SelectItem key={type} value={type} className="cursor-pointer">
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="add-bedrooms">Bedrooms</FieldLabel>
                <Input
                  id="add-bedrooms"
                  type="number"
                  value={formData.bedrooms || ""}
                  onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                  placeholder="3"
                  disabled={isSaving}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="add-square-meter">Square Meter</FieldLabel>
                <Input
                  id="add-square-meter"
                  type="number"
                  step="any"
                  value={formData.square_meter || ""}
                  placeholder="92.5"
                  disabled={true}
                  readOnly
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="add-price">Price (AED)</FieldLabel>
                <Input
                  id="add-price"
                  type="number"
                  value={formData.price || ""}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="120000"
                  disabled={isSaving}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="add-latitude">Latitude</FieldLabel>
                  <Input
                    id="add-latitude"
                    type="number"
                    step="any"
                    value={formData.latitude || ""}
                    onChange={(e) => {
                      const newLat = e.target.value
                      const newLng = formData.longitude || ""
                      const calculatedSquareMeter = calculateSquareMeter(newLat, newLng)
                      setFormData({ ...formData, latitude: newLat, square_meter: calculatedSquareMeter })
                    }}
                    placeholder="41.311081"
                    disabled={isSaving}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="add-longitude">Longitude</FieldLabel>
                  <Input
                    id="add-longitude"
                    type="number"
                    step="any"
                    value={formData.longitude || ""}
                    onChange={(e) => {
                      const newLng = e.target.value
                      const newLat = formData.latitude || ""
                      const calculatedSquareMeter = calculateSquareMeter(newLat, newLng)
                      setFormData({ ...formData, longitude: newLng, square_meter: calculatedSquareMeter })
                    }}
                    placeholder="69.240562"
                    disabled={isSaving}
                  />
                </Field>
              </div>
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
            <Button onClick={handleSave} disabled={isSaving} className="cursor-pointer">
              {isSaving ? "Creating..." : "Create Property"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </RoleBasedLayout>
  )
}

