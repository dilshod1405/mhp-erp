import { useEffect, useState, useCallback } from "react"
import { useParams } from "react-router-dom"
import { useIsMobile } from "@/hooks/use-mobile"
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
import { Search, X, Pencil, Trash2, Plus, Filter } from "lucide-react"
import { PROPERTY_TYPES } from "@/config/property-types"
import { useAuth } from "@/contexts/AuthContext"
import { canEditProperties } from "@/config/roles"
import ArchivePage from "./Archive"
import { TableSkeleton } from "@/components/shared/TableSkeleton"

import type { Property, PropertyListingType } from "@/types/property"
import type { ProjectBasic } from "@/types/project"

const PROPERTY_LISTING_TYPE_DISPLAY_NAMES: Record<PropertyListingType, string> = {
  live: 'Live Listings',
  pocket: 'Pocket Listings',
  archive: 'Archive',
}

const SLUG_TO_LISTING_TYPE: Record<string, PropertyListingType> = {
  'live': 'live',
  'pocket': 'pocket',
  'archive': 'archive',
}

export default function PropertiesPage() {
  const { type: typeSlug } = useParams<{ type: string }>()
  const listingType = typeSlug ? SLUG_TO_LISTING_TYPE[typeSlug] : undefined
  const isMobile = useIsMobile()
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
  const [filterProject, setFilterProject] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterBedrooms, setFilterBedrooms] = useState<string>("all")
  const [filterPriceMin, setFilterPriceMin] = useState<string>("")
  const [filterPriceMax, setFilterPriceMax] = useState<string>("")
  // Applied filters (used for actual API calls)
  const [appliedFilterProject, setAppliedFilterProject] = useState<string>("all")
  const [appliedFilterType, setAppliedFilterType] = useState<string>("all")
  const [appliedFilterBedrooms, setAppliedFilterBedrooms] = useState<string>("all")
  const [appliedFilterPriceMin, setAppliedFilterPriceMin] = useState<string>("")
  const [appliedFilterPriceMax, setAppliedFilterPriceMax] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(1)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 10
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

  const fetchProperties = useCallback(async (searchTerm?: string, page: number = 1) => {
    if (!listingType) return
    
    try {
      setLoading(true)
      setError(null)

      const offset = (page - 1) * itemsPerPage
      let url = `${supabaseUrl}/rest/v1/property?select=*`

      // Filter by pf_id based on listing type
      if (listingType === 'live') {
        url += `&pf_id=not.is.null`
      } else if (listingType === 'pocket') {
        url += `&pf_id=is.null`
      }
      // Archive will be handled later

      // Add search filter if search term exists (search by pf_id)
      if (searchTerm && searchTerm.trim() && listingType === 'live') {
        const searchPattern = `*${searchTerm.trim()}*`
        url += `&pf_id=ilike.${encodeURIComponent(searchPattern)}`
      }

      // Add project filter
      if (appliedFilterProject && appliedFilterProject !== "all") {
        url += `&project_id=eq.${appliedFilterProject}`
      }

      // Add type filter
      if (appliedFilterType && appliedFilterType !== "all") {
        url += `&type=eq.${encodeURIComponent(appliedFilterType)}`
      }

      // Add bedrooms filter
      if (appliedFilterBedrooms && appliedFilterBedrooms !== "all") {
        url += `&bedrooms=eq.${appliedFilterBedrooms}`
      }

      // Add price filters
      if (appliedFilterPriceMin) {
        url += `&price=gte.${appliedFilterPriceMin}`
      }
      if (appliedFilterPriceMax) {
        url += `&price=lte.${appliedFilterPriceMax}`
      }

      url += `&limit=${itemsPerPage}&offset=${offset}&order=id.asc`

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
      const message = err instanceof Error ? err.message : "Failed to fetch properties"
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [supabaseUrl, supabaseAnonKey, itemsPerPage, listingType, appliedFilterProject, appliedFilterType, appliedFilterBedrooms, appliedFilterPriceMin, appliedFilterPriceMax])

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

  // Reset filters and page when listing type changes
  useEffect(() => {
    if (listingType) {
      fetchProjects()
      setCurrentPage(1)
      setAppliedFilterProject("all")
      setAppliedFilterType("all")
      setAppliedFilterBedrooms("all")
      setAppliedFilterPriceMin("")
      setAppliedFilterPriceMax("")
      setFilterProject("all")
      setFilterType("all")
      setFilterBedrooms("all")
      setFilterPriceMin("")
      setFilterPriceMax("")
      setSearchQuery("")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingType]) // fetchProjects is stable, no need to include in deps

  // Main effect: fetch properties when dependencies change
  useEffect(() => {
    if (!listingType) return
    
    fetchProperties(searchQuery || undefined, currentPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingType, currentPage, searchQuery, appliedFilterProject, appliedFilterType, appliedFilterBedrooms, appliedFilterPriceMin, appliedFilterPriceMax]) // fetchProperties is stable, no need to include in deps

  const handleSearch = useCallback(() => {
    setCurrentPage(1)
    fetchProperties(searchQuery || undefined, 1)
  }, [searchQuery, fetchProperties])

  const applyFilters = () => {
    setCurrentPage(1)
    setAppliedFilterProject(filterProject)
    setAppliedFilterType(filterType)
    setAppliedFilterBedrooms(filterBedrooms)
    setAppliedFilterPriceMin(filterPriceMin)
    setAppliedFilterPriceMax(filterPriceMax)
  }

  const clearFilters = () => {
    setFilterProject("all")
    setFilterType("all")
    setFilterBedrooms("all")
    setFilterPriceMin("")
    setFilterPriceMax("")
    setAppliedFilterProject("all")
    setAppliedFilterType("all")
    setAppliedFilterBedrooms("all")
    setAppliedFilterPriceMin("")
    setAppliedFilterPriceMax("")
    setCurrentPage(1)
  }

  const hasFilterChanges =
    filterProject !== appliedFilterProject ||
    filterType !== appliedFilterType ||
    filterBedrooms !== appliedFilterBedrooms ||
    filterPriceMin !== appliedFilterPriceMin ||
    filterPriceMax !== appliedFilterPriceMax

  const hasActiveFilters =
    appliedFilterProject !== "all" ||
    appliedFilterType !== "all" ||
    appliedFilterBedrooms !== "all" ||
    appliedFilterPriceMin !== "" ||
    appliedFilterPriceMax !== ""

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
      fetchProperties(searchQuery || undefined, currentPage)
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
      const message = err instanceof Error ? err.message : "Failed to save property"
      setError(message)
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
      fetchProperties(searchQuery || undefined, currentPage)
    } catch (err: unknown) {
      console.error("Error deleting property:", err)
      const message = err instanceof Error ? err.message : "Failed to delete property"
      setError(message)
      alert(message)
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

  // Archive page - full implementation
  if (listingType === 'archive') {
    return <ArchivePage />
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

          {/* Search Bar and Filter Button */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Input
                type="text"
                placeholder="Search by PF ID..."
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
                disabled={listingType !== 'live'}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 cursor-pointer"
                title="Search"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="cursor-pointer"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Advanced Filters - Desktop (toggleable, hidden on mobile) */}
          {isFilterOpen && !isMobile && (
            <div className="hidden md:flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <FieldLabel htmlFor="filter-project">Project:</FieldLabel>
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger id="filter-project" className="w-[200px] cursor-pointer">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="cursor-pointer">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()} className="cursor-pointer">
                      {project.slug}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <FieldLabel htmlFor="filter-type">Type:</FieldLabel>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger id="filter-type" className="w-[150px] cursor-pointer">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="cursor-pointer">All Types</SelectItem>
                  {PROPERTY_TYPES.map((type) => (
                    <SelectItem key={type} value={type} className="cursor-pointer">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <FieldLabel htmlFor="filter-bedrooms">Bedrooms:</FieldLabel>
              <Select value={filterBedrooms} onValueChange={setFilterBedrooms}>
                <SelectTrigger id="filter-bedrooms" className="w-[150px] cursor-pointer">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="cursor-pointer">All</SelectItem>
                  <SelectItem value="0" className="cursor-pointer">Studio</SelectItem>
                  <SelectItem value="1" className="cursor-pointer">1</SelectItem>
                  <SelectItem value="2" className="cursor-pointer">2</SelectItem>
                  <SelectItem value="3" className="cursor-pointer">3</SelectItem>
                  <SelectItem value="4" className="cursor-pointer">4</SelectItem>
                  <SelectItem value="5" className="cursor-pointer">5+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <FieldLabel htmlFor="filter-price-min">Price Min:</FieldLabel>
              <Input
                id="filter-price-min"
                type="number"
                placeholder="Min"
                value={filterPriceMin}
                onChange={(e) => setFilterPriceMin(e.target.value)}
                className="w-[120px] cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2">
              <FieldLabel htmlFor="filter-price-max">Price Max:</FieldLabel>
              <Input
                id="filter-price-max"
                type="number"
                placeholder="Max"
                value={filterPriceMax}
                onChange={(e) => setFilterPriceMax(e.target.value)}
                className="w-[120px] cursor-pointer"
              />
            </div>

            <Button
              onClick={applyFilters}
              className="cursor-pointer"
              disabled={!hasFilterChanges}
            >
              Apply Filters
            </Button>

            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="cursor-pointer"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>
          )}

          {/* Filter Dialog - Mobile/Tablet only */}
          <Dialog 
            open={isFilterOpen && isMobile} 
            onOpenChange={(open) => {
              // Only handle dialog close on mobile
              if (isMobile) {
                setIsFilterOpen(open)
              }
            }}
          >
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Filters</DialogTitle>
                <DialogDescription>
                  Apply filters to refine your search results.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Field>
                  <FieldLabel htmlFor="sheet-filter-project">Project</FieldLabel>
                  <Select value={filterProject} onValueChange={setFilterProject}>
                    <SelectTrigger id="sheet-filter-project" className="cursor-pointer">
                      <SelectValue placeholder="All Projects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="cursor-pointer">All Projects</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id.toString()} className="cursor-pointer">
                          {project.slug}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="sheet-filter-type">Type</FieldLabel>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger id="sheet-filter-type" className="cursor-pointer">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="cursor-pointer">All Types</SelectItem>
                      {PROPERTY_TYPES.map((type) => (
                        <SelectItem key={type} value={type} className="cursor-pointer">
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="sheet-filter-bedrooms">Bedrooms</FieldLabel>
                  <Select value={filterBedrooms} onValueChange={setFilterBedrooms}>
                    <SelectTrigger id="sheet-filter-bedrooms" className="cursor-pointer">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="cursor-pointer">All</SelectItem>
                      <SelectItem value="0" className="cursor-pointer">Studio</SelectItem>
                      <SelectItem value="1" className="cursor-pointer">1</SelectItem>
                      <SelectItem value="2" className="cursor-pointer">2</SelectItem>
                      <SelectItem value="3" className="cursor-pointer">3</SelectItem>
                      <SelectItem value="4" className="cursor-pointer">4</SelectItem>
                      <SelectItem value="5" className="cursor-pointer">5+</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="sheet-filter-price-min">Price Min</FieldLabel>
                  <Input
                    id="sheet-filter-price-min"
                    type="number"
                    placeholder="Min"
                    value={filterPriceMin}
                    onChange={(e) => setFilterPriceMin(e.target.value)}
                    className="cursor-pointer"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="sheet-filter-price-max">Price Max</FieldLabel>
                  <Input
                    id="sheet-filter-price-max"
                    type="number"
                    placeholder="Max"
                    value={filterPriceMax}
                    onChange={(e) => setFilterPriceMax(e.target.value)}
                    className="cursor-pointer"
                  />
                </Field>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => {
                      applyFilters()
                      setIsFilterOpen(false)
                    }}
                    className="flex-1 cursor-pointer"
                    disabled={!hasFilterChanges}
                  >
                    Apply Filters
                  </Button>
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        clearFilters()
                        setIsFilterOpen(false)
                      }}
                      className="cursor-pointer"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

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

