import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface CardSkeletonProps {
  count?: number
  showActions?: boolean
}

export function CardSkeleton({ count = 8, showActions = false }: CardSkeletonProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex-1 min-w-0">
              <Skeleton className="h-6 w-24" />
            </div>
            {showActions && (
              <div className="flex gap-1 ml-2">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            )}
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center flex-1 pt-4">
            <div className="w-full aspect-square flex items-center justify-center mb-4 bg-muted rounded-lg p-4">
              <Skeleton className="h-20 w-20 rounded-md" />
            </div>
            <div className="w-full space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
