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
import { Video, FileText, X, Upload, Plus, Trash2, MapPin } from "lucide-react"
import { TRAVEL_TIME_ICONS, getTravelTimeIcon } from "@/config/travel-time-icons"
import { useEffect, useMemo, useRef } from "react"
import { PROJECT_TYPE_DISPLAY_NAMES, type ProjectType } from "@/config/project-types"
import type { Developer } from "@/types/developer"
import type { Area } from "@/types/area"
import type { ProjectMedia, ProjectTravelTime, ProjectPaymentPlan } from "@/types/project"
import { LocationMap } from "./LocationMap"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ProjectFormData {
  title: string
  slug: string
  developer_id: string
  area_id: string
  price: string
  latitude: string
  longitude: string
  file_brochure: string
  file_floor_plan: string
  type: ProjectType
}

interface ProjectFiles {
  images: File[]
  videos: File[]
  brochure: File | null
  floorPlan: File | null
}

interface ProjectFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isEditing: boolean
  isSaving: boolean
  error: string | null
  formData: ProjectFormData
  projectFiles: ProjectFiles
  projectType?: ProjectType
  developers: Developer[]
  areas: Area[]
  existingMedia?: ProjectMedia[]
  mediaToDelete?: number[]
  travelTimes?: ProjectTravelTime[]
  travelTimesToDelete?: number[]
  paymentPlans?: ProjectPaymentPlan[]
  paymentPlansToDelete?: number[]
  onFormDataChange: (data: ProjectFormData) => void
  onProjectFilesChange: (files: ProjectFiles) => void
  onMediaToDeleteChange?: (ids: number[]) => void
  onTravelTimesChange?: (travelTimes: ProjectTravelTime[]) => void
  onTravelTimesToDeleteChange?: (ids: number[]) => void
  onPaymentPlansChange?: (paymentPlans: ProjectPaymentPlan[]) => void
  onPaymentPlansToDeleteChange?: (ids: number[]) => void
  onSave: () => void
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  isEditing,
  isSaving,
  error,
  formData,
  projectFiles,
  projectType,
  developers,
  areas,
  existingMedia = [],
  mediaToDelete = [],
  travelTimes = [],
  travelTimesToDelete = [],
  paymentPlans = [],
  paymentPlansToDelete = [],
  onFormDataChange,
  onProjectFilesChange,
  onMediaToDeleteChange,
  onTravelTimesChange,
  onTravelTimesToDeleteChange,
  onPaymentPlansChange,
  onPaymentPlansToDeleteChange,
  onSave,
}: ProjectFormDialogProps) {
  const handleFormFieldChange = (field: keyof ProjectFormData, value: string) => {
    onFormDataChange({ ...formData, [field]: value })
  }

  const handleFileChange = (field: keyof ProjectFiles, file: File | null) => {
    onProjectFilesChange({ ...projectFiles, [field]: file })
  }

  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const handleMultipleFileChange = (field: 'images' | 'videos', files: FileList | null) => {
    if (!files) return
    const fileArray = Array.from(files)
    onProjectFilesChange({ ...projectFiles, [field]: [...projectFiles[field], ...fileArray] })
  }

  const removeFile = (field: 'images' | 'videos', index: number) => {
    const newFiles = [...projectFiles[field]]
    newFiles.splice(index, 1)
    onProjectFilesChange({ ...projectFiles, [field]: newFiles })
  }

  const triggerFileInput = (field: 'images' | 'videos') => {
    if (field === 'images') {
      imageInputRef.current?.click()
    } else {
      videoInputRef.current?.click()
    }
  }

  // Create preview URLs for images
  const imagePreviewUrls = useMemo(() => {
    return projectFiles.images.map(file => URL.createObjectURL(file))
  }, [projectFiles.images])

  // Cleanup preview URLs
  useEffect(() => {
    return () => {
      imagePreviewUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [imagePreviewUrls])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Project" : "Add New Project"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the project details below."
              : `Create a new ${projectType ? PROJECT_TYPE_DISPLAY_NAMES[projectType].toLowerCase() : ""} project.`}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          
          <div className="relative">
            {isSaving && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-md">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
                  <p className="text-sm font-medium text-muted-foreground">
                    {isEditing ? "Saving changes..." : "Creating project..."}
                  </p>
                </div>
              </div>
            )}
            <Tabs defaultValue="general" className="w-full" style={{ pointerEvents: isSaving ? 'none' : 'auto' }}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
              <TabsTrigger value="travel-time">Travel time</TabsTrigger>
              <TabsTrigger value="payment-plan">Payment plan</TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="space-y-4 mt-4">
              <FieldGroup className="max-h-[60vh] overflow-y-auto">
                <Field>
                  <FieldLabel htmlFor={isEditing ? "title" : "add_title"}>Title *</FieldLabel>
                  <Input
                    id={isEditing ? "title" : "add_title"}
                    value={formData.title || ""}
                    onChange={(e) => handleFormFieldChange("title", e.target.value)}
                    placeholder="Project Title"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={isEditing ? "developer" : "add_developer"}>Developer</FieldLabel>
                  <Select
                    value={formData.developer_id || "none"}
                    onValueChange={(value) => handleFormFieldChange("developer_id", value === "none" ? "" : value)}
                  >
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder="Select developer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="cursor-pointer">None</SelectItem>
                      {developers && developers.length > 0 && developers.map((dev) => (
                        <SelectItem key={dev.id} value={dev.id.toString()} className="cursor-pointer">
                          {dev.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor={isEditing ? "area" : "add_area"}>Area</FieldLabel>
                  <Select
                    value={formData.area_id || "none"}
                    onValueChange={(value) => handleFormFieldChange("area_id", value === "none" ? "" : value)}
                  >
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder="Select area" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="cursor-pointer">None</SelectItem>
                      {areas && areas.length > 0 && areas.map((area) => (
                        <SelectItem key={area.id} value={area.id.toString()} className="cursor-pointer">
                          {area.title} ({area.city})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor={isEditing ? "type" : "add_type"}>Type *</FieldLabel>
                  <Select
                    value={formData.type || "Off Plan"}
                    onValueChange={(value) => handleFormFieldChange("type", value as ProjectType)}
                  >
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROJECT_TYPE_DISPLAY_NAMES).map(([key, displayName]) => (
                        <SelectItem key={key} value={key} className="cursor-pointer">
                          {displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor={isEditing ? "price" : "add_price"}>Price (AED)</FieldLabel>
                  <Input
                    id={isEditing ? "price" : "add_price"}
                    type="number"
                    value={formData.price || ""}
                    onChange={(e) => handleFormFieldChange("price", e.target.value)}
                    placeholder="120000"
                  />
                </Field>
                <Field>
                  <FieldLabel>Location</FieldLabel>
                  <div className="space-y-3">
                    <LocationMap
                      latitude={formData.latitude ? parseFloat(formData.latitude) : null}
                      longitude={formData.longitude ? parseFloat(formData.longitude) : null}
                      onLocationChange={(lat, lng) => {
                        // Update both coordinates atomically
                        onFormDataChange({
                          ...formData,
                          latitude: lat.toString(),
                          longitude: lng.toString(),
                        })
                      }}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <FieldLabel htmlFor={isEditing ? "latitude" : "add_latitude"}>Latitude</FieldLabel>
                        <Input
                          id={isEditing ? "latitude" : "add_latitude"}
                          type="number"
                          step="any"
                          value={formData.latitude || ""}
                          onChange={(e) => handleFormFieldChange("latitude", e.target.value)}
                          placeholder="25.2048"
                        />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor={isEditing ? "longitude" : "add_longitude"}>Longitude</FieldLabel>
                        <Input
                          id={isEditing ? "longitude" : "add_longitude"}
                          type="number"
                          step="any"
                          value={formData.longitude || ""}
                          onChange={(e) => handleFormFieldChange("longitude", e.target.value)}
                          placeholder="55.2708"
                        />
                      </div>
                    </div>
                  </div>
                </Field>
              </FieldGroup>
            </TabsContent>
            
            <TabsContent value="media" className="space-y-4 mt-4">
              <FieldGroup className="max-h-[60vh] overflow-y-auto">
                {/* Existing Media Section (Edit mode only) */}
                {isEditing && existingMedia.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <FieldLabel className="text-base font-medium">
                        Existing Media
                      </FieldLabel>
                      <span className="text-xs text-muted-foreground">
                        {existingMedia.filter(m => !mediaToDelete.includes(m.id)).length} items
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {existingMedia.map((media) => {
                        const isMarkedForDelete = mediaToDelete.includes(media.id)
                        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
                        return (
                          <div
                            key={media.id}
                            className={`relative group border rounded-lg overflow-hidden bg-muted/30 ${
                              isMarkedForDelete ? 'opacity-50 ring-2 ring-destructive' : ''
                            }`}
                          >
                            {media.image ? (
                              <div className="aspect-square relative">
                                <img
                                  src={media.image.startsWith('http') 
                                    ? media.image 
                                    : `${supabaseUrl}/storage/v1/object/public/${media.image}`}
                                  alt="Project media"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    // Fallback if image fails to load
                                    const target = e.target as HTMLImageElement
                                    target.style.display = 'none'
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                <Button
                                  type="button"
                                  variant={isMarkedForDelete ? "default" : "destructive"}
                                  size="sm"
                                  onClick={() => {
                                    if (onMediaToDeleteChange) {
                                      if (isMarkedForDelete) {
                                        onMediaToDeleteChange(mediaToDelete.filter(id => id !== media.id))
                                      } else {
                                        onMediaToDeleteChange([...mediaToDelete, media.id])
                                      }
                                    }
                                  }}
                                  disabled={isSaving}
                                  className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                >
                                  {isMarkedForDelete ? <Plus className="h-4 w-4 rotate-45" /> : <X className="h-4 w-4" />}
                                </Button>
                              </div>
                            ) : media.video ? (
                              <div className="aspect-square relative flex items-center justify-center bg-primary/10">
                                <Video className="h-12 w-12 text-primary" />
                                <Button
                                  type="button"
                                  variant={isMarkedForDelete ? "default" : "destructive"}
                                  size="sm"
                                  onClick={() => {
                                    if (onMediaToDeleteChange) {
                                      if (isMarkedForDelete) {
                                        onMediaToDeleteChange(mediaToDelete.filter(id => id !== media.id))
                                      } else {
                                        onMediaToDeleteChange([...mediaToDelete, media.id])
                                      }
                                    }
                                  }}
                                  disabled={isSaving}
                                  className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                >
                                  {isMarkedForDelete ? <Plus className="h-4 w-4 rotate-45" /> : <X className="h-4 w-4" />}
                                </Button>
                              </div>
                            ) : null}
                            {isMarkedForDelete && (
                              <div className="absolute inset-0 flex items-center justify-center bg-destructive/20">
                                <span className="text-xs font-medium text-destructive">Marked for deletion</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                
                {/* Images Upload Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <FieldLabel className="text-base font-medium">
                      Images {!isEditing && <span className="text-destructive">*</span>}
                    </FieldLabel>
                    <span className="text-xs text-muted-foreground">
                      {projectFiles.images.length} {projectFiles.images.length === 1 ? 'image' : 'images'}
                    </span>
                  </div>
                  
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleMultipleFileChange("images", e.target.files)}
                    disabled={isSaving}
                    className="hidden"
                  />
                  
                  {projectFiles.images.length === 0 ? (
                    <div
                      onClick={() => triggerFileInput("images")}
                      className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <Upload className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Click to upload images</p>
                          <p className="text-xs text-muted-foreground mt-1">Select one or more image files</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {projectFiles.images.map((file, index) => {
                        const fileSize = (file.size / 1024 / 1024).toFixed(2)
                        const previewUrl = imagePreviewUrls[index]
                        return (
                          <div key={index} className="relative group border rounded-lg overflow-hidden bg-muted/30">
                            <div className="aspect-square relative">
                              <img
                                src={previewUrl}
                                alt={file.name}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => removeFile("images", index)}
                                disabled={isSaving}
                                className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="p-2 space-y-1">
                              <p className="text-xs font-medium truncate" title={file.name}>
                                {file.name}
                              </p>
                              <p className="text-xs text-muted-foreground">{fileSize} MB</p>
                            </div>
                          </div>
                        )
                      })}
                      <div
                        onClick={() => triggerFileInput("images")}
                        className="border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors flex flex-col items-center justify-center min-h-[120px]"
                      >
                        <Plus className="h-6 w-6 text-muted-foreground mb-1" />
                        <p className="text-xs text-muted-foreground">Add more</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Videos Upload Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <FieldLabel className="text-base font-medium">
                      Videos <span className="text-muted-foreground text-xs font-normal">(Optional)</span>
                    </FieldLabel>
                    <span className="text-xs text-muted-foreground">
                      {projectFiles.videos.length} {projectFiles.videos.length === 1 ? 'video' : 'videos'}
                    </span>
                  </div>
                  
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    multiple
                    onChange={(e) => handleMultipleFileChange("videos", e.target.files)}
                    disabled={isSaving}
                    className="hidden"
                  />
                  
                  {projectFiles.videos.length === 0 ? (
                    <div
                      onClick={() => triggerFileInput("videos")}
                      className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Video className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Click to upload videos</p>
                          <p className="text-xs text-muted-foreground mt-1">Select one or more video files</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {projectFiles.videos.map((file, index) => {
                        const fileSize = (file.size / 1024 / 1024).toFixed(2)
                        return (
                          <div key={index} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30 group hover:bg-muted/50 transition-colors">
                            <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded flex items-center justify-center">
                              <Video className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate" title={file.name}>
                                {file.name}
                              </p>
                              <p className="text-xs text-muted-foreground">{fileSize} MB</p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile("videos", index)}
                              disabled={isSaving}
                              className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )
                      })}
                      <div
                        onClick={() => triggerFileInput("videos")}
                        className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-3 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                          <Plus className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">Add more videos</p>
                      </div>
                    </div>
                  )}
                </div>

                <Field>
                  <FieldLabel htmlFor="project-brochure">
                    Brochure (PDF) <span className="text-muted-foreground text-xs">(Optional)</span>
                  </FieldLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      id="project-brochure"
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(e) => handleFileChange("brochure", e.target.files?.[0] || null)}
                      disabled={isSaving}
                      className="cursor-pointer"
                    />
                    {projectFiles.brochure && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {projectFiles.brochure.name}
                      </span>
                    )}
                  </div>
                </Field>

                <Field>
                  <FieldLabel htmlFor="project-floor-plan">
                    Floor Plan (PDF) <span className="text-muted-foreground text-xs">(Optional)</span>
                  </FieldLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      id="project-floor-plan"
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(e) => handleFileChange("floorPlan", e.target.files?.[0] || null)}
                      disabled={isSaving}
                      className="cursor-pointer"
                    />
                    {projectFiles.floorPlan && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {projectFiles.floorPlan.name}
                      </span>
                    )}
                  </div>
                </Field>
              </FieldGroup>
            </TabsContent>
            
            <TabsContent value="travel-time" className="space-y-4 mt-4">
              <FieldGroup className="max-h-[60vh] overflow-y-auto space-y-4">
                {/* Existing Travel Times (Edit mode only) */}
                {isEditing && travelTimes.filter(tt => !travelTimesToDelete.includes(tt.id)).length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <FieldLabel className="text-base font-medium">Existing Travel Times</FieldLabel>
                      <span className="text-xs text-muted-foreground">
                        {travelTimes.filter(tt => !travelTimesToDelete.includes(tt.id)).length} items
                      </span>
                    </div>
                    <div className="space-y-2">
                      {travelTimes
                        .filter(tt => !travelTimesToDelete.includes(tt.id))
                        .map((travelTime) => {
                          const iconConfig = getTravelTimeIcon(travelTime.icon)
                          const IconComponent = iconConfig?.icon || MapPin
                          const iconLabel = iconConfig?.label || travelTime.icon
                          return (
                            <div key={travelTime.id} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30 group hover:bg-muted/50 transition-colors">
                              <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded flex items-center justify-center">
                                <IconComponent className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{iconLabel}</p>
                                <p className="text-xs text-muted-foreground">{travelTime.minutes} minutes</p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (onTravelTimesToDeleteChange) {
                                    onTravelTimesToDeleteChange([...travelTimesToDelete, travelTime.id])
                                  }
                                }}
                                disabled={isSaving}
                                className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}

                {/* Add Travel Time Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <FieldLabel className="text-base font-medium">Travel Times</FieldLabel>
                    <span className="text-xs text-muted-foreground">
                      {travelTimes.filter(tt => !travelTimesToDelete.includes(tt.id)).length} {travelTimes.filter(tt => !travelTimesToDelete.includes(tt.id)).length === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  {travelTimes.filter(tt => !travelTimesToDelete.includes(tt.id)).length === 0 && (
                    <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
                      No travel times added. Click "Add Travel Time" below to add one.
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (onTravelTimesChange) {
                        onTravelTimesChange([...travelTimes, { id: Date.now(), project_id: 0, minutes: 0, icon: 'taxi' }])
                      }
                    }}
                    disabled={isSaving}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Travel Time
                  </Button>

                  {/* Travel Time Forms */}
                  {travelTimes
                    .filter(tt => !travelTimesToDelete.includes(tt.id))
                    .map((travelTime, index) => {
                      const isNew = travelTime.id >= 1000000 // New items have timestamp IDs (Date.now() >= 1000000)
                      return (
                        <div key={travelTime.id || index} className="border rounded-lg p-4 space-y-3 bg-card">
                          <div className="flex items-center justify-between">
                            <FieldLabel className="text-sm font-medium">Travel Time {index + 1}</FieldLabel>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (onTravelTimesChange) {
                                  if (isNew) {
                                    onTravelTimesChange(travelTimes.filter(tt => tt.id !== travelTime.id))
                                  } else {
                                    if (onTravelTimesToDeleteChange) {
                                      onTravelTimesToDeleteChange([...travelTimesToDelete, travelTime.id])
                                    }
                                  }
                                }
                              }}
                              disabled={isSaving}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <Field>
                              <FieldLabel htmlFor={`travel-time-icon-${travelTime.id || index}`}>Icon</FieldLabel>
                              <Select
                                value={travelTime.icon}
                                onValueChange={(value) => {
                                  if (onTravelTimesChange) {
                                    const updated = travelTimes.map(tt =>
                                      tt.id === travelTime.id ? { ...tt, icon: value } : tt
                                    )
                                    onTravelTimesChange(updated)
                                  }
                                }}
                                disabled={isSaving}
                              >
                                <SelectTrigger className="cursor-pointer">
                                  <SelectValue placeholder="Select location/icon" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                  {TRAVEL_TIME_ICONS.map((iconConfig) => {
                                    const IconComponent = iconConfig.icon
                                    return (
                                      <SelectItem key={iconConfig.value} value={iconConfig.value} className="cursor-pointer">
                                        <div className="flex items-center gap-2">
                                          <IconComponent className="h-4 w-4" />
                                          {iconConfig.label}
                                        </div>
                                      </SelectItem>
                                    )
                                  })}
                                </SelectContent>
                              </Select>
                            </Field>

                            <Field>
                              <FieldLabel htmlFor={`travel-time-minutes-${travelTime.id || index}`}>Minutes</FieldLabel>
                              <Input
                                id={`travel-time-minutes-${travelTime.id || index}`}
                                type="number"
                                min="0"
                                value={travelTime.minutes || ""}
                                onChange={(e) => {
                                  if (onTravelTimesChange) {
                                    const updated = travelTimes.map(tt =>
                                      tt.id === travelTime.id ? { ...tt, minutes: parseInt(e.target.value) || 0 } : tt
                                    )
                                    onTravelTimesChange(updated)
                                  }
                                }}
                                placeholder="15"
                                disabled={isSaving}
                              />
                            </Field>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </FieldGroup>
            </TabsContent>
            
            <TabsContent value="payment-plan" className="space-y-4 mt-4">
              <FieldGroup className="max-h-[60vh] overflow-y-auto space-y-4">
                {/* Existing Payment Plans (Edit mode only) */}
                {isEditing && paymentPlans.filter(pp => !paymentPlansToDelete.includes(pp.id)).length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <FieldLabel className="text-base font-medium">Existing Payment Plans</FieldLabel>
                      <span className="text-xs text-muted-foreground">
                        {paymentPlans.filter(pp => !paymentPlansToDelete.includes(pp.id)).length} items
                      </span>
                    </div>
                    <div className="space-y-2">
                      {paymentPlans
                        .filter(pp => !paymentPlansToDelete.includes(pp.id))
                        .map((paymentPlan) => (
                          <div key={paymentPlan.id} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30 group hover:bg-muted/50 transition-colors">
                            <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded flex items-center justify-center">
                              <span className="text-sm font-bold text-primary">{paymentPlan.percentage}%</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{paymentPlan.title || 'Untitled'}</p>
                              <p className="text-xs text-muted-foreground">{paymentPlan.percentage}%</p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (onPaymentPlansToDeleteChange) {
                                  onPaymentPlansToDeleteChange([...paymentPlansToDelete, paymentPlan.id])
                                }
                              }}
                              disabled={isSaving}
                              className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Add Payment Plan Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <FieldLabel className="text-base font-medium">Payment Plans</FieldLabel>
                    <span className="text-xs text-muted-foreground">
                      {paymentPlans.filter(pp => !paymentPlansToDelete.includes(pp.id)).length} {paymentPlans.filter(pp => !paymentPlansToDelete.includes(pp.id)).length === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  {paymentPlans.filter(pp => !paymentPlansToDelete.includes(pp.id)).length === 0 && (
                    <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
                      No payment plans added. Click "Add Payment Plan" below to add one.
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (onPaymentPlansChange) {
                        onPaymentPlansChange([...paymentPlans, { id: Date.now(), project_id: 0, title: '', percentage: 0 }])
                      }
                    }}
                    disabled={isSaving}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Payment Plan
                  </Button>

                  {/* Payment Plan Forms */}
                  {paymentPlans
                    .filter(pp => !paymentPlansToDelete.includes(pp.id))
                    .map((paymentPlan, index) => {
                      const isNew = paymentPlan.id >= 1000000 // New items have timestamp IDs (Date.now() >= 1000000)
                      return (
                        <div key={paymentPlan.id || index} className="border rounded-lg p-4 space-y-3 bg-card">
                          <div className="flex items-center justify-between">
                            <FieldLabel className="text-sm font-medium">Payment Plan {index + 1}</FieldLabel>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (onPaymentPlansChange) {
                                  if (isNew) {
                                    onPaymentPlansChange(paymentPlans.filter(pp => pp.id !== paymentPlan.id))
                                  } else {
                                    if (onPaymentPlansToDeleteChange) {
                                      onPaymentPlansToDeleteChange([...paymentPlansToDelete, paymentPlan.id])
                                    }
                                  }
                                }
                              }}
                              disabled={isSaving}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          <Field>
                            <FieldLabel htmlFor={`payment-plan-title-${paymentPlan.id || index}`}>Title *</FieldLabel>
                            <Input
                              id={`payment-plan-title-${paymentPlan.id || index}`}
                              type="text"
                              value={paymentPlan.title || ""}
                              onChange={(e) => {
                                if (onPaymentPlansChange) {
                                  const updated = paymentPlans.map(pp =>
                                    pp.id === paymentPlan.id ? { ...pp, title: e.target.value } : pp
                                  )
                                  onPaymentPlansChange(updated)
                                }
                              }}
                              placeholder="e.g., Down Payment, Installment 1, etc."
                              disabled={isSaving}
                            />
                          </Field>

                          <Field>
                            <FieldLabel htmlFor={`payment-plan-percentage-${paymentPlan.id || index}`}>Percentage (%)</FieldLabel>
                            <Input
                              id={`payment-plan-percentage-${paymentPlan.id || index}`}
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={paymentPlan.percentage || ""}
                              onChange={(e) => {
                                if (onPaymentPlansChange) {
                                  const updated = paymentPlans.map(pp =>
                                    pp.id === paymentPlan.id ? { ...pp, percentage: parseFloat(e.target.value) || 0 } : pp
                                  )
                                  onPaymentPlansChange(updated)
                                }
                              }}
                              placeholder="30"
                              disabled={isSaving}
                            />
                          </Field>
                        </div>
                      )
                    })}
                </div>
              </FieldGroup>
            </TabsContent>
          </Tabs>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={isSaving} className="cursor-pointer">
            {isSaving ? (isEditing ? "Saving..." : "Creating...") : (isEditing ? "Save Changes" : "Create Project")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
