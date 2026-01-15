import { useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { SearchColumn } from "@/components/shared/AdvancedSearchBar"
import type { ParsedQuery } from "@/lib/query-parser"

export interface TableFilterConfig {
  tableName: string
  columns: SearchColumn[]
  textSearchFields?: string[] // Fields to search in for text search
  defaultSort?: { column: string; direction: 'asc' | 'desc' }
  additionalFilters?: (query: any) => any // For custom filters like listing type
}

/**
 * Hook to build Supabase queries from parsed filter/search/sort data
 */
export function useTableFilters(config: TableFilterConfig) {
  const buildQuery = useCallback((parsed: ParsedQuery, page: number = 1, itemsPerPage: number = 10) => {
    const offset = (page - 1) * itemsPerPage
    
    // Start with base query
    let query = supabase
      .from(config.tableName)
      .select("*", { count: "exact" })
    
    // Apply text search - search in multiple text fields
    if (parsed.textSearch && parsed.textSearch.trim()) {
      const searchText = parsed.textSearch.trim()
      const searchPattern = `%${searchText}%`
      
      // Use provided text search fields or default to all text columns
      const searchFields = config.textSearchFields || 
        config.columns
          .filter(col => col.type === 'text')
          .map(col => col.key)
      
      if (searchFields.length > 0) {
        // Build OR query for text search
        const orConditions = searchFields
          .map(field => `${field}.ilike.${searchPattern}`)
          .join(',')
        query = query.or(orConditions)
      }
    }
    
    // Apply filters (only complete ones)
    for (const filter of parsed.filters) {
      const columnName = filter.column
      const column = config.columns.find(col => col.key === columnName)
      
      if (!column) continue
      
      // Convert value based on column type
      let filterValue: string | number = filter.value
      
      if (column.type === 'number') {
        const numValue = parseFloat(filter.value)
        if (!isNaN(numValue)) {
          filterValue = numValue
        } else {
          // Skip invalid number filters
          continue
        }
      }
      
      // Apply operator
      switch (filter.operator) {
        case '>':
          query = query.gt(columnName, filterValue)
          break
        case '>=':
          query = query.gte(columnName, filterValue)
          break
        case '<':
          query = query.lt(columnName, filterValue)
          break
        case '<=':
          query = query.lte(columnName, filterValue)
          break
        case '!=':
          query = query.neq(columnName, filterValue)
          break
        case '=':
        default:
          // Use ilike for text fields, eq for numbers/dates
          if (column.type === 'number' || column.type === 'date') {
            query = query.eq(columnName, filterValue)
          } else {
            query = query.ilike(columnName, `%${filter.value}%`)
          }
          break
      }
    }
    
    // Apply additional filters (for custom logic like listing type)
    if (config.additionalFilters) {
      query = config.additionalFilters(query)
    }
    
    // Apply sorting
    if (parsed.sort) {
      query = query.order(parsed.sort.column, { ascending: parsed.sort.direction === 'asc' })
    } else if (config.defaultSort) {
      query = query.order(config.defaultSort.column, { ascending: config.defaultSort.direction === 'asc' })
    }
    
    // Apply pagination
    query = query.range(offset, offset + itemsPerPage - 1)
    
    return query
  }, [config])
  
  return { buildQuery }
}
