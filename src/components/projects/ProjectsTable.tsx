import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, ExternalLink } from "lucide-react"
import { PROJECT_TYPE_DISPLAY_NAMES, type ProjectType } from "@/config/project-types"
import type { Project } from "@/types/project"

interface ProjectsTableProps {
  projects: Project[]
  projectType: ProjectType
  canEdit: boolean
  deletingProjectId: number | null
  onEdit: (project: Project) => void
  onDelete: (projectId: number) => void
  getDeveloperName: (developerId: number | null) => string
  getAreaName: (areaId: number | null) => string
  formatPrice: (price: number | null) => string
}

export function ProjectsTable({
  projects,
  projectType,
  canEdit,
  deletingProjectId,
  onEdit,
  onDelete,
  getDeveloperName,
  getAreaName,
  formatPrice,
}: ProjectsTableProps) {
  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table className="min-w-full">
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Developer</TableHead>
            <TableHead>Area</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Brochure</TableHead>
            <TableHead>Floor Plan</TableHead>
            <TableHead>Created</TableHead>
            {canEdit && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.length === 0 ? (
            <TableRow>
              <TableCell colSpan={canEdit ? 8 : 7} className="text-center text-muted-foreground">
                No {PROJECT_TYPE_DISPLAY_NAMES[projectType].toLowerCase()} projects found. Click "Add Project" to create one.
              </TableCell>
            </TableRow>
          ) : (
            projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="font-medium">{project.title || project.slug}</TableCell>
                <TableCell>{getDeveloperName(project.developer_id)}</TableCell>
                <TableCell>{getAreaName(project.area_id)}</TableCell>
                <TableCell>{formatPrice(project.price)}</TableCell>
                <TableCell>
                  {project.file_brochure ? (
                    <a
                      href={project.file_brochure}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  {project.file_floor_plan ? (
                    <a
                      href={project.file_floor_plan}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>{new Date(project.created_at).toISOString().split('T')[0]}</TableCell>
                {canEdit && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(project)}
                        className="cursor-pointer"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(project.id)}
                        disabled={deletingProjectId === project.id}
                        className="cursor-pointer"
                      >
                        {deletingProjectId === project.id ? (
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
  )
}
