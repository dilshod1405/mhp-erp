import { useEffect, useState, useCallback } from "react"
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
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
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Search,
  X,
  Filter,
  Upload,
  CalendarIcon,
  DollarSign,
  MapPin,
  Building2,
  Hash,
  Square,
  CheckCircle2,
  Home,
  Bed,
  User,
  Phone,
  PhoneCall,
  Smartphone,
  Globe,
  CreditCard,
  FileText,
  Calendar,
  Trash2,
} from "lucide-react"
import { PROPERTY_TYPES } from "@/config/property-types"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { canEditProperties } from "@/config/roles"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { format } from "date-fns"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { TableSkeleton } from "@/components/shared/TableSkeleton"

import type { PropertyTransaction } from "@/types/archive"

export default function ArchivePage() {
  const isMobile = useIsMobile()
  const { employee } = useAuth()
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  
  // RBAC: Only IT, CEO, Admin (roles 0, 1, 2) can upload Excel files
  const canUpload = canEditProperties(employee?.role)
  
  const [properties, setProperties] = useState<PropertyTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<PropertyTransaction | null>(null)
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Available areas for dropdown
  const [availableAreas, setAvailableAreas] = useState<string[]>([])
  const [loadingAreas, setLoadingAreas] = useState(false)
  const [isAreaSelectOpen, setIsAreaSelectOpen] = useState(false)
  
  // Filter states (UI)
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>(undefined)
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>(undefined)
  const [filterArea, setFilterArea] = useState("all")
  const [filterPropertyType, setFilterPropertyType] = useState("all")
  const [filterPriceMin, setFilterPriceMin] = useState("")
  const [filterPriceMax, setFilterPriceMax] = useState("")
  const [filterOwnerName, setFilterOwnerName] = useState("")
  const [filterUnitNumber, setFilterUnitNumber] = useState("")
  const [filterMobile, setFilterMobile] = useState("")
  
  // Applied filters (for API calls)
  const [appliedFilters, setAppliedFilters] = useState<{
    dateFrom?: string
    dateTo?: string
    area?: string
    propertyType?: string
    priceMin?: string
    priceMax?: string
    ownerName?: string
    unitNumber?: string
    mobile?: string
    searchVector?: string
  }>({})
  
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 50
  
  const fetchProperties = useCallback(async (page: number = 1) => {
    try {
      setLoading(true)
      setError(null)
      
      const offset = (page - 1) * itemsPerPage
      
      // Build query using Supabase client
      let query = supabase
        .from("property_transaction")
        .select("*", { count: "exact" })
      
      // Apply text search using textSearch method first (MUHIM)
      if (appliedFilters.searchVector) {
        query = query.textSearch("search_vector", appliedFilters.searchVector.trim(), {
          type: "plain",
          config: "simple",
        })
      }
      
      // Apply filters
      if (appliedFilters.dateFrom) {
        query = query.gte("date", appliedFilters.dateFrom)
      }
      if (appliedFilters.dateTo) {
        query = query.lte("date", appliedFilters.dateTo)
      }
      if (appliedFilters.area) {
        query = query.eq("area_and_community", appliedFilters.area)
      }
      if (appliedFilters.propertyType && appliedFilters.propertyType !== "all") {
        query = query.eq("property_type", appliedFilters.propertyType)
      }
      if (appliedFilters.priceMin) {
        query = query.gte("price", appliedFilters.priceMin)
      }
      if (appliedFilters.priceMax) {
        query = query.lte("price", appliedFilters.priceMax)
      }
      if (appliedFilters.ownerName) {
        query = query.ilike("owner_name", `%${appliedFilters.ownerName}%`)
      }
      if (appliedFilters.unitNumber) {
        query = query.ilike("unit_number", `%${appliedFilters.unitNumber}%`)
      }
      if (appliedFilters.mobile) {
        query = query.ilike("mobile1", `%${appliedFilters.mobile}%`)
      }
      
      // Apply ordering, limit, and offset
      query = query
        .order("date", { ascending: false })
        .range(offset, offset + itemsPerPage - 1)
      
      const { data, error, count } = await query
      
      if (error) {
        throw new Error(`Failed to fetch properties: ${error.message}`)
      }
      
      if (count !== null) {
        setTotalCount(count)
      }
      
      setProperties(data || [])
    } catch (err: unknown) {
      console.error("Error fetching properties:", err)
      const message = err instanceof Error ? err.message : "Failed to fetch properties"
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [appliedFilters, itemsPerPage])
  
  // Fetch available areas for dropdown
  const fetchAvailableAreas = useCallback(async () => {
    try {
      setLoadingAreas(true)
      console.log("Fetching areas from property_transaction table...")
      
      // Fetch all area_and_community values - use pagination to get all records
      let allData: { area_and_community: string | null }[] = []
      let from = 0
      const pageSize = 1000
      let hasMore = true
      
      while (hasMore) {
        const { data, error, count } = await supabase
          .from("property_transaction")
          .select("area_and_community", { count: 'exact' })
          .not("area_and_community", "is", null)
          .range(from, from + pageSize - 1)
        
        if (error) {
          console.error("Error fetching areas:", error)
          setError(`Failed to fetch areas: ${error.message}`)
          return
        }
        
        if (data && data.length > 0) {
          allData = [...allData, ...data]
          from += pageSize
          hasMore = data.length === pageSize && (count === null || from < count)
        } else {
          hasMore = false
        }
      }
      
      console.log("Raw area data received:", allData.length, "rows")
      
      // Get unique area values, filter out nulls and empty strings, and sort
      const uniqueAreas = Array.from(
        new Set(
          allData
            .map((item) => item.area_and_community)
            .filter((area): area is string => Boolean(area && area.trim()))
        )
      ).sort()
      
      console.log("Unique areas found:", uniqueAreas.length, uniqueAreas)
      setAvailableAreas(uniqueAreas)
    } catch (err) {
      console.error("Error fetching areas:", err)
      setError(`Failed to fetch areas: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoadingAreas(false)
    }
  }, [])
  
  // Sync searchQuery state with appliedFilters.searchVector to keep search input in sync
  useEffect(() => {
    if (appliedFilters.searchVector && searchQuery !== appliedFilters.searchVector) {
      setSearchQuery(appliedFilters.searchVector)
    } else if (!appliedFilters.searchVector && searchQuery) {
      // Don't clear searchQuery if searchVector was removed - let user clear it manually
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters.searchVector])

  useEffect(() => {
    fetchProperties(currentPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, appliedFilters]) // fetchProperties is stable, no need to include in deps
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError("Please upload an Excel file (.xlsx or .xls)")
      return
    }
    
    try {
      setUploading(true)
      setError(null)
      
      // Get access token from current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.access_token) {
        console.error("Session error:", sessionError)
        throw new Error("No active session. Please log in again.")
      }
      
      const formData = new FormData()
      formData.append('file', file)
      
      console.log("Uploading file:", file.name, "Size:", file.size, "Type:", file.type)
      console.log("Using token:", session.access_token.substring(0, 20) + "...")
      
      const response = await axios.post(
        `${supabaseUrl}/functions/v1/upload-property-excel`,
        formData,
        {
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            // Do NOT set Content-Type - axios will set it automatically with boundary for FormData
          },
        }
      )
      
      console.log("Upload response status:", response.status, response.statusText)
      console.log("Upload successful:", response.data)
      
      // Refresh properties after successful upload
      await fetchProperties(currentPage)
    } catch (err: unknown) {
      console.error("Error uploading file:", err)
      const message = err instanceof Error ? err.message : "Failed to upload file"
      setError(message)
    } finally {
      setUploading(false)
      // Reset file input
      event.target.value = ""
    }
  }
  
  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      setAppliedFilters(prev => ({
        ...prev,
        searchVector: searchQuery.trim(),
      }))
    } else {
      setAppliedFilters(prev => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { searchVector, ...rest } = prev
        return rest
      })
    }
    setCurrentPage(1)
  }, [searchQuery])
  
  const applyFilters = () => {
    setAppliedFilters(prev => {
      const newFilters = {
        ...prev, // Preserve existing searchVector and other applied filters
        dateFrom: filterDateFrom ? filterDateFrom.toISOString().split('T')[0] : undefined,
        dateTo: filterDateTo ? filterDateTo.toISOString().split('T')[0] : undefined,
        area: filterArea !== "all" ? filterArea : undefined,
        propertyType: filterPropertyType !== "all" ? filterPropertyType : undefined,
        priceMin: filterPriceMin || undefined,
        priceMax: filterPriceMax || undefined,
        ownerName: filterOwnerName || undefined,
        unitNumber: filterUnitNumber || undefined,
        mobile: filterMobile || undefined,
      }
      // Ensure searchVector is preserved from either prev or current searchQuery
      if (prev.searchVector) {
        newFilters.searchVector = prev.searchVector
      } else if (searchQuery.trim()) {
        newFilters.searchVector = searchQuery.trim()
      }
      return newFilters
    })
    setCurrentPage(1)
  }
  
  const clearFilters = () => {
    setFilterDateFrom(undefined)
    setFilterDateTo(undefined)
    setFilterArea("all")
    setFilterPropertyType("all")
    setFilterPriceMin("")
    setFilterPriceMax("")
    setFilterOwnerName("")
    setFilterUnitNumber("")
    setFilterMobile("")
    setSearchQuery("")
    setAppliedFilters({})
    setCurrentPage(1)
  }
  
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return
    
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} propert(ies)? This action cannot be undone.`)) {
      return
    }
    
    try {
      setIsDeleting(true)
      setError(null)
      
      // Get access token from current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.access_token) {
        throw new Error("No active session. Please log in again.")
      }
      
      // Delete transactions one by one (Supabase doesn't support bulk delete easily)
      const idsArray = Array.from(selectedIds)
      const deletePromises = idsArray.map(async (id) => {
        await axios.delete(
          `${supabaseUrl}/rest/v1/property_transaction?id=eq.${id}`,
          {
            headers: {
              "apikey": supabaseAnonKey,
              "Authorization": `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
          }
        )
      })
      
      await Promise.all(deletePromises)
      
      // Clear selection and refresh properties
      setSelectedIds(new Set())
      await fetchProperties(currentPage)
    } catch (err: unknown) {
      console.error("Error deleting properties:", err)
      const message = err instanceof Error ? err.message : "Failed to delete properties"
      setError(message)
    } finally {
      setIsDeleting(false)
    }
  }
  
  const totalPages = Math.ceil(totalCount / itemsPerPage)
  
  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return "-"
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-"
    return dateString.split('T')[0]
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
                <BreadcrumbPage>Archive</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Archive</h1>
          </div>
          
          {/* Upload Section - Only for IT, CEO, Admin */}
          {canUpload && (
            <div className="flex items-center gap-4 flex-wrap mb-4">
              <div className="relative">
                <input
                  type="file"
                  id="excel-upload"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <label htmlFor="excel-upload">
                  <Button
                    variant="outline"
                    className="cursor-pointer"
                    disabled={uploading}
                    asChild
                  >
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? "Uploading..." : "Upload Excel File"}
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          )}
          
          {/* Search Bar and Filter Button */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Input
                type="text"
                placeholder="Search by full text..."
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
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/50">
              <Field>
                <FieldLabel htmlFor="filter-date-from">Date From</FieldLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="filter-date-from"
                      variant="outline"
                      className="w-full justify-start text-left font-normal cursor-pointer"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filterDateFrom ? format(filterDateFrom, "PPP") : <span className="text-muted-foreground">Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={filterDateFrom}
                      onSelect={setFilterDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </Field>
              
              <Field>
                <FieldLabel htmlFor="filter-date-to">Date To</FieldLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="filter-date-to"
                      variant="outline"
                      className="w-full justify-start text-left font-normal cursor-pointer"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filterDateTo ? format(filterDateTo, "PPP") : <span className="text-muted-foreground">Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={filterDateTo}
                      onSelect={setFilterDateTo}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </Field>
              
              <Field>
                <FieldLabel htmlFor="filter-area">Area</FieldLabel>
                <Select 
                  value={filterArea} 
                  onValueChange={setFilterArea}
                  open={isAreaSelectOpen}
                  onOpenChange={(open) => {
                    setIsAreaSelectOpen(open)
                    if (open && !loadingAreas) {
                      console.log("Area dropdown opened, fetching areas...")
                      fetchAvailableAreas()
                    }
                  }}
                  disabled={loadingAreas}
                >
                  <SelectTrigger id="filter-area" className="cursor-pointer">
                    <SelectValue placeholder={loadingAreas ? "Loading areas..." : "All Areas"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="cursor-pointer">All Areas</SelectItem>
                    {availableAreas.length > 0 ? (
                      availableAreas.map((area) => (
                        <SelectItem key={area} value={area} className="cursor-pointer">
                          {area}
                        </SelectItem>
                      ))
                    ) : (
                      !loadingAreas && (
                        <SelectItem value="no-areas" disabled className="cursor-pointer">
                          No areas found
                        </SelectItem>
                      )
                    )}
                    {loadingAreas && (
                      <SelectItem value="loading" disabled className="cursor-pointer">
                        Loading...
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </Field>
              
              <Field>
                <FieldLabel htmlFor="filter-property-type">Property Type</FieldLabel>
                <Select value={filterPropertyType} onValueChange={setFilterPropertyType}>
                  <SelectTrigger id="filter-property-type" className="cursor-pointer">
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
                <FieldLabel htmlFor="filter-price-min">Price Min</FieldLabel>
                <Input
                  id="filter-price-min"
                  type="number"
                  placeholder="Min"
                  value={filterPriceMin}
                  onChange={(e) => setFilterPriceMin(e.target.value)}
                  className="cursor-pointer"
                />
              </Field>
              
              <Field>
                <FieldLabel htmlFor="filter-price-max">Price Max</FieldLabel>
                <Input
                  id="filter-price-max"
                  type="number"
                  placeholder="Max"
                  value={filterPriceMax}
                  onChange={(e) => setFilterPriceMax(e.target.value)}
                  className="cursor-pointer"
                />
              </Field>
              
              <Field>
                <FieldLabel htmlFor="filter-owner-name">Owner Name</FieldLabel>
                <Input
                  id="filter-owner-name"
                  type="text"
                  placeholder="Owner Name"
                  value={filterOwnerName}
                  onChange={(e) => setFilterOwnerName(e.target.value)}
                  className="cursor-pointer"
                />
              </Field>
              
              <Field>
                <FieldLabel htmlFor="filter-unit-number">Unit Number</FieldLabel>
                <Input
                  id="filter-unit-number"
                  type="text"
                  placeholder="Unit Number"
                  value={filterUnitNumber}
                  onChange={(e) => setFilterUnitNumber(e.target.value)}
                  className="cursor-pointer"
                />
              </Field>
              
              <Field>
                <FieldLabel htmlFor="filter-mobile">Mobile</FieldLabel>
                <Input
                  id="filter-mobile"
                  type="text"
                  placeholder="Mobile"
                  value={filterMobile}
                  onChange={(e) => setFilterMobile(e.target.value)}
                  className="cursor-pointer"
                />
              </Field>
              
              <div className="flex items-end gap-2 col-span-full">
                <Button
                  onClick={applyFilters}
                  className="cursor-pointer"
                >
                  Apply Filters
                </Button>
                
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="cursor-pointer"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
          
          {/* Filter Dialog - Mobile/Tablet only */}
          <Dialog 
            open={isFilterOpen && isMobile} 
            onOpenChange={(open) => {
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
                  <FieldLabel htmlFor="sheet-filter-date-from">Date From</FieldLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="sheet-filter-date-from"
                        variant="outline"
                        className="w-full justify-start text-left font-normal cursor-pointer"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filterDateFrom ? format(filterDateFrom, "PPP") : <span className="text-muted-foreground">Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={filterDateFrom}
                        onSelect={setFilterDateFrom}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </Field>
                
                <Field>
                  <FieldLabel htmlFor="sheet-filter-date-to">Date To</FieldLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="sheet-filter-date-to"
                        variant="outline"
                        className="w-full justify-start text-left font-normal cursor-pointer"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filterDateTo ? format(filterDateTo, "PPP") : <span className="text-muted-foreground">Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={filterDateTo}
                        onSelect={setFilterDateTo}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </Field>
                
                <Field>
                  <FieldLabel htmlFor="sheet-filter-area">Area</FieldLabel>
                  <Select 
                    value={filterArea} 
                    onValueChange={setFilterArea}
                    open={isAreaSelectOpen}
                    onOpenChange={(open) => {
                      setIsAreaSelectOpen(open)
                      if (open && !loadingAreas) {
                        console.log("Area dropdown opened (mobile), fetching areas...")
                        fetchAvailableAreas()
                      }
                    }}
                    disabled={loadingAreas}
                  >
                    <SelectTrigger id="sheet-filter-area" className="cursor-pointer">
                      <SelectValue placeholder={loadingAreas ? "Loading areas..." : "All Areas"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="cursor-pointer">All Areas</SelectItem>
                      {availableAreas.length > 0 ? (
                        availableAreas.map((area) => (
                          <SelectItem key={area} value={area} className="cursor-pointer">
                            {area}
                          </SelectItem>
                        ))
                      ) : (
                        !loadingAreas && (
                          <SelectItem value="no-areas" disabled className="cursor-pointer">
                            No areas found
                          </SelectItem>
                        )
                      )}
                      {loadingAreas && (
                        <SelectItem value="loading" disabled className="cursor-pointer">
                          Loading...
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </Field>
                
                <Field>
                  <FieldLabel htmlFor="sheet-filter-property-type">Property Type</FieldLabel>
                  <Select value={filterPropertyType} onValueChange={setFilterPropertyType}>
                    <SelectTrigger id="sheet-filter-property-type" className="cursor-pointer">
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
                
                <Field>
                  <FieldLabel htmlFor="sheet-filter-owner-name">Owner Name</FieldLabel>
                  <Input
                    id="sheet-filter-owner-name"
                    type="text"
                    placeholder="Owner Name"
                    value={filterOwnerName}
                    onChange={(e) => setFilterOwnerName(e.target.value)}
                    className="cursor-pointer"
                  />
                </Field>
                
                <Field>
                  <FieldLabel htmlFor="sheet-filter-unit-number">Unit Number</FieldLabel>
                  <Input
                    id="sheet-filter-unit-number"
                    type="text"
                    placeholder="Unit Number"
                    value={filterUnitNumber}
                    onChange={(e) => setFilterUnitNumber(e.target.value)}
                    className="cursor-pointer"
                  />
                </Field>
                
                <Field>
                  <FieldLabel htmlFor="sheet-filter-mobile">Mobile</FieldLabel>
                  <Input
                    id="sheet-filter-mobile"
                    type="text"
                    placeholder="Mobile"
                    value={filterMobile}
                    onChange={(e) => setFilterMobile(e.target.value)}
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
                  >
                    Apply Filters
                  </Button>
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
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          
          {uploading ? (
            <LoadingSpinner message="Uploading Excel file..." />
          ) : loading ? (
            <TableSkeleton
              columns={12}
              rows={10}
              hasCheckbox={canUpload}
              columnHeaders={[
                "Date",
                "Price (AED)",
                "Area & Community",
                "Project Name",
                "Building",
                "Unit Number",
                "Size",
                "Property Type",
                "Bedroom",
                "Owner Name",
                "Mobile",
                "Deal Type"
              ]}
            />
          ) : properties.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No properties found. Upload an Excel file to get started.
            </div>
          ) : (
            <>
              {canUpload && selectedIds.size > 0 && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">
                    {selectedIds.size} {selectedIds.size > 1 ? 'properties' : 'property'} selected
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteSelected}
                    disabled={isDeleting}
                    className="ml-auto cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isDeleting ? "Deleting..." : "Delete Selected"}
                  </Button>
                </div>
              )}
              
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {canUpload && (
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedIds.size === properties.length && properties.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedIds(new Set(properties.map(t => t.id)))
                              } else {
                                setSelectedIds(new Set())
                              }
                            }}
                            className="cursor-pointer"
                          />
                        </TableHead>
                      )}
                      <TableHead>Date</TableHead>
                      <TableHead>Price (AED)</TableHead>
                      <TableHead>Area & Community</TableHead>
                      <TableHead>Project Name</TableHead>
                      <TableHead>Building</TableHead>
                      <TableHead>Unit Number</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Property Type</TableHead>
                      <TableHead>Bedroom</TableHead>
                      <TableHead>Owner Name</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Deal Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {properties.map((property) => (
                      <TableRow 
                        key={property.id}
                        className="hover:bg-muted/50"
                      >
                        {canUpload && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.has(property.id)}
                              onCheckedChange={(checked: boolean) => {
                                const newSelected = new Set(selectedIds)
                                if (checked) {
                                  newSelected.add(property.id)
                                } else {
                                  newSelected.delete(property.id)
                                }
                                setSelectedIds(newSelected)
                              }}
                              className="cursor-pointer"
                            />
                          </TableCell>
                        )}
                        <TableCell 
                          className="cursor-pointer"
                          onClick={() => {
                            setSelectedProperty(property)
                            setIsDetailSheetOpen(true)
                          }}
                        >
                          {formatDate(property.date)}
                        </TableCell>
                        <TableCell 
                          className="cursor-pointer"
                          onClick={() => {
                            setSelectedProperty(property)
                            setIsDetailSheetOpen(true)
                          }}
                        >
                          {formatPrice(property.price)}
                        </TableCell>
                        <TableCell 
                          className="cursor-pointer"
                          onClick={() => {
                            setSelectedProperty(property)
                            setIsDetailSheetOpen(true)
                          }}
                        >
                          {property.area_and_community || "-"}
                        </TableCell>
                        <TableCell 
                          className="cursor-pointer"
                          onClick={() => {
                            setSelectedProperty(property)
                            setIsDetailSheetOpen(true)
                          }}
                        >
                          {property.project_name || "-"}
                        </TableCell>
                        <TableCell 
                          className="cursor-pointer"
                          onClick={() => {
                            setSelectedProperty(property)
                            setIsDetailSheetOpen(true)
                          }}
                        >
                          {property.building || "-"}
                        </TableCell>
                        <TableCell 
                          className="cursor-pointer"
                          onClick={() => {
                            setSelectedProperty(property)
                            setIsDetailSheetOpen(true)
                          }}
                        >
                          {property.unit_number || "-"}
                        </TableCell>
                        <TableCell 
                          className="cursor-pointer"
                          onClick={() => {
                            setSelectedProperty(property)
                            setIsDetailSheetOpen(true)
                          }}
                        >
                          {property.size || "-"}
                        </TableCell>
                        <TableCell 
                          className="cursor-pointer"
                          onClick={() => {
                            setSelectedProperty(property)
                            setIsDetailSheetOpen(true)
                          }}
                        >
                          {property.property_type || "-"}
                        </TableCell>
                        <TableCell 
                          className="cursor-pointer"
                          onClick={() => {
                            setSelectedProperty(property)
                            setIsDetailSheetOpen(true)
                          }}
                        >
                          {property.bedroom || "-"}
                        </TableCell>
                        <TableCell 
                          className="cursor-pointer"
                          onClick={() => {
                            setSelectedProperty(property)
                            setIsDetailSheetOpen(true)
                          }}
                        >
                          {property.owner_name || "-"}
                        </TableCell>
                        <TableCell 
                          className="cursor-pointer"
                          onClick={() => {
                            setSelectedProperty(property)
                            setIsDetailSheetOpen(true)
                          }}
                        >
                          {property.mobile1 || "-"}
                        </TableCell>
                        <TableCell 
                          className="cursor-pointer"
                          onClick={() => {
                            setSelectedProperty(property)
                            setIsDetailSheetOpen(true)
                          }}
                        >
                          {property.deal_type || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {totalPages > 1 && (
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
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault()
                              setCurrentPage(pageNum)
                            }}
                            isActive={currentPage === pageNum}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      )
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
              )}
            </>
          )}
        </div>
          
          {/* Detail Sheet - Opens from right side */}
          <Sheet open={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
            <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-4 sm:p-6">
              <SheetHeader className="mb-4">
                <SheetTitle>Property Details</SheetTitle>
                <SheetDescription>
                  Complete information for this property
                </SheetDescription>
              </SheetHeader>
              {selectedProperty && (
                <div className="space-y-0.5">
                  <div className="flex items-center gap-3 py-2 border-b">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Date</div>
                      <div className="text-sm font-medium">{formatDate(selectedProperty.date)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 py-2 border-b">
                    <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Price (AED)</div>
                      <div className="text-sm font-medium">{formatPrice(selectedProperty.price)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 py-2 border-b">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Area & Community</div>
                      <div className="text-sm font-medium">{selectedProperty.area_and_community || "-"}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 py-2 border-b">
                    <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Project Name</div>
                      <div className="text-sm font-medium">{selectedProperty.project_name || "-"}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 py-2 border-b">
                    <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Building</div>
                      <div className="text-sm font-medium">{selectedProperty.building || "-"}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 py-2 border-b">
                    <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Unit Number</div>
                      <div className="text-sm font-medium">{selectedProperty.unit_number || "-"}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 py-2 border-b">
                    <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Land Number</div>
                      <div className="text-sm font-medium">{selectedProperty.land_number || "-"}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 py-2 border-b">
                    <Square className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Size</div>
                      <div className="text-sm font-medium">{selectedProperty.size || "-"}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 py-2 border-b">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Completion Status</div>
                      <div className="text-sm font-medium">{selectedProperty.completion_status || "-"}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 py-2 border-b">
                    <Home className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Property Type</div>
                      <div className="text-sm font-medium">{selectedProperty.property_type || "-"}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 py-2 border-b">
                    <Home className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Property Usage</div>
                      <div className="text-sm font-medium">{selectedProperty.property_usage || "-"}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 py-2 border-b">
                    <Bed className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Bedroom</div>
                      <div className="text-sm font-medium">{selectedProperty.bedroom || "-"}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 py-2 border-b">
                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Role</div>
                      <div className="text-sm font-medium">{selectedProperty.role || "-"}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 py-2 border-b">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Deal Type</div>
                      <div className="text-sm font-medium">{selectedProperty.deal_type || "-"}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 py-2 border-b">
                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Owner Name</div>
                      <div className="text-sm font-medium">{selectedProperty.owner_name || "-"}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 py-2 border-b">
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Phone 1</div>
                      <div className="text-sm font-medium">{selectedProperty.phone1 || "-"}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 py-2 border-b">
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Phone 2</div>
                      <div className="text-sm font-medium">{selectedProperty.phone2 || "-"}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 py-2 border-b">
                    <Smartphone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Mobile 1</div>
                      <div className="text-sm font-medium">{selectedProperty.mobile1 || "-"}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 py-2 border-b">
                    <Smartphone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Mobile 2</div>
                      <div className="text-sm font-medium">{selectedProperty.mobile2 || "-"}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 py-2 border-b">
                    <PhoneCall className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Secondary Mobile</div>
                      <div className="text-sm font-medium">{selectedProperty.secondary_mobile || "-"}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 py-2 border-b">
                    <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Country Name</div>
                      <div className="text-sm font-medium">{selectedProperty.country_name || "-"}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 py-2 border-b">
                    <CreditCard className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">ID Number</div>
                      <div className="text-sm font-medium">{selectedProperty.id_number || "-"}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 py-2 border-b">
                    <CreditCard className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">EID Number</div>
                      <div className="text-sm font-medium">{selectedProperty.eid_number || "-"}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 py-2 border-b">
                    <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Passport Expiry Date</div>
                      <div className="text-sm font-medium">{formatDate(selectedProperty.passport_expiry_date)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 py-2 border-b">
                    <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Birth Date</div>
                      <div className="text-sm font-medium">{formatDate(selectedProperty.birth_date)}</div>
                    </div>
                  </div>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
    </RoleBasedLayout>
  )
}

