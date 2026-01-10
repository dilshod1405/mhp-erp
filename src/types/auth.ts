import type { UserRole } from '@/config/roles'

export type { UserRole }

export interface Employee {
  id: number
  user_id: string
  email: string
  phone: string
  full_name: string
  avatar: string | null
  role: UserRole | null
}

export interface AuthUser {
  id: string
  email: string
  employee?: Employee
}

export interface AuthState {
  user: AuthUser | null
  employee: Employee | null
  loading: boolean
  error: string | null
}

