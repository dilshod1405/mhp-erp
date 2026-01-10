import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

interface TableSkeletonProps {
  columns: number
  rows?: number
  hasActions?: boolean
  hasCheckbox?: boolean
  columnHeaders?: string[]
}

export function TableSkeleton({
  columns,
  rows = 5,
  hasActions = false,
  hasCheckbox = false,
  columnHeaders,
}: TableSkeletonProps) {
  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table className="min-w-full">
        <TableHeader>
          <TableRow>
            {hasCheckbox && (
              <TableHead className="w-12">
                <Skeleton className="h-4 w-4" />
              </TableHead>
            )}
            {columnHeaders && columnHeaders.length > 0 ? (
              <>
                {columnHeaders.map((header, index) => (
                  <TableHead key={index}>{header}</TableHead>
                ))}
                {hasActions && <TableHead className="text-right">Actions</TableHead>}
              </>
            ) : (
              <>
                {Array.from({ length: columns }).map((_, index) => (
                  <TableHead key={index}>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                ))}
                {hasActions && <TableHead className="text-right">Actions</TableHead>}
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {hasCheckbox && (
                <TableCell>
                  <Skeleton className="h-4 w-4 rounded" />
                </TableCell>
              )}
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={colIndex}>
                  <Skeleton className="h-4 w-full max-w-[200px]" />
                </TableCell>
              ))}
              {hasActions && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
