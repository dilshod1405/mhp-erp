import { useEffect, useState, useCallback } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
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
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { ProjectFormDialog } from "@/components/projects/ProjectFormDialog"
import { ProjectsTable } from "@/components/projects/ProjectsTable"
import { ProjectsFilters } from "@/components/projects/ProjectsFilters"
import { SearchBar } from "@/components/shared/SearchBar"
import { TableSkeleton } from "@/components/shared/TableSkeleton"
import { Pagination } from "@/components/shared/Pagination"
import { formatError } from "@/lib/error-formatter"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { canEditProjects } from "@/config/roles"
import { 
  PROJECT_TYPE_DISPLAY_NAMES, 
  SLUG_TO_PROJECT_TYPE,
  type ProjectType 
} from "@/config/project-types"
import type { Project, ProjectMedia, ProjectTravelTime, ProjectPaymentPlan } from "@/types/project"
import type { Developer } from "@/types/developer"
import type { Area } from "@/types/area"

export default function ProjectsPage() {
  const { type: typeSlug } = useParams<{ type: string }>()
  const projectType = typeSlug ? SLUG_TO_PROJECT_TYPE[typeSlug] : undefined
  const isMobile = useIsMobile()
  
  const { employee } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [developers, setDevelopers] = useState<Developer[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingProjectId, setDeletingProjectId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterDeveloper, setFilterDeveloper] = useState<string>("all")
  const [filterArea, setFilterArea] = useState<string>("all")
  const [filterPriceMin, setFilterPriceMin] = useState<string>("")
  const [filterPriceMax, setFilterPriceMax] = useState<string>("")
  // Applied filters (used for actual API calls)
  const [appliedFilterDeveloper, setAppliedFilterDeveloper] = useState<string>("all")
  const [appliedFilterArea, setAppliedFilterArea] = useState<string>("all")
  const [appliedFilterPriceMin, setAppliedFilterPriceMin] = useState<string>("")
  const [appliedFilterPriceMax, setAppliedFilterPriceMax] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 10
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    developer_id: "",
    area_id: "",
    price: "",
    latitude: "",
    longitude: "",
    file_brochure: "",
    file_floor_plan: "",
    type: projectType || "Off Plan" as ProjectType,
  })
  const [projectFiles, setProjectFiles] = useState({
    images: [] as File[],
    videos: [] as File[],
    brochure: null as File | null,
    floorPlan: null as File | null,
  })
  const [existingMedia, setExistingMedia] = useState<ProjectMedia[]>([])
  const [mediaToDelete, setMediaToDelete] = useState<number[]>([])
  const [travelTimes, setTravelTimes] = useState<ProjectTravelTime[]>([])
  const [travelTimesToDelete, setTravelTimesToDelete] = useState<number[]>([])
  const [paymentPlans, setPaymentPlans] = useState<ProjectPaymentPlan[]>([])
  const [paymentPlansToDelete, setPaymentPlansToDelete] = useState<number[]>([])

  // RBAC: IT, CEO, Admin (roles 0, 1, 2) can CRUD; other roles can view only
  const canEdit = canEditProjects(employee?.role)

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  const fetchProjects = useCallback(async (
    searchTerm?: string, 
    page: number = 1,
    developerId?: string,
    areaId?: string,
    priceMin?: string,
    priceMax?: string
  ) => {
    if (!projectType) return
    
    try {
      setLoading(true)
      setError(null)

      const offset = (page - 1) * itemsPerPage
      let url = `${supabaseUrl}/rest/v1/project?select=*&type=eq.${encodeURIComponent(projectType)}`
      
      // Add search filter if search term exists
      if (searchTerm && searchTerm.trim()) {
        const searchPattern = `*${searchTerm.trim()}*`
        // Search by title or slug
        url += `&or=(title.ilike.${encodeURIComponent(searchPattern)},slug.ilike.${encodeURIComponent(searchPattern)})`
      }
      
      // Add developer filter
      if (developerId && developerId !== "all") {
        url += `&developer_id=eq.${encodeURIComponent(developerId)}`
      }
      
      // Add area filter
      if (areaId && areaId !== "all") {
        url += `&area_id=eq.${encodeURIComponent(areaId)}`
      }
      
      // Add price filters
      if (priceMin && priceMin.trim()) {
        url += `&price=gte.${encodeURIComponent(priceMin.trim())}`
      }
      if (priceMax && priceMax.trim()) {
        url += `&price=lte.${encodeURIComponent(priceMax.trim())}`
      }
      
      url += `&limit=${itemsPerPage}&offset=${offset}&order=id.asc`

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

      setProjects(response.data || [])
    } catch (err: unknown) {
      console.error("Error fetching projects:", err)
      const message = formatError(err) || "Failed to fetch projects"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [supabaseUrl, supabaseAnonKey, itemsPerPage, projectType])

  const fetchDevelopers = useCallback(async () => {
    try {
      const response = await axios.get(
        `${supabaseUrl}/rest/v1/developer?select=id,title&order=title.asc`,
        {
          headers: {
            "apikey": supabaseAnonKey,
            "Authorization": `Bearer ${supabaseAnonKey}`,
            "Content-Type": "application/json",
          },
        }
      )

      setDevelopers(response.data || [])
    } catch (err) {
      console.error("Error fetching developers:", err)
    }
  }, [supabaseUrl, supabaseAnonKey])

  const fetchAreas = useCallback(async () => {
    try {
      const response = await axios.get(
        `${supabaseUrl}/rest/v1/area?select=id,title,city&order=title.asc`,
        {
          headers: {
            "apikey": supabaseAnonKey,
            "Authorization": `Bearer ${supabaseAnonKey}`,
            "Content-Type": "application/json",
          },
        }
      )

      setAreas(response.data || [])
    } catch (err) {
      console.error("Error fetching areas:", err)
    }
  }, [supabaseUrl, supabaseAnonKey])

  useEffect(() => {
    if (projectType) {
      fetchDevelopers()
      fetchAreas()
    }
  }, [projectType, fetchDevelopers, fetchAreas])

  // Reset page and filters when project type changes
  useEffect(() => {
    if (projectType) {
      setCurrentPage(1)
      // Reset applied filters when project type changes
      setAppliedFilterDeveloper("all")
      setAppliedFilterArea("all")
      setAppliedFilterPriceMin("")
      setAppliedFilterPriceMax("")
      setFilterDeveloper("all")
      setFilterArea("all")
      setFilterPriceMin("")
      setFilterPriceMax("")
    }
  }, [projectType])

  // Main effect: fetch projects when dependencies change
  useEffect(() => {
    if (!projectType) return
    
    // If there's a search query, use debounced search
    if (searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        setCurrentPage(1) // Reset to first page when search changes
        fetchProjects(
          searchQuery, 
          1,
          appliedFilterDeveloper,
          appliedFilterArea,
          appliedFilterPriceMin,
          appliedFilterPriceMax
        )
      }, 1500) // 1.5 second debounce - wait for user to finish typing

      return () => clearTimeout(timeoutId)
    } else {
      // No search query, fetch current page with filters
      fetchProjects(
        undefined, 
        currentPage,
        appliedFilterDeveloper,
        appliedFilterArea,
        appliedFilterPriceMin,
        appliedFilterPriceMax
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectType, currentPage, searchQuery, appliedFilterDeveloper, appliedFilterArea, appliedFilterPriceMin, appliedFilterPriceMax]) // fetchProjects is stable, no need to include in deps

  const handleSearch = () => {
    setCurrentPage(1)
    fetchProjects(
      searchQuery, 
      1,
      appliedFilterDeveloper,
      appliedFilterArea,
      appliedFilterPriceMin,
      appliedFilterPriceMax
    )
  }

  const applyFilters = () => {
    // Update applied filters first
    setAppliedFilterDeveloper(filterDeveloper)
    setAppliedFilterArea(filterArea)
    setAppliedFilterPriceMin(filterPriceMin)
    setAppliedFilterPriceMax(filterPriceMax)
    setCurrentPage(1)
    // The useEffect will handle the fetch when applied filters change, but we need to trigger it manually
    // to avoid double requests, we'll do it directly here
    fetchProjects(
      searchQuery,
      1,
      filterDeveloper,
      filterArea,
      filterPriceMin,
      filterPriceMax
    )
  }

  const clearFilters = () => {
    setFilterDeveloper("all")
    setFilterArea("all")
    setFilterPriceMin("")
    setFilterPriceMax("")
    setAppliedFilterDeveloper("all")
    setAppliedFilterArea("all")
    setAppliedFilterPriceMin("")
    setAppliedFilterPriceMax("")
    setCurrentPage(1)
    fetchProjects(
      searchQuery,
      1,
      "all",
      "all",
      "",
      ""
    )
  }

  const hasActiveFilters = appliedFilterDeveloper !== "all" || appliedFilterArea !== "all" || appliedFilterPriceMin !== "" || appliedFilterPriceMax !== ""
  const hasFilterChanges = filterDeveloper !== appliedFilterDeveloper || filterArea !== appliedFilterArea || filterPriceMin !== appliedFilterPriceMin || filterPriceMax !== appliedFilterPriceMax

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  const handleEdit = async (project: Project) => {
    setEditingProject(project)
    setFormData({
      title: project.title || "",
      slug: project.slug || "",
      developer_id: project.developer_id?.toString() || "",
      area_id: project.area_id?.toString() || "",
      price: project.price?.toString() || "",
      latitude: project.latitude?.toString() || "",
      longitude: project.longitude?.toString() || "",
      file_brochure: project.file_brochure || "",
      file_floor_plan: project.file_floor_plan || "",
      type: project.type || "Off Plan",
    })
    setMediaToDelete([])
    setTravelTimesToDelete([])
    setPaymentPlansToDelete([])
    
    // Fetch existing project data in parallel for better performance
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    
    const headers = {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
    }
    
    try {
      const [mediaResponse, travelTimesResponse, paymentPlansResponse] = await Promise.all([
        axios.get(
          `${supabaseUrl}/rest/v1/project_media?project_id=eq.${project.id}&order=created_at.asc`,
          { headers }
        ).catch(err => {
          console.warn("Could not fetch project media:", err)
          return { data: [] }
        }),
        axios.get(
          `${supabaseUrl}/rest/v1/project_travel_time?project_id=eq.${project.id}&select=*`,
          { headers }
        ).catch(err => {
          console.warn("Could not fetch travel times:", err)
          return { data: [] }
        }),
        axios.get(
          `${supabaseUrl}/rest/v1/project_payment_plan?project_id=eq.${project.id}&select=*`,
          { headers }
        ).catch(err => {
          console.warn("Could not fetch payment plans:", err)
          return { data: [] }
        }),
      ])
      
      setExistingMedia(mediaResponse.data || [])
      setTravelTimes(travelTimesResponse.data || [])
      setPaymentPlans(paymentPlansResponse.data || [])
    } catch (err) {
      console.error("Error fetching project data:", err)
      setExistingMedia([])
      setTravelTimes([])
      setPaymentPlans([])
    }
    
    setIsAddDialogOpen(false)
    setIsDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingProject(null)
    setFormData({
      title: "",
      slug: "",
      developer_id: "",
      area_id: "",
      price: "",
      latitude: "",
      longitude: "",
      file_brochure: "",
      file_floor_plan: "",
      type: projectType || "Off Plan",
    })
    setProjectFiles({
      images: [],
      videos: [],
      brochure: null,
      floorPlan: null,
    })
      setTravelTimes([])
      setTravelTimesToDelete([])
      setPaymentPlans([])
      setPaymentPlansToDelete([])
      setIsDialogOpen(false)
      setIsAddDialogOpen(true)
  }

  const handleDelete = async (projectId: number) => {
    if (!confirm("Are you sure you want to delete this project?")) return

    try {
      setDeletingProjectId(projectId)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      // Delete related travel times first (cascade)
      try {
        await axios.delete(
          `${supabaseUrl}/rest/v1/project_travel_time?project_id=eq.${projectId}`,
          {
            headers: {
              "apikey": supabaseAnonKey,
              "Authorization": `Bearer ${supabaseAnonKey}`,
              "Content-Type": "application/json",
            },
          }
        )
      } catch (err) {
        console.warn("Could not delete travel times (may not exist):", err)
      }

      // Delete related project_media first
      try {
        await axios.delete(
          `${supabaseUrl}/rest/v1/project_media?project_id=eq.${projectId}`,
          {
            headers: {
              "apikey": supabaseAnonKey,
              "Authorization": `Bearer ${supabaseAnonKey}`,
              "Content-Type": "application/json",
            },
          }
        )
      } catch (err) {
        console.warn("Could not delete project media (may not exist):", err)
      }

      // Delete related payment plans
      try {
        await axios.delete(
          `${supabaseUrl}/rest/v1/project_payment_plan?project_id=eq.${projectId}`,
          {
            headers: {
              "apikey": supabaseAnonKey,
              "Authorization": `Bearer ${supabaseAnonKey}`,
              "Content-Type": "application/json",
            },
          }
        )
      } catch (err) {
        console.warn("Could not delete payment plans (may not exist):", err)
      }

      // Delete the project
      await axios.delete(
        `${supabaseUrl}/rest/v1/project?id=eq.${projectId}`,
        {
          headers: {
            "apikey": supabaseAnonKey,
            "Authorization": `Bearer ${supabaseAnonKey}`,
            "Content-Type": "application/json",
          },
        }
      )

      await fetchProjects(
        searchQuery, 
        currentPage,
        appliedFilterDeveloper,
        appliedFilterArea,
        appliedFilterPriceMin,
        appliedFilterPriceMax
      )
      toast.success("Project deleted successfully")
    } catch (err: unknown) {
      console.error("Error deleting project:", err)
      const message = formatError(err) || "Failed to delete project"
      toast.error(message)
    } finally {
      setDeletingProjectId(null)
    }
  }


  const uploadProjectFile = async (
    file: File,
    projectId: number,
    folder: 'images' | 'videos' | 'files'
  ): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`
    
    // Storage path: projects/<id>/<folder>/<filename>
    const storagePath = `${projectId}/${folder}/${fileName}`
    
    console.log(`Uploading file to storage: projects/${storagePath}`)

    // Upload to Supabase storage using axios with anon key
    await axios.post(
      `${supabaseUrl}/storage/v1/object/projects/${storagePath}`,
      file,
      {
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
          'Content-Type': file.type || 'application/octet-stream',
        },
      }
    )

    // Return relative path as per API spec: projects/<id>/<folder>/<filename>
    const relativePath = `projects/${storagePath}`
    console.log(`Upload successful. Path: ${relativePath}`)
    return relativePath
  }

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error("Title is required")
      return
    }

    // Validate at least one image is required for new projects
    if (!editingProject && projectFiles.images.length === 0) {
      toast.error("At least one image is required")
      return
    }

    try {
      setIsSaving(true)

      if (editingProject) {
        // Update existing project
        const projectData: Record<string, unknown> = {
          title: formData.title.trim(),
          slug: formData.slug.trim(),
          type: formData.type,
          developer_id: formData.developer_id ? parseInt(formData.developer_id) : null,
          area_id: formData.area_id ? parseInt(formData.area_id) : null,
          price: formData.price ? parseFloat(formData.price) : null,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          file_brochure: formData.file_brochure.trim() || null,
          file_floor_plan: formData.file_floor_plan.trim() || null,
        }

        await axios.patch(
          `${supabaseUrl}/rest/v1/project?id=eq.${editingProject.id}`,
          projectData,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'apikey': supabaseAnonKey,
              'Prefer': 'return=minimal',
            },
          }
        )

        const projectId = editingProject.id

        // Delete marked media
        if (mediaToDelete.length > 0) {
          for (const mediaId of mediaToDelete) {
            try {
              await axios.delete(
                `${supabaseUrl}/rest/v1/project_media?id=eq.${mediaId}`,
                {
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseAnonKey}`,
                    'apikey': supabaseAnonKey,
                  },
                }
              )
              console.log(`Project media ${mediaId} deleted successfully`)
            } catch (err) {
              console.warn(`Could not delete project media ${mediaId}:`, err)
            }
          }
        }

        // Delete marked travel times
        if (travelTimesToDelete.length > 0) {
          for (const travelTimeId of travelTimesToDelete) {
            try {
              await axios.delete(
                `${supabaseUrl}/rest/v1/project_travel_time?id=eq.${travelTimeId}`,
                {
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseAnonKey}`,
                    'apikey': supabaseAnonKey,
                  },
                }
              )
              console.log(`Travel time ${travelTimeId} deleted successfully`)
            } catch (err) {
              console.warn(`Could not delete travel time ${travelTimeId}:`, err)
            }
          }
        }

        // Create/Update travel times
        // New travel times have large temporary IDs (Date.now()), existing ones have real database IDs
        // Create new travel times (those with temporary IDs from Date.now() >= 1000000)
        const newTravelTimes = travelTimes.filter(tt => 
          !travelTimesToDelete.includes(tt.id) && 
          tt.id >= 1000000 // Temporary IDs are large numbers (Date.now())
        )
        for (const travelTime of newTravelTimes) {
          try {
            await axios.post(
              `${supabaseUrl}/rest/v1/project_travel_time`,
              {
                project_id: projectId,
                minutes: travelTime.minutes,
                icon: travelTime.icon,
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseAnonKey}`,
                  'apikey': supabaseAnonKey,
                  'Prefer': 'return=representation',
                },
              }
            )
            console.log(`Travel time created successfully: ${travelTime.icon} - ${travelTime.minutes} minutes`)
          } catch (err) {
            console.warn(`Could not create travel time:`, err)
          }
        }

        // Update existing travel times (those fetched from database with real IDs < 1000000)
        const existingTravelTimes = travelTimes.filter(tt => 
          !travelTimesToDelete.includes(tt.id) && 
          tt.id < 1000000 // Real database IDs are small numbers
        )
        for (const travelTime of existingTravelTimes) {
          try {
            await axios.patch(
              `${supabaseUrl}/rest/v1/project_travel_time?id=eq.${travelTime.id}`,
              {
                minutes: travelTime.minutes,
                icon: travelTime.icon,
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseAnonKey}`,
                  'apikey': supabaseAnonKey,
                  'Prefer': 'return=representation',
                },
              }
            )
            console.log(`Travel time ${travelTime.id} updated successfully`)
          } catch (err) {
            console.warn(`Could not update travel time ${travelTime.id}:`, err)
          }
        }

        // Delete marked payment plans
        if (paymentPlansToDelete.length > 0) {
          for (const paymentPlanId of paymentPlansToDelete) {
            try {
              await axios.delete(
                `${supabaseUrl}/rest/v1/project_payment_plan?id=eq.${paymentPlanId}`,
                {
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseAnonKey}`,
                    'apikey': supabaseAnonKey,
                  },
                }
              )
              console.log(`Payment plan ${paymentPlanId} deleted successfully`)
            } catch (err) {
              console.warn(`Could not delete payment plan ${paymentPlanId}:`, err)
            }
          }
        }

        // Create/Update payment plans
        // New payment plans have large temporary IDs (Date.now()), existing ones have real database IDs
        // Create new payment plans (those with temporary IDs from Date.now() >= 1000000)
        const newPaymentPlans = paymentPlans.filter(pp => 
          !paymentPlansToDelete.includes(pp.id) && 
          pp.id >= 1000000 // Temporary IDs are large numbers (Date.now())
        )
        for (const paymentPlan of newPaymentPlans) {
          try {
            await axios.post(
              `${supabaseUrl}/rest/v1/project_payment_plan`,
              {
                project_id: projectId,
                title: paymentPlan.title || '',
                percentage: paymentPlan.percentage,
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseAnonKey}`,
                  'apikey': supabaseAnonKey,
                  'Prefer': 'return=representation',
                },
              }
            )
            console.log(`Payment plan created successfully: ${paymentPlan.percentage}%`)
          } catch (err) {
            console.warn(`Could not create payment plan:`, err)
          }
        }

        // Update existing payment plans (those fetched from database with real IDs < 1000000)
        const existingPaymentPlans = paymentPlans.filter(pp => 
          !paymentPlansToDelete.includes(pp.id) && 
          pp.id < 1000000 // Real database IDs are small numbers
        )
        for (const paymentPlan of existingPaymentPlans) {
          try {
            await axios.patch(
              `${supabaseUrl}/rest/v1/project_payment_plan?id=eq.${paymentPlan.id}`,
              {
                title: paymentPlan.title || '',
                percentage: paymentPlan.percentage,
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseAnonKey}`,
                  'apikey': supabaseAnonKey,
                  'Prefer': 'return=representation',
                },
              }
            )
            console.log(`Payment plan ${paymentPlan.id} updated successfully`)
          } catch (err) {
            console.warn(`Could not update payment plan ${paymentPlan.id}:`, err)
          }
        }

        // Handle file uploads for editing
        let brochurePath: string | null = null
        let floorPlanPath: string | null = null

        // Upload new brochure if provided
        if (projectFiles.brochure) {
          brochurePath = await uploadProjectFile(projectFiles.brochure, projectId, 'files')
          console.log("Brochure uploaded successfully:", brochurePath)
          
          // Update project with new brochure path
          await axios.patch(
            `${supabaseUrl}/rest/v1/project?id=eq.${projectId}`,
            { file_brochure: brochurePath },
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'apikey': supabaseAnonKey,
                'Prefer': 'return=representation',
              },
            }
          )
        }

        // Upload new floor plan if provided
        if (projectFiles.floorPlan) {
          floorPlanPath = await uploadProjectFile(projectFiles.floorPlan, projectId, 'files')
          console.log("Floor plan uploaded successfully:", floorPlanPath)
          
          // Update project with new floor plan path
          await axios.patch(
            `${supabaseUrl}/rest/v1/project?id=eq.${projectId}`,
            { file_floor_plan: floorPlanPath },
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'apikey': supabaseAnonKey,
                'Prefer': 'return=representation',
              },
            }
          )
        }

        // Upload images and videos, then pair them: 1 image + 1 video = 1 project_media row
        if (projectFiles.images.length > 0 || projectFiles.videos.length > 0) {
          const maxCount = Math.max(projectFiles.images.length, projectFiles.videos.length)
          
          for (let i = 0; i < maxCount; i++) {
            try {
              let imagePath: string | null = null
              let videoPath: string | null = null

              // Upload image if available at this index
              if (i < projectFiles.images.length) {
                imagePath = await uploadProjectFile(projectFiles.images[i], projectId, 'images')
                console.log(`Image ${i + 1} uploaded successfully:`, imagePath)
              }

              // Upload video if available at this index
              if (i < projectFiles.videos.length) {
                videoPath = await uploadProjectFile(projectFiles.videos[i], projectId, 'videos')
                console.log(`Video ${i + 1} uploaded successfully:`, videoPath)
              }

              // Create project_media record with paired image and video (or single if only one exists)
              if (imagePath || videoPath) {
                const mediaData: { project_id: number; image?: string | null; video?: string | null } = {
                  project_id: projectId,
                }
                
                if (imagePath) {
                  mediaData.image = imagePath
                }
                
                if (videoPath) {
                  mediaData.video = videoPath
                }

                await axios.post(
                  `${supabaseUrl}/rest/v1/project_media`,
                  mediaData,
                  {
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${supabaseAnonKey}`,
                      'apikey': supabaseAnonKey,
                      'Prefer': 'return=representation',
                    },
                  }
                )
                console.log(`Project media record ${i + 1} created with image: ${imagePath || 'none'}, video: ${videoPath || 'none'}`)
              }
            } catch (err) {
              console.warn(`Could not upload files or create project_media record for pair ${i + 1}:`, err)
            }
          }
        }
      } else {
        // Create project first using direct fetch with anon key (like Areas.tsx)
        // Server will generate slug from title, so we don't send slug
        const projectData = {
          title: formData.title.trim(),
          developer_id: formData.developer_id ? parseInt(formData.developer_id) : null,
          area_id: formData.area_id ? parseInt(formData.area_id) : null,
          type: formData.type,
          price: formData.price ? parseFloat(formData.price) : null,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          file_brochure: null as string | null,
          file_floor_plan: null as string | null,
        }

        const createResponse = await axios.post(
          `${supabaseUrl}/rest/v1/project`,
          projectData,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'apikey': supabaseAnonKey,
              'Prefer': 'return=representation',
            },
          }
        )

        const createdProject = createResponse.data
        const projectId = Array.isArray(createdProject) ? createdProject[0]?.id : createdProject?.id

        if (!projectId) {
          throw new Error("Failed to get project ID after creation")
        }

        console.log("Project created with ID:", projectId)

        // Upload files
        let brochurePath: string | null = null
        let floorPlanPath: string | null = null

        // Upload images and videos, then pair them: 1 image + 1 video = 1 project_media row
        const maxCount = Math.max(projectFiles.images.length, projectFiles.videos.length)
        
        for (let i = 0; i < maxCount; i++) {
          try {
            let imagePath: string | null = null
            let videoPath: string | null = null

            // Upload image if available at this index
            if (i < projectFiles.images.length) {
              imagePath = await uploadProjectFile(projectFiles.images[i], projectId, 'images')
              console.log(`Image ${i + 1} uploaded successfully:`, imagePath)
            }

            // Upload video if available at this index
            if (i < projectFiles.videos.length) {
              videoPath = await uploadProjectFile(projectFiles.videos[i], projectId, 'videos')
              console.log(`Video ${i + 1} uploaded successfully:`, videoPath)
            }

            // Create project_media record with paired image and video (or single if only one exists)
            if (imagePath || videoPath) {
              const mediaData: { project_id: number; image?: string | null; video?: string | null } = {
                project_id: projectId,
              }
              
              if (imagePath) {
                mediaData.image = imagePath
              }
              
              if (videoPath) {
                mediaData.video = videoPath
              }

              await axios.post(
                `${supabaseUrl}/rest/v1/project_media`,
                mediaData,
                {
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseAnonKey}`,
                    'apikey': supabaseAnonKey,
                    'Prefer': 'return=representation',
                  },
                }
              )
              console.log(`Project media record ${i + 1} created with image: ${imagePath || 'none'}, video: ${videoPath || 'none'}`)
            }
          } catch (err) {
            console.warn(`Could not upload files or create project_media record for pair ${i + 1}:`, err)
          }
        }

        // Upload brochure (optional)
        if (projectFiles.brochure) {
          brochurePath = await uploadProjectFile(projectFiles.brochure, projectId, 'files')
          console.log("Brochure uploaded successfully:", brochurePath)
        }

        // Upload floor plan (optional)
        if (projectFiles.floorPlan) {
          floorPlanPath = await uploadProjectFile(projectFiles.floorPlan, projectId, 'files')
          console.log("Floor plan uploaded successfully:", floorPlanPath)
        }

        // Create travel times
        for (const travelTime of travelTimes) {
          try {
            await axios.post(
              `${supabaseUrl}/rest/v1/project_travel_time`,
              {
                project_id: projectId,
                minutes: travelTime.minutes,
                icon: travelTime.icon,
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseAnonKey}`,
                  'apikey': supabaseAnonKey,
                  'Prefer': 'return=representation',
                },
              }
            )
            console.log(`Travel time created successfully: ${travelTime.icon} - ${travelTime.minutes} minutes`)
          } catch (err) {
            console.warn(`Could not create travel time:`, err)
          }
        }

        // Create payment plans
        for (const paymentPlan of paymentPlans) {
          try {
            await axios.post(
              `${supabaseUrl}/rest/v1/project_payment_plan`,
              {
                project_id: projectId,
                title: paymentPlan.title || '',
                percentage: paymentPlan.percentage,
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseAnonKey}`,
                  'apikey': supabaseAnonKey,
                  'Prefer': 'return=representation',
                },
              }
            )
            console.log(`Payment plan created successfully: ${paymentPlan.title || 'Untitled'} - ${paymentPlan.percentage}%`)
          } catch (err) {
            console.warn(`Could not create payment plan:`, err)
          }
        }

        // Update project with file paths (brochure and floor plan)
        if (brochurePath || floorPlanPath) {
          const updateData: Record<string, unknown> = {}
          if (brochurePath) updateData.file_brochure = brochurePath
          if (floorPlanPath) updateData.file_floor_plan = floorPlanPath

          console.log("Updating project ID:", projectId, "with file paths:", updateData)

          const updateResponse = await axios.patch(
            `${supabaseUrl}/rest/v1/project?id=eq.${projectId}`,
            updateData,
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'apikey': supabaseAnonKey,
                'Prefer': 'return=representation',
              },
            }
          )

          const updatedProject = updateResponse.data
          console.log("Project updated successfully with file paths:", updatedProject)
          
          const project = Array.isArray(updatedProject) ? updatedProject[0] : updatedProject
          console.log("Verification - file_brochure:", project?.file_brochure)
          console.log("Verification - file_floor_plan:", project?.file_floor_plan)
        }
      }

      setIsDialogOpen(false)
      setIsAddDialogOpen(false)
      setProjectFiles({
        images: [],
        videos: [],
        brochure: null,
        floorPlan: null,
      })
      setExistingMedia([])
      setMediaToDelete([])
      setTravelTimes([])
      setTravelTimesToDelete([])
      await fetchProjects(
        searchQuery, 
        currentPage,
        appliedFilterDeveloper,
        appliedFilterArea,
        appliedFilterPriceMin,
        appliedFilterPriceMax
      )
      toast.success(editingProject ? "Project updated successfully" : "Project created successfully")
    } catch (err: unknown) {
      console.error("Error saving project:", err)
      const message = formatError(err) || "Failed to save project"
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const getDeveloperName = (developerId: number | null) => {
    if (!developerId) return "-"
    const developer = developers.find(d => d.id === developerId)
    return developer?.title || "-"
  }

  const getAreaName = (areaId: number | null) => {
    if (!areaId) return "-"
    const area = areas.find(a => a.id === areaId)
    return area ? `${area.title} (${area.city})` : "-"
  }

  const formatPrice = (price: number | null) => {
    if (price === null) return "-"
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  if (!projectType) {
    return (
      <RoleBasedLayout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Invalid Project Type</h1>
            <p className="text-muted-foreground mt-2">
              Please select a valid project type from the sidebar.
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
                <BreadcrumbLink href="#">Projects</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{PROJECT_TYPE_DISPLAY_NAMES[projectType]}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h1 className="text-2xl font-bold">{PROJECT_TYPE_DISPLAY_NAMES[projectType]}</h1>
            {canEdit && (
              <Button 
                type="button"
                onClick={handleAdd}
                className="cursor-pointer w-full sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Project
              </Button>
            )}
          </div>

          {/* Search Bar and Filter Button */}
          <div className="flex items-center gap-2 mb-4">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={handleSearch}
              placeholder="Search by slug..."
            />
            <ProjectsFilters
              isMobile={isMobile}
              isFilterOpen={isFilterOpen}
              onFilterToggle={() => setIsFilterOpen(!isFilterOpen)}
              onFilterOpenChange={setIsFilterOpen}
              filterDeveloper={filterDeveloper}
              filterArea={filterArea}
              filterPriceMin={filterPriceMin}
              filterPriceMax={filterPriceMax}
              developers={developers}
              areas={areas}
              hasFilterChanges={hasFilterChanges}
              hasActiveFilters={hasActiveFilters}
              onDeveloperChange={setFilterDeveloper}
              onAreaChange={setFilterArea}
              onPriceMinChange={setFilterPriceMin}
              onPriceMaxChange={setFilterPriceMax}
              onApplyFilters={applyFilters}
              onClearFilters={clearFilters}
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
              columnHeaders={["Slug", "Developer", "Area", "Price", "Brochure", "Floor Plan", "Created"]}
            />
          ) : (
            <>
              <ProjectsTable
                projects={projects}
                projectType={projectType}
                canEdit={canEdit}
                deletingProjectId={deletingProjectId}
                onEdit={handleEdit}
                onDelete={handleDelete}
                getDeveloperName={getDeveloperName}
                getAreaName={getAreaName}
                formatPrice={formatPrice}
              />
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>

      <ProjectFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        isEditing={true}
        isSaving={isSaving}
        error={error}
        formData={formData}
        projectFiles={projectFiles}
        projectType={projectType}
        developers={developers}
        areas={areas}
        existingMedia={existingMedia}
        mediaToDelete={mediaToDelete}
        travelTimes={travelTimes}
        travelTimesToDelete={travelTimesToDelete}
        paymentPlans={paymentPlans}
        paymentPlansToDelete={paymentPlansToDelete}
        onFormDataChange={setFormData}
        onProjectFilesChange={setProjectFiles}
        onMediaToDeleteChange={setMediaToDelete}
        onTravelTimesChange={setTravelTimes}
        onTravelTimesToDeleteChange={setTravelTimesToDelete}
        onPaymentPlansChange={setPaymentPlans}
        onPaymentPlansToDeleteChange={setPaymentPlansToDelete}
        onSave={handleSave}
      />

      <ProjectFormDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        isEditing={false}
        isSaving={isSaving}
        error={error}
        formData={formData}
        projectFiles={projectFiles}
        projectType={projectType}
        developers={developers}
        areas={areas}
        travelTimes={travelTimes}
        paymentPlans={paymentPlans}
        onFormDataChange={setFormData}
        onProjectFilesChange={setProjectFiles}
        onTravelTimesChange={setTravelTimes}
        onPaymentPlansChange={setPaymentPlans}
        onSave={handleSave}
      />
      </div>
    </RoleBasedLayout>
  )
}

