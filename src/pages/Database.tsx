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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Upload,
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
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { canEditProperties } from "@/config/roles"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { TableSkeleton } from "@/components/shared/TableSkeleton"
import { AdvancedSearchBar, type SearchColumn } from "@/components/shared/AdvancedSearchBar"
import { formatError } from "@/lib/error-formatter"
import { toast } from "sonner"
import { useTableFilters } from "@/hooks/useTableFilters"
import { parseQuery } from "@/lib/query-parser"

import type { PropertyTransaction } from "@/types/archive"

export default function DatabasePage() {
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
  const [selectedProperty, setSelectedProperty] = useState<PropertyTransaction | null>(null)
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [savedSearches, setSavedSearches] = useState<Array<{ id: string; name: string; query: string; timestamp: number }>>([])
  
  // Column configuration for search bar
  const searchColumns: SearchColumn[] = [
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'price', label: 'Price', type: 'number' },
    { key: 'area_and_community', label: 'Area', type: 'text' },
    { key: 'project_name', label: 'Project', type: 'text' },
    { key: 'building', label: 'Building', type: 'text' },
    { key: 'unit_number', label: 'Unit Number', type: 'text' },
    { key: 'property_type', label: 'Property Type', type: 'text' },
    { key: 'bedroom', label: 'Bedrooms', type: 'text' },
    { key: 'owner_name', label: 'Owner Name', type: 'text' },
    { key: 'mobile1', label: 'Mobile', type: 'text' },
    { key: 'deal_type', label: 'Deal Type', type: 'text' },
    { key: 'size', label: 'Size', type: 'number' },
  ]
  
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 50
  
  const { buildQuery } = useTableFilters({
    tableName: "property_transaction",
    columns: searchColumns,
    textSearchFields: [
      'owner_name',
      'area_and_community',
      'project_name',
      'building',
      'unit_number',
      'mobile1',
      'deal_type',
      'property_type'
    ],
    defaultSort: { column: "date", direction: "desc" }
  })

  const fetchProperties = useCallback(async (page: number = 1) => {
    try {
      setLoading(true)
      setError(null)
      
      const parsed = parseQuery(searchQuery, searchColumns)
      
      // Skip incomplete filters - don't apply filters without values
      const completeFilters = parsed.filters.filter(f => f.value && f.value.trim())
      const effectiveParsed = {
        ...parsed,
        filters: completeFilters
      }
      
      // Build query using the hook
      const query = buildQuery(effectiveParsed, page, itemsPerPage)
      
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
      const message = formatError(err) || "Failed to fetch properties"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, itemsPerPage, buildQuery, searchColumns])
  
  // Load saved searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('database_saved_searches')
      if (saved) {
        setSavedSearches(JSON.parse(saved))
      }
    } catch (err) {
      console.error('Failed to load saved searches:', err)
    }
  }, [])

  // Handle search apply
  const handleSearchApply = useCallback((query: string) => {
    setSearchQuery(query)
    setCurrentPage(1)
  }, [])

  // Save search
  const handleSaveSearch = useCallback((name: string, query: string) => {
    const newSaved = {
      id: Date.now().toString(),
      name,
      query,
      timestamp: Date.now(),
    }
    const updated = [...savedSearches, newSaved]
    setSavedSearches(updated)
    localStorage.setItem('database_saved_searches', JSON.stringify(updated))
  }, [savedSearches])

  // Load search
  const handleLoadSearch = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  // Delete search
  const handleDeleteSearch = useCallback((id: string) => {
    const updated = savedSearches.filter(s => s.id !== id)
    setSavedSearches(updated)
    localStorage.setItem('database_saved_searches', JSON.stringify(updated))
    toast.success("Search deleted")
  }, [savedSearches])

  useEffect(() => {
    fetchProperties(currentPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchQuery]) // Refetch when page or search query changes
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error("Please upload an Excel file (.xlsx or .xls)")
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
      const message = formatError(err) || "Failed to upload file"
      toast.error(message)
    } finally {
      setUploading(false)
      // Reset file input
      event.target.value = ""
    }
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
      const message = formatError(err) || "Failed to delete properties"
      toast.error(message)
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
              <BreadcrumbItem>
                <BreadcrumbPage>Database</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Database</h1>
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
          
          {/* Unified Search/Filter/Sort Bar */}
          <div className="mb-4">
            <AdvancedSearchBar
              columns={searchColumns}
              value={searchQuery}
              onChange={setSearchQuery}
              onApply={handleSearchApply}
              savedSearches={savedSearches}
              onSaveSearch={handleSaveSearch}
              onLoadSearch={handleLoadSearch}
              onDeleteSearch={handleDeleteSearch}
            />
          </div>
          
          
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
                    <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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

