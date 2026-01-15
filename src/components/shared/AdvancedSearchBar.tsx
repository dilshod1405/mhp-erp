import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { X, Search, Save, Clock, CalendarIcon, ArrowUpDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { parseQuery } from "@/lib/query-parser"

export interface SearchColumn {
  key: string
  label: string
  type: 'text' | 'number' | 'date'
}

export interface SavedSearch {
  id: string
  name: string
  query: string
  timestamp: number
}

interface AdvancedSearchBarProps {
  columns: SearchColumn[]
  value: string
  onChange: (query: string) => void
  onApply: (query: string) => void
  placeholder?: string
  className?: string
  savedSearches?: SavedSearch[]
  onSaveSearch?: (name: string, query: string) => void
  onLoadSearch?: (query: string) => void
  onDeleteSearch?: (id: string) => void
}

export function AdvancedSearchBar({
  columns,
  value,
  onChange,
  onApply,
  placeholder = "Search and filter",
  className,
  savedSearches = [],
  onSaveSearch,
  onLoadSearch,
  onDeleteSearch,
}: AdvancedSearchBarProps) {
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<SearchColumn[]>([])
  const [suggestionIndex, setSuggestionIndex] = useState(-1)
  const [currentFilterColumn, setCurrentFilterColumn] = useState<SearchColumn | null>(null)
  const [saveSearchName, setSaveSearchName] = useState('')
  // Internal state for input value - allows typing incomplete filters without triggering parent onChange
  const [internalValue, setInternalValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Sync internal value with prop value when it changes externally (e.g., from saved search)
  useEffect(() => {
    setInternalValue(value)
  }, [value])

  const parsed = useMemo(() => parseQuery(internalValue, columns), [internalValue, columns])

  // Check if there's an incomplete filter (column= but no value)
  const hasIncompleteFilter = useMemo(() => {
    if (!internalValue.trim()) return false
    // Check if there's a pattern like "column=" or "column:" at the end
    const trimmed = internalValue.trim()
    const lastSpaceIndex = trimmed.lastIndexOf(' ')
    const lastPart = trimmed.substring(lastSpaceIndex + 1)
    
    if (lastPart.includes('=') || lastPart.includes(':')) {
      const separatorIndex = lastPart.indexOf('=') !== -1 ? lastPart.indexOf('=') : lastPart.indexOf(':')
      const keyPart = lastPart.substring(0, separatorIndex)
      
      if (keyPart) {
        // Check if it's a valid column
        const column = columns.find(
          col => col.key.toLowerCase() === keyPart.toLowerCase() ||
          col.label.toLowerCase().replace(/\s+/g, '_') === keyPart.toLowerCase()
        )
        if (column) {
          const valuePart = lastPart.substring(separatorIndex + 1)
          // If value is empty or just whitespace, it's incomplete
          return !valuePart || valuePart.trim() === ''
        }
      }
    }
    return false
  }, [internalValue, columns])

  // Get suggestions based on current input
  useEffect(() => {
    const cursorPosition = inputRef.current?.selectionStart || internalValue.length
    const textBefore = internalValue.substring(0, cursorPosition)
    const lastSpaceIndex = textBefore.lastIndexOf(' ')
    const currentWord = textBefore.substring(lastSpaceIndex + 1).toLowerCase()

    // If input is empty or just spaces, show all columns
    if (!internalValue.trim()) {
      // Don't clear suggestions here, let focus/click handlers manage it
      return
    }

    // If typing a column name (before = or :)
    if (currentWord && !currentWord.includes('=') && !currentWord.includes(':')) {
      const filtered = columns.filter(col =>
        col.key.toLowerCase().startsWith(currentWord) ||
        col.label.toLowerCase().startsWith(currentWord)
      )
      setSuggestions(filtered.slice(0, 10))
    } else if (currentWord.includes('=') || currentWord.includes(':')) {
      // If we're after = or :, no suggestions needed
      setSuggestions([])
    } else {
      // Show all columns if no match
      setSuggestions(columns.slice(0, 10))
    }
  }, [internalValue, columns])

  // Check if we're in a date column filter
  useEffect(() => {
    if (!internalValue.trim()) {
      setCurrentFilterColumn(null)
      setIsCalendarOpen(false)
      return
    }

    const cursorPosition = inputRef.current?.selectionStart || internalValue.length
    const textBefore = internalValue.substring(0, cursorPosition)
    const parts = textBefore.split(/\s+/)
    const lastPart = parts[parts.length - 1] || ''
    
    if (lastPart.includes('=') || lastPart.includes(':')) {
      const [keyPart] = lastPart.split(/[=:]/)
      const column = columns.find(
        col => col.key.toLowerCase() === keyPart.toLowerCase() ||
        col.label.toLowerCase().replace(/\s+/g, '_') === keyPart.toLowerCase()
      )
      if (column?.type === 'date') {
        setCurrentFilterColumn(column)
        // Auto-open calendar if date column is selected and value is empty or incomplete
        const separatorIndex = lastPart.indexOf('=') !== -1 ? lastPart.indexOf('=') : lastPart.indexOf(':')
        const valuePart = lastPart.substring(separatorIndex + 1)
        if (!valuePart || valuePart.trim() === '') {
          // Auto-open calendar after a short delay
          const timeoutId = setTimeout(() => {
            setIsCalendarOpen(true)
          }, 150)
          return () => clearTimeout(timeoutId)
        } else {
          // If value exists, close calendar
          setIsCalendarOpen(false)
        }
      } else {
        setCurrentFilterColumn(null)
        setIsCalendarOpen(false)
      }
    } else {
      setCurrentFilterColumn(null)
      setIsCalendarOpen(false)
    }
  }, [internalValue, columns])

  // Debounced auto-apply - only if no incomplete filters
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = undefined
    }

    // If there's an incomplete filter, don't trigger new search
    // But keep the previous search results visible
    if (hasIncompleteFilter) {
      // Don't call onApply - this keeps previous searchQuery unchanged
      // So table won't disappear
      // Also clear any pending debounce to ensure no search triggers
      return
    }

    debounceRef.current = setTimeout(() => {
      // Always apply, even if empty - to show full list
      // Update parent's onChange only when filter is complete
      onChange(internalValue)
      onApply(internalValue)
    }, 1000)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = undefined
      }
    }
  }, [internalValue, parsed.filters.length, parsed.sort?.column, parsed.sort?.direction, hasIncompleteFilter, onApply, onChange])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle suggestion navigation
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSuggestionIndex(prev => prev < suggestions.length - 1 ? prev + 1 : prev)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSuggestionIndex(prev => prev > 0 ? prev - 1 : -1)
        return
      }
      if (e.key === 'Enter' && suggestionIndex >= 0) {
        e.preventDefault()
        handleSuggestionSelect(suggestions[suggestionIndex])
        return
      }
      if (e.key === 'Tab' && suggestionIndex >= 0) {
        e.preventDefault()
        handleSuggestionSelect(suggestions[suggestionIndex])
        return
      }
    }

    if (e.key === 'Enter') {
      if (hasIncompleteFilter) {
        return // Don't search if filter is incomplete
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      onChange(internalValue)
      onApply(internalValue)
    }
  }

  const handleSuggestionSelect = useCallback((column: SearchColumn) => {
    const cursorPosition = inputRef.current?.selectionStart || internalValue.length
    const textBefore = internalValue.substring(0, cursorPosition)
    const lastSpaceIndex = textBefore.lastIndexOf(' ')
    const currentWordStart = lastSpaceIndex + 1
    const textAfter = internalValue.substring(cursorPosition)
    
    // If input is empty, just add column.key=, otherwise replace current word
    const needsSpaceBefore = currentWordStart > 0 && !textBefore.endsWith(' ')
    const newValue = internalValue.substring(0, currentWordStart) + (needsSpaceBefore ? ' ' : '') + column.key + '=' + textAfter
    setInternalValue(newValue)
    setSuggestions([])
    setSuggestionIndex(-1)
    
    // If date column, automatically open calendar
    if (column.type === 'date') {
      setCurrentFilterColumn(column)
      setTimeout(() => {
        setIsCalendarOpen(true)
      }, 100)
    }
    
    // Clear any pending debounced search when selecting a column
    // This ensures search won't trigger until user types a value
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = undefined
    }
    
    setTimeout(() => {
      inputRef.current?.focus()
      const newCursorPos = currentWordStart + (needsSpaceBefore ? 1 : 0) + column.key.length + 1
      inputRef.current?.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }, [internalValue])

  const handleDateSelect = useCallback((date: Date | undefined) => {
    if (!date || !currentFilterColumn) return
    
    const cursorPosition = inputRef.current?.selectionStart || internalValue.length
    const textBefore = internalValue.substring(0, cursorPosition)
    const lastSpaceIndex = textBefore.lastIndexOf(' ')
    const filterStart = lastSpaceIndex + 1
    
    // Find where the filter ends (next space or end of string)
    // First, find the current filter part
    const textAfter = internalValue.substring(cursorPosition)
    const fullFilterPart = internalValue.substring(filterStart)
    const filterMatch = fullFilterPart.match(/^([^=:]+[=:])(.*?)(\s|$)/)
    
    let filterEnd: number
    if (filterMatch) {
      // Filter exists, replace its value
      filterEnd = filterStart + filterMatch[0].length
    } else {
      // No existing filter value, just append
      filterEnd = cursorPosition
    }
    
    const dateStr = format(date, 'yyyy-MM-dd')
    const newValue = internalValue.substring(0, filterStart) + currentFilterColumn.key + '=' + dateStr + (filterEnd < internalValue.length ? ' ' + internalValue.substring(filterEnd).trim() : '')
    setInternalValue(newValue)
    setIsCalendarOpen(false)
    setCurrentFilterColumn(null)
    
    setTimeout(() => {
      inputRef.current?.focus()
      // Move cursor to end of the date value
      const newCursorPos = filterStart + currentFilterColumn.key.length + 1 + dateStr.length
      inputRef.current?.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }, [internalValue, currentFilterColumn])

  const handleSaveSearch = useCallback(() => {
    if (!saveSearchName.trim()) {
      toast.error("Please enter a name for this search")
      return
    }
    if (onSaveSearch) {
      onSaveSearch(saveSearchName.trim(), internalValue)
      setSaveSearchName('')
      setIsSaveMenuOpen(false)
      toast.success("Search saved")
    }
  }, [saveSearchName, internalValue, onSaveSearch])

  const handleLoadSearch = useCallback((query: string) => {
    if (onLoadSearch) {
      setInternalValue(query)
      onLoadSearch(query)
      onChange(query)
      onApply(query)
    }
  }, [onLoadSearch, onApply, onChange])

  const handleDeleteSearch = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDeleteSearch) {
      onDeleteSearch(id)
    }
  }, [onDeleteSearch])

  const clearSearch = useCallback(() => {
    setInternalValue('')
    onChange('')
    onApply('')
  }, [onChange, onApply])

  const removeFilter = useCallback((filterIndex: number) => {
    const parts = internalValue.split(/\s+/)
    const filter = parsed.filters[filterIndex]
    
    const newParts = parts.filter(part => {
      const partLower = part.toLowerCase()
      const columnLower = filter.column.toLowerCase()
      return !partLower.includes(columnLower + ':') && !partLower.includes(columnLower + '=')
    })
    
    const newValue = newParts.join(' ')
    setInternalValue(newValue)
    onChange(newValue)
  }, [internalValue, parsed.filters, onChange])

  const removeSort = useCallback(() => {
    const newValue = internalValue.replace(/\bsort:[^\s]+/g, '').trim()
    setInternalValue(newValue)
    onChange(newValue)
  }, [internalValue, onChange])

  const removeTextSearch = useCallback(() => {
    if (!parsed.textSearch) return
    const newValue = internalValue.replace(new RegExp(`\\b${parsed.textSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), '').trim()
    setInternalValue(newValue)
    onChange(newValue)
  }, [internalValue, parsed.textSearch, onChange])

  const getColumnLabel = (key: string) => {
    return columns.find(col => col.key === key)?.label || key
  }

  const handleSortSelect = useCallback((column: SearchColumn, direction: 'asc' | 'desc') => {
    // Remove existing sort if any
    let newValue = internalValue.replace(/\bsort:[^\s]+/g, '').trim()
    
    // Add new sort
    const sortPart = `sort:${column.key}:${direction}`
    if (newValue) {
      newValue += ' ' + sortPart
    } else {
      newValue = sortPart
    }
    
    setInternalValue(newValue)
    onChange(newValue)
    setIsSortMenuOpen(false)
    
    // Apply immediately
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    onApply(newValue)
  }, [internalValue, onChange, onApply])


  const handleInputFocus = useCallback(() => {
    // Show all columns when input is focused and empty
    if (!internalValue.trim()) {
      setSuggestions(columns.slice(0, 10))
    }
  }, [internalValue, columns])

  const handleInputClick = useCallback(() => {
    // Show all columns when input is clicked and empty
    if (!internalValue.trim()) {
      setSuggestions(columns.slice(0, 10))
    }
  }, [internalValue, columns])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        suggestions.length > 0 &&
        inputRef.current &&
        suggestionsRef.current &&
        !inputRef.current.contains(target) &&
        !suggestionsRef.current.contains(target)
      ) {
        setSuggestions([])
        setSuggestionIndex(-1)
      }
    }

    if (suggestions.length > 0) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [suggestions.length])

  const hasActiveFilters = parsed.filters.length > 0 || parsed.sort || parsed.textSearch

  return (
    <div className={cn("space-y-2", className)}>
      {/* Main Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 flex items-center">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
          <Input
            ref={inputRef}
            value={internalValue}
            onChange={(e) => {
              const newValue = e.target.value
              setInternalValue(newValue)
              setSuggestionIndex(-1)
              // Only call parent onChange if there's no incomplete filter
              // This prevents triggering fetches when user is still typing
              const trimmed = newValue.trim()
              const lastSpaceIndex = trimmed.lastIndexOf(' ')
              const lastPart = trimmed.substring(lastSpaceIndex + 1)
              
              let isIncomplete = false
              if (lastPart.includes('=') || lastPart.includes(':')) {
                const separatorIndex = lastPart.indexOf('=') !== -1 ? lastPart.indexOf('=') : lastPart.indexOf(':')
                const keyPart = lastPart.substring(0, separatorIndex)
                
                if (keyPart) {
                  const column = columns.find(
                    col => col.key.toLowerCase() === keyPart.toLowerCase() ||
                    col.label.toLowerCase().replace(/\s+/g, '_') === keyPart.toLowerCase()
                  )
                  if (column) {
                    const valuePart = lastPart.substring(separatorIndex + 1)
                    isIncomplete = !valuePart || valuePart.trim() === ''
                  }
                }
              }
              
              // Only update parent if filter is complete
              if (!isIncomplete) {
                onChange(newValue)
              }
            }}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            onClick={handleInputClick}
            placeholder={placeholder}
            className="pl-9 pr-10"
          />
          
          {/* Suggestions dropdown */}
          {suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-[200px] overflow-y-auto"
            >
              {suggestions.map((column, index) => (
                <div
                  key={column.key}
                  className={cn(
                    "px-3 py-2 cursor-pointer hover:bg-accent",
                    index === suggestionIndex && "bg-accent"
                  )}
                  onClick={() => handleSuggestionSelect(column)}
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{column.label}</span>
                    <span className="text-xs text-muted-foreground">{column.key}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Date Calendar Popover - Auto-opens when date column is selected */}
          {currentFilterColumn && (
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-12 h-7 w-7"
                  onClick={() => setIsCalendarOpen(true)}
                  type="button"
                >
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                <Calendar
                  mode="single"
                  selected={undefined}
                  onSelect={handleDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}

          <div className="absolute right-1 flex items-center gap-1">
            {internalValue && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={clearSearch}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Sort Button */}
        <DropdownMenu open={isSortMenuOpen} onOpenChange={setIsSortMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              type="button"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {columns.map((column) => (
              <div key={column.key} className="flex flex-col">
                <DropdownMenuItem
                  onClick={() => handleSortSelect(column, 'asc')}
                  className="cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{column.label}</span>
                    <span className="text-xs text-muted-foreground">↑ asc</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleSortSelect(column, 'desc')}
                  className="cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{column.label}</span>
                    <span className="text-xs text-muted-foreground">↓ desc</span>
                  </div>
                </DropdownMenuItem>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Save/Load Searches */}
        {(onSaveSearch || savedSearches.length > 0) && (
          <Popover open={isSaveMenuOpen} onOpenChange={setIsSaveMenuOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0">
                <Clock className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              <div className="space-y-4">
                {onSaveSearch && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Save search as..."
                        value={saveSearchName}
                        onChange={(e) => setSaveSearchName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveSearch()
                          }
                        }}
                      />
                      <Button size="sm" onClick={handleSaveSearch}>
                        <Save className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {savedSearches.length > 0 && (
                  <>
                    {onSaveSearch && <div className="border-t pt-2" />}
                    <div className="space-y-1">
                      <div className="text-sm font-medium mb-2">Saved Searches</div>
                      {savedSearches.map((saved) => (
                        <div
                          key={saved.id}
                          className="flex items-center justify-between p-2 rounded hover:bg-muted cursor-pointer group"
                          onClick={() => handleLoadSearch(saved.query)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{saved.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{saved.query}</div>
                          </div>
                          {onDeleteSearch && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0 ml-2"
                              onClick={(e) => handleDeleteSearch(saved.id, e)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Active Filters Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {parsed.textSearch && (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-sm">
              <Search className="h-3 w-3" />
              <span>{parsed.textSearch}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={removeTextSearch}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {parsed.filters.map((filter, index) => {
            const columnLabel = getColumnLabel(filter.column)
            const operatorSymbol =
              filter.operator === '>' ? '>' :
              filter.operator === '<' ? '<' :
              filter.operator === '>=' ? '>=' :
              filter.operator === '<=' ? '<=' :
              filter.operator === '!=' ? '≠' :
              ':'

            return (
              <div
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-sm"
              >
                <span>{columnLabel}{operatorSymbol === ':' ? '=' : operatorSymbol}{filter.value}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => removeFilter(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )
          })}

          {parsed.sort && (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-sm">
              <span>
                Sort: {getColumnLabel(parsed.sort.column)} ({parsed.sort.direction === 'asc' ? '↑' : '↓'})
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={removeSort}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="h-6 text-xs"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  )
}
