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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Filter, X } from "lucide-react"
import type { Developer } from "@/types/developer"
import type { Area } from "@/types/area"

interface ProjectsFiltersProps {
  isMobile: boolean
  isFilterOpen: boolean
  onFilterToggle: () => void
  onFilterOpenChange: (open: boolean) => void
  filterDeveloper: string
  filterArea: string
  filterPriceMin: string
  filterPriceMax: string
  developers: Developer[]
  areas: Area[]
  hasFilterChanges: boolean
  hasActiveFilters: boolean
  onDeveloperChange: (value: string) => void
  onAreaChange: (value: string) => void
  onPriceMinChange: (value: string) => void
  onPriceMaxChange: (value: string) => void
  onApplyFilters: () => void
  onClearFilters: () => void
}

export function ProjectsFilters({
  isMobile,
  isFilterOpen,
  onFilterToggle,
  onFilterOpenChange,
  filterDeveloper,
  filterArea,
  filterPriceMin,
  filterPriceMax,
  developers,
  areas,
  hasFilterChanges,
  hasActiveFilters,
  onDeveloperChange,
  onAreaChange,
  onPriceMinChange,
  onPriceMaxChange,
  onApplyFilters,
  onClearFilters,
}: ProjectsFiltersProps) {
  return (
    <>
      <Button
        variant="outline"
        onClick={onFilterToggle}
        className="cursor-pointer"
      >
        <Filter className="h-4 w-4 mr-2" />
        Filters
      </Button>

      {/* Desktop Filters */}
      {isFilterOpen && !isMobile && (
        <div className="hidden md:flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <FieldLabel htmlFor="filter-developer">Developer:</FieldLabel>
            <Select value={filterDeveloper} onValueChange={onDeveloperChange}>
              <SelectTrigger id="filter-developer" className="w-[200px] cursor-pointer">
                <SelectValue placeholder="All Developers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">All Developers</SelectItem>
                {developers.map((dev) => (
                  <SelectItem key={dev.id} value={dev.id.toString()} className="cursor-pointer">
                    {dev.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <FieldLabel htmlFor="filter-area">Area:</FieldLabel>
            <Select value={filterArea} onValueChange={onAreaChange}>
              <SelectTrigger id="filter-area" className="w-[200px] cursor-pointer">
                <SelectValue placeholder="All Areas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">All Areas</SelectItem>
                {areas.map((area) => (
                  <SelectItem key={area.id} value={area.id.toString()} className="cursor-pointer">
                    {area.title} ({area.city})
                  </SelectItem>
                ))}
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
              onChange={(e) => onPriceMinChange(e.target.value)}
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
              onChange={(e) => onPriceMaxChange(e.target.value)}
              className="w-[120px] cursor-pointer"
            />
          </div>

          <Button
            onClick={onApplyFilters}
            className="cursor-pointer"
            disabled={!hasFilterChanges}
          >
            Apply Filters
          </Button>

          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              className="cursor-pointer"
            >
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          )}
        </div>
      )}

      {/* Mobile Filter Dialog */}
      <Dialog 
        open={isFilterOpen && isMobile} 
        onOpenChange={(open) => {
          if (isMobile) {
            onFilterOpenChange(open)
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
              <FieldLabel htmlFor="sheet-filter-developer">Developer</FieldLabel>
              <Select value={filterDeveloper} onValueChange={onDeveloperChange}>
                <SelectTrigger id="sheet-filter-developer" className="cursor-pointer">
                  <SelectValue placeholder="All Developers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="cursor-pointer">All Developers</SelectItem>
                  {developers.map((dev) => (
                    <SelectItem key={dev.id} value={dev.id.toString()} className="cursor-pointer">
                      {dev.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="sheet-filter-area">Area</FieldLabel>
              <Select value={filterArea} onValueChange={onAreaChange}>
                <SelectTrigger id="sheet-filter-area" className="cursor-pointer">
                  <SelectValue placeholder="All Areas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="cursor-pointer">All Areas</SelectItem>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.id.toString()} className="cursor-pointer">
                      {area.title} ({area.city})
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
                onChange={(e) => onPriceMinChange(e.target.value)}
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
                onChange={(e) => onPriceMaxChange(e.target.value)}
                className="cursor-pointer"
              />
            </Field>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => {
                  onApplyFilters()
                  onFilterOpenChange(false)
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
                    onClearFilters()
                    onFilterOpenChange(false)
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
    </>
  )
}
