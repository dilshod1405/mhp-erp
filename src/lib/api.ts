import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create axios instance for Supabase REST API
export const supabaseApi: AxiosInstance = axios.create({
  baseURL: `${supabaseUrl}/rest/v1`,
  headers: {
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json',
  },
})

// Create axios instance for Supabase Storage API
export const supabaseStorageApi: AxiosInstance = axios.create({
  baseURL: `${supabaseUrl}/storage/v1`,
  headers: {
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${supabaseAnonKey}`,
  },
})

// Helper function to get headers with optional access token
export const getAuthHeaders = (accessToken?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
  }
  return headers
}

// Helper for REST API calls with optional token
export const apiRequest = async <T = any>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT',
  url: string,
  data?: any,
  config?: AxiosRequestConfig & { accessToken?: string }
): Promise<T> => {
  const headers = getAuthHeaders(config?.accessToken)
  
  if (config?.accessToken) {
    headers['Authorization'] = `Bearer ${config.accessToken}`
  }

  const response = await axios({
    method,
    url: `${supabaseUrl}${url.startsWith('/') ? url : '/' + url}`,
    data,
    headers: {
      ...headers,
      ...config?.headers,
    },
    ...config,
  })

  return response.data
}

// Helper for Storage API calls with optional token
export const storageRequest = async (
  method: 'POST' | 'PUT' | 'DELETE',
  url: string,
  data?: any,
  contentType?: string,
  accessToken?: string
): Promise<any> => {
  const headers = getAuthHeaders(accessToken)
  
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  if (contentType) {
    headers['Content-Type'] = contentType
  }

  const response = await axios({
    method,
    url: `${supabaseUrl}${url.startsWith('/') ? url : '/' + url}`,
    data,
    headers,
  })

  return response.data
}
