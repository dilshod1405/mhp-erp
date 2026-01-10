import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSearch: () => void
  placeholder?: string
  className?: string
}

export function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = "Search...",
  className = "",
}: SearchBarProps) {
  return (
    <div className={`relative flex-1 max-w-sm ${className}`}>
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSearch()
          }
        }}
        className="pr-10 cursor-pointer"
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={onSearch}
        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 cursor-pointer"
        title="Search"
      >
        <Search className="h-4 w-4" />
      </Button>
    </div>
  )
}
