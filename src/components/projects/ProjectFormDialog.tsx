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
import { Image, Video, FileText } from "lucide-react"
import { PROJECT_TYPES, PROJECT_TYPE_DISPLAY_NAMES, type ProjectType } from "@/config/project-types"
import type { Developer } from "@/types/developer"
import type { Area } from "@/types/area"

interface ProjectFormData {
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
  image: File | null
  video: File | null
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
  onFormDataChange: (data: ProjectFormData) => void
  onProjectFilesChange: (files: ProjectFiles) => void
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
  onFormDataChange,
  onProjectFilesChange,
  onSave,
}: ProjectFormDialogProps) {
  const handleFormFieldChange = (field: keyof ProjectFormData, value: string) => {
    onFormDataChange({ ...formData, [field]: value })
  }

  const handleFileChange = (field: keyof ProjectFiles, file: File | null) => {
    onProjectFilesChange({ ...projectFiles, [field]: file })
  }

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
          {isSaving && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              {isEditing ? "Saving..." : "Creating..."}
            </div>
          )}
          <FieldGroup className="max-h-[60vh] overflow-y-auto">
            <Field>
              <FieldLabel htmlFor={isEditing ? "slug" : "add_slug"}>Slug *</FieldLabel>
              <Input
                id={isEditing ? "slug" : "add_slug"}
                value={formData.slug || ""}
                onChange={(e) => handleFormFieldChange("slug", e.target.value)}
                placeholder="project-slug"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={isEditing ? "type" : "add_type"}>Type</FieldLabel>
              <Select
                value={formData.type || projectType || "Off Plan"}
                onValueChange={(value) => handleFormFieldChange("type", value as ProjectType)}
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map((type) => (
                    <SelectItem key={type} value={type} className="cursor-pointer">
                      {PROJECT_TYPE_DISPLAY_NAMES[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <FieldLabel htmlFor={isEditing ? "price" : "add_price"}>Price (AED)</FieldLabel>
              <Input
                id={isEditing ? "price" : "add_price"}
                type="number"
                value={formData.price || ""}
                onChange={(e) => handleFormFieldChange("price", e.target.value)}
                placeholder="120000"
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor={isEditing ? "latitude" : "add_latitude"}>Latitude</FieldLabel>
                <Input
                  id={isEditing ? "latitude" : "add_latitude"}
                  type="number"
                  step="any"
                  value={formData.latitude || ""}
                  onChange={(e) => handleFormFieldChange("latitude", e.target.value)}
                  placeholder="41.311081"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={isEditing ? "longitude" : "add_longitude"}>Longitude</FieldLabel>
                <Input
                  id={isEditing ? "longitude" : "add_longitude"}
                  type="number"
                  step="any"
                  value={formData.longitude || ""}
                  onChange={(e) => handleFormFieldChange("longitude", e.target.value)}
                  placeholder="69.240562"
                />
              </Field>
            </div>
            
            {!isEditing && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-sm font-semibold">File Uploads</h3>
                
                <Field>
                  <FieldLabel htmlFor="project-image">
                    Image * <span className="text-muted-foreground text-xs">(Required)</span>
                  </FieldLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      id="project-image"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange("image", e.target.files?.[0] || null)}
                      disabled={isSaving}
                      className="cursor-pointer"
                    />
                    {projectFiles.image && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Image className="h-4 w-4" />
                        {projectFiles.image.name}
                      </span>
                    )}
                  </div>
                </Field>

                <Field>
                  <FieldLabel htmlFor="project-video">
                    Video <span className="text-muted-foreground text-xs">(Optional)</span>
                  </FieldLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      id="project-video"
                      type="file"
                      accept="video/*"
                      onChange={(e) => handleFileChange("video", e.target.files?.[0] || null)}
                      disabled={isSaving}
                      className="cursor-pointer"
                    />
                    {projectFiles.video && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Video className="h-4 w-4" />
                        {projectFiles.video.name}
                      </span>
                    )}
                  </div>
                </Field>

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
              </div>
            )}

            {isEditing && (
              <>
                <Field>
                  <FieldLabel htmlFor="file_brochure">Brochure URL</FieldLabel>
                  <Input
                    id="file_brochure"
                    value={formData.file_brochure || ""}
                    onChange={(e) => handleFormFieldChange("file_brochure", e.target.value)}
                    placeholder="https://example.com/brochure.pdf"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="file_floor_plan">Floor Plan URL</FieldLabel>
                  <Input
                    id="file_floor_plan"
                    value={formData.file_floor_plan || ""}
                    onChange={(e) => handleFormFieldChange("file_floor_plan", e.target.value)}
                    placeholder="https://example.com/floor-plan.png"
                  />
                </Field>
              </>
            )}
          </FieldGroup>
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
