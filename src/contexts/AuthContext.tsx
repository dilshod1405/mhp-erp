import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { AuthUser, Employee, AuthState } from '@/types/auth'
import { getRoleRedirectPath, canAccessDashboard } from '@/lib/rbac'

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<Employee | null>
  logout: () => Promise<void>
  fetchEmployeeData: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEmployeeData = async () => {
    if (!user?.email) return

    try {
      const { data, error: fetchError } = await supabase
        .from('account')
        .select('id,user_id,email,phone,full_name,avatar,role')
        .eq('email', user.email)
        .single()

      if (fetchError) throw fetchError

      if (data) {
        setEmployee(data as Employee)
        setUser(prev => prev ? { ...prev, employee: data as Employee } : null)
      }
    } catch (err) {
      console.error('Error fetching employee data:', err)
      setError('Failed to fetch employee data')
    }
  }

  const login = async (email: string, password: string): Promise<Employee | null> => {
    try {
      setLoading(true)
      setError(null)

      // Login with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      let employeeData: Employee | null = null

      if (authData.user) {
        const authUser: AuthUser = {
          id: authData.user.id,
          email: authData.user.email || email,
        }
        setUser(authUser)

        // Fetch employee data
        const { data: empData, error: employeeError } = await supabase
          .from('account')
          .select('id,user_id,email,phone,full_name,avatar,role')
          .eq('email', email)
          .single()

        if (!employeeError && empData) {
          employeeData = empData as Employee
          
          // Check if user's role can access dashboard
          if (!canAccessDashboard(employeeData.role)) {
            await supabase.auth.signOut()
            throw new Error('Your role does not have access to the dashboard')
          }
          
          setEmployee(employeeData)
          setUser({ ...authUser, employee: employeeData })
        } else if (!employeeError && !empData) {
          // Employee not found in employee table
          await supabase.auth.signOut()
          throw new Error('Employee record not found')
        }
      }

      return employeeData
    } catch (err: any) {
      setError(err.message || 'Login failed')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      setLoading(true)
      await supabase.auth.signOut()
      setUser(null)
      setEmployee(null)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Logout failed')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Check for existing session on mount
  useEffect(() => {
    let isMounted = true

    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (!isMounted) return

        if (sessionError) {
          console.error('Session error:', sessionError)
          setLoading(false)
          return
        }

        if (!session?.user) {
          setLoading(false)
          return
        }

        const authUser: AuthUser = {
          id: session.user.id,
          email: session.user.email || '',
        }
        setUser(authUser)

        // Fetch employee data in parallel if email exists
        if (session.user.email) {
          try {
            const { data: employeeData, error: employeeError } = await supabase
              .from('account')
              .select('id,user_id,email,phone,full_name,avatar,role')
              .eq('email', session.user.email)
              .single()

            if (!isMounted) return

            if (!employeeError && employeeData) {
              const emp = employeeData as Employee
              
              // Check if user's role can access dashboard
              if (!canAccessDashboard(emp.role)) {
                await supabase.auth.signOut()
                setUser(null)
                setEmployee(null)
                setLoading(false)
                return
              }
              
              setEmployee(emp)
              setUser({ ...authUser, employee: emp })
            }
          } catch (employeeErr) {
            console.error('Error fetching employee data:', employeeErr)
          }
        }
      } catch (err) {
        console.error('Error checking session:', err)
        if (isMounted) {
          setLoading(false)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    checkSession()

    return () => {
      isMounted = false
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const authUser: AuthUser = {
          id: session.user.id,
          email: session.user.email || '',
        }
        setUser(authUser)

        if (session.user.email) {
          const { data: employeeData } = await supabase
            .from('account')
            .select('id,user_id,email,phone,full_name,avatar,role')
            .eq('email', session.user.email)
            .single()

          if (employeeData) {
            const emp = employeeData as Employee
            
            // Check if user's role can access dashboard
            if (!canAccessDashboard(emp.role)) {
              await supabase.auth.signOut()
              setUser(null)
              setEmployee(null)
              return
            }
            
            setEmployee(emp)
            setUser({ ...authUser, employee: emp })
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setEmployee(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        employee,
        loading,
        error,
        login,
        logout,
        fetchEmployeeData,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Export helper for getting redirect path
export { getRoleRedirectPath }

