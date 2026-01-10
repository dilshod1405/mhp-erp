import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import axios from "axios"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/AuthContext"
import { getRoleRedirectPath, canAccessDashboard } from "@/lib/rbac"
import { supabase } from "@/lib/supabase"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setInfo(null)

    try {
      if (isSignUp) {
        // Sign up new user
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error("Missing Supabase configuration")
        }

        // Step 1: Sign up
        try {
          await axios.post(
            `${supabaseUrl}/auth/v1/signup`,
            {
              email,
              password,
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseAnonKey,
              },
            }
          )
        } catch (error: any) {
          const errorData = error.response?.data || { message: error.message }
          const errorMsg = errorData.message || errorData.error_description || errorData.error || "Sign up failed"
          throw new Error(errorMsg)
        }

        // Step 2: Login immediately after successful signup using token endpoint
        const tokenResponse = await axios.post(
          `${supabaseUrl}/auth/v1/token?grant_type=password`,
          {
            email,
            password,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseAnonKey,
            },
          }
        )

        const tokenData = tokenResponse.data
        
        if (!tokenData.access_token || !tokenData.refresh_token) {
          throw new Error("Invalid token response")
        }
        
        // Step 3: Set the session with the access token
        const { data: { session }, error: sessionError } = await supabase.auth.setSession({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
        })

        if (sessionError) {
          throw new Error(sessionError.message || "Failed to set session")
        }

        if (!session) {
          throw new Error("Session not created")
        }

        // Step 4: Fetch account data to check role
        const { data: accountData, error: accountError } = await supabase
          .from('account')
          .select('id,user_id,email,phone,full_name,avatar,role')
          .eq('email', email)
          .single()

        // Check if user has a role and can access dashboard
        if (accountError || !accountData) {
          // No account record found
          await supabase.auth.signOut()
          setIsLoading(false)
          setError(null)
          setInfo("Sign up successful! You are not an employee. Please contact your administrator to assign a role.")
          setIsSignUp(false)
          return
        }

        if (!accountData.role) {
          // Account exists but no role assigned
          await supabase.auth.signOut()
          setIsLoading(false)
          setError(null)
          setInfo("Sign up successful! You are not an employee. Please contact your administrator to assign a role.")
          setIsSignUp(false)
          return
        }

        if (!canAccessDashboard(accountData.role)) {
          // Role exists but can't access dashboard
          await supabase.auth.signOut()
          setIsLoading(false)
          setError(null)
          setInfo("Sign up successful! You are not allowed on the dashboard. Your role does not have access.")
          setIsSignUp(false)
          return
        }

        // Step 5: User has valid role, redirect to dashboard
        setIsLoading(false)
        const redirectPath = getRoleRedirectPath()
        navigate(redirectPath, { replace: true })
      } else {
        // Login existing user
        await login(email, password)
        // Redirect to dashboard after login
        const redirectPath = getRoleRedirectPath()
        navigate(redirectPath, { replace: true })
      }
    } catch (err: any) {
      setError(err.message || (isSignUp ? "Sign up failed. Please try again." : "Login failed. Please check your credentials."))
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Master Homes Properties CRM</CardTitle>
          <CardDescription>
            {isSignUp ? "Create a new account" : "Enter your email below to login to your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {info && (
                <Field>
                  <div className="rounded-md p-3 text-sm bg-blue-500/10 text-blue-600">
                    {info}
                  </div>
                </Field>
              )}
              {error && (
                <Field>
                  <div className="rounded-md p-3 text-sm bg-destructive/10 text-destructive">
                    {error}
                  </div>
                </Field>
              )}
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@mhp.ae"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </Field>
              <Field>
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? (isSignUp ? "Signing up..." : "Logging in...") : (isSignUp ? "Sign Up" : "Login")}
                </Button>
              </Field>
              <Field>
                <div className="text-center text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp)
                      setError(null)
                      setInfo(null)
                      setEmail("")
                      setPassword("")
                    }}
                    className="text-primary hover:underline"
                    disabled={isLoading}
                  >
                    {isSignUp ? "Already have an account? Login" : "Don't have an account? Sign Up"}
                  </button>
                </div>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
