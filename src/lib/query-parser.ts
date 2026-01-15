import type { SearchColumn } from "@/components/shared/AdvancedSearchBar"

export interface ParsedQuery {
  textSearch: string
  filters: Array<{ column: string; operator: string; value: string }>
  sort?: { column: string; direction: 'asc' | 'desc' }
}

/**
 * Parse query string to extract filters, search text, and sort
 */
export function parseQuery(query: string, columns: SearchColumn[]): ParsedQuery {
  const result: ParsedQuery = {
    textSearch: '',
    filters: [],
    sort: undefined,
  }

  if (!query.trim()) return result

  // Split query by spaces, but preserve quoted strings
  const parts: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < query.length; i++) {
    const char = query[i]
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes
      current += char
    } else if (char === ' ' && !inQuotes) {
      if (current.trim()) {
        parts.push(current.trim())
        current = ''
      }
    } else {
      current += char
    }
  }
  if (current.trim()) {
    parts.push(current.trim())
  }

  const textParts: string[] = []

  for (const part of parts) {
    // Check for sort: column:direction or sort:column
    if (part.toLowerCase().startsWith('sort:')) {
      const sortPart = part.substring(5).trim()
      const [column, direction] = sortPart.split(':')
      if (column) {
        result.sort = {
          column: column.trim(),
          direction: direction?.toLowerCase() === 'asc' ? 'asc' : 'desc',
        }
      }
      continue
    }

    // Check for filters: column:value, column=value, column:>value, etc.
    // Support both ':' and '=' separators
    const colonIndex = part.indexOf(':')
    const equalIndex = part.indexOf('=')
    let separatorIndex = -1
    
    if (colonIndex > 0 && (equalIndex === -1 || colonIndex < equalIndex)) {
      separatorIndex = colonIndex
    } else if (equalIndex > 0) {
      separatorIndex = equalIndex
    }
    
    if (separatorIndex > 0) {
      const keyPart = part.substring(0, separatorIndex).toLowerCase()
      const valuePart = part.substring(separatorIndex + 1).trim()

      // Check for operator
      let operator = '='
      let actualValue = valuePart

      if (valuePart.startsWith('>=')) {
        operator = '>='
        actualValue = valuePart.substring(2).trim()
      } else if (valuePart.startsWith('<=')) {
        operator = '<='
        actualValue = valuePart.substring(2).trim()
      } else if (valuePart.startsWith('>')) {
        operator = '>'
        actualValue = valuePart.substring(1).trim()
      } else if (valuePart.startsWith('<')) {
        operator = '<'
        actualValue = valuePart.substring(1).trim()
      } else if (valuePart.startsWith('!=')) {
        operator = '!='
        actualValue = valuePart.substring(2).trim()
      }

      // Remove quotes
      actualValue = actualValue.replace(/^["']|["']$/g, '')

      // Find matching column
      const column = columns.find(
        col => col.key.toLowerCase() === keyPart ||
        col.label.toLowerCase().replace(/\s+/g, '_') === keyPart ||
        col.key.toLowerCase().replace(/_/g, '') === keyPart.replace(/_/g, '')
      )

      if (column && actualValue) {
        // Validate date format if it's a date column
        if (column.type === 'date') {
          // Check if it's a valid date format (yyyy-MM-dd)
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/
          if (!dateRegex.test(actualValue)) {
            // Invalid date format, skip this filter
            continue
          }
          // Additional validation: check if it's a valid date
          const date = new Date(actualValue)
          if (isNaN(date.getTime())) {
            // Invalid date, skip this filter
            continue
          }
          // Check if the date string matches the parsed date (prevents dates like "2025-0" or "2025-13-32")
          const [year, month, day] = actualValue.split('-').map(Number)
          if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
            // Date doesn't match (e.g., "2025-0" becomes "2024-12-31")
            continue
          }
        }
        
        result.filters.push({
          column: column.key,
          operator,
          value: actualValue,
        })
        continue
      }
    }

    // Otherwise it's text search
    textParts.push(part.replace(/^["']|["']$/g, ''))
  }

  result.textSearch = textParts.join(' ')
  return result
}
