import { AxiosError } from 'axios'

/**
 * Formats Supabase/PostgreSQL errors into user-friendly messages
 */
export function formatError(error: unknown): string {
  // Handle Axios errors
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError
    const errorData = axiosError.response?.data

    if (errorData && typeof errorData === 'object') {
      // Handle PostgreSQL/Supabase error format
      if ('code' in errorData && 'message' in errorData) {
        const pgError = errorData as {
          code?: string
          message?: string
          details?: string
          hint?: string
        }

        // Handle specific error codes
        switch (pgError.code) {
          case '23514': // Check constraint violation
            return formatCheckConstraintError(pgError.message || '', pgError.details || '')
          
          case '23503': // Foreign key constraint violation
            return formatForeignKeyError(pgError.message || '', pgError.details || '')
          
          case '23505': // Unique constraint violation
            return formatUniqueConstraintError(pgError.message || '', pgError.details || '')
          
          case '23502': // Not null constraint violation
            return formatNotNullError(pgError.message || '', pgError.details || '')
          
          case '42501': // Row-level security policy violation
            return 'You do not have permission to perform this operation.'
          
          case '42P01': // Undefined table
            return 'The requested resource does not exist.'
          
          case '42703': // Undefined column
            return formatUndefinedColumnError(pgError.message || '')
          
          default:
            // Try to format the message to be more user-friendly
            return formatGenericPostgresError(pgError.message || 'Unknown error occurred')
        }
      }

      // Handle other error formats (e.g., { error: "...", message: "..." })
      if ('error' in errorData && typeof errorData.error === 'string') {
        return errorData.error
      }
      if ('message' in errorData && typeof errorData.message === 'string') {
        return errorData.message
      }
    }

    // Handle HTTP status errors
    if (axiosError.response) {
      const status = axiosError.response.status
      switch (status) {
        case 400:
          return 'Invalid request. Please check your input and try again.'
        case 401:
          return 'You are not authorized to perform this operation. Please log in again.'
        case 403:
          return 'You do not have permission to perform this operation.'
        case 404:
          return 'The requested resource was not found.'
        case 409:
          return 'A conflict occurred. This record may already exist or have dependencies.'
        case 500:
          return 'A server error occurred. Please try again later.'
        default:
          return `Request failed with status ${status}. Please try again.`
      }
    }

    return axiosError.message || 'An error occurred while processing your request.'
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return error.message
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error
  }

  // Fallback
  return 'An unexpected error occurred. Please try again.'
}

/**
 * Formats check constraint errors (code 23514)
 */
function formatCheckConstraintError(message: string, details: string): string {
  // Extract constraint name and field from the error message
  const constraintMatch = message.match(/check constraint "([^"]+)"/i)
  const constraintName = constraintMatch ? constraintMatch[1] : ''

  // Common constraint names and their user-friendly messages
  const constraintMessages: Record<string, string> = {
    'account_phone_digits_only': 'Phone number must contain only digits (0-9).',
    'phone_digits_only': 'Phone number must contain only digits (0-9).',
    'email_format': 'Please enter a valid email address.',
    'positive_price': 'Price must be a positive number.',
    'non_negative': 'This value cannot be negative.',
  }

  // Check if we have a specific message for this constraint
  if (constraintName && constraintMessages[constraintName]) {
    return constraintMessages[constraintName]
  }

  // Try to extract field name from constraint name
  const fieldMatch = constraintName.match(/(\w+)_\w+/)
  const fieldName = fieldMatch ? fieldMatch[1] : 'field'

  // Format generic check constraint error
  return `Invalid value for ${fieldName}. Please check your input and try again.`
}

/**
 * Formats foreign key constraint errors (code 23503)
 */
function formatForeignKeyError(message: string, details: string): string {
  // Try to extract referenced table from details or message
  const tableMatch = details?.match(/Key \(.*\)=\(.*\) is not present in table "([^"]+)"/i) ||
                     message.match(/violates foreign key constraint.*table "([^"]+)"/i) ||
                     details?.match(/table "([^"]+)"/i)
  
  const tableName = tableMatch ? tableMatch[1] : ''

  // Special handling for common tables
  const tableMessages: Record<string, string> = {
    'project': 'Cannot delete this record because it is currently being used by one or more projects. Please remove all project references first.',
    'property': 'Cannot delete this record because it is currently being used by one or more properties. Please remove all property references first.',
    'contact': 'Cannot delete this record because it is currently being used by one or more contacts. Please remove all contact references first.',
    'area': 'Cannot delete this record because it is currently being used by one or more areas. Please remove all area references first.',
  }

  if (tableName && tableMessages[tableName]) {
    return tableMessages[tableName]
  }

  if (tableName) {
    return `This operation cannot be completed because it references a ${tableName} that does not exist or is being used by other records.`
  }

  return 'This operation cannot be completed because this record is being used by other records. Please remove all references first.'
}

/**
 * Formats unique constraint errors (code 23505)
 */
function formatUniqueConstraintError(message: string, details: string): string {
  // Try to extract field name from message
  const fieldMatch = message.match(/Key \(([^)]+)\)/i) || 
                     message.match(/duplicate key value.*\(([^)]+)\)/i)
  
  const fieldName = fieldMatch ? fieldMatch[1] : 'field'
  
  // Make field name more user-friendly
  const friendlyFieldName = fieldName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())

  return `${friendlyFieldName} already exists. Please choose a different value.`
}

/**
 * Formats not null constraint errors (code 23502)
 */
function formatNotNullError(message: string, details: string): string {
  // Try to extract column name
  const columnMatch = message.match(/null value in column "([^"]+)"|column "([^"]+)" of relation/i)
  const columnName = columnMatch ? (columnMatch[1] || columnMatch[2]) : 'field'

  // Make column name more user-friendly
  const friendlyColumnName = columnName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())

  return `${friendlyColumnName} is required and cannot be empty.`
}

/**
 * Formats undefined column errors (code 42703)
 */
function formatUndefinedColumnError(message: string): string {
  const columnMatch = message.match(/column "([^"]+)"/i)
  const columnName = columnMatch ? columnMatch[1] : 'column'

  return `Invalid field: ${columnName}. Please check your input.`
}

/**
 * Formats generic PostgreSQL errors
 */
function formatGenericPostgresError(message: string): string {
  // Remove technical details and make more user-friendly
  let formatted = message
    .replace(/violates \w+ constraint "[^"]+"/gi, 'has an invalid value')
    .replace(/relation "[^"]+"/gi, 'table')
    .replace(/column "[^"]+"/gi, 'field')
    .replace(/Key \(.*?\)/gi, 'value')

  // Capitalize first letter
  if (formatted.length > 0) {
    formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1)
  }

  return formatted || 'An error occurred. Please try again.'
}
