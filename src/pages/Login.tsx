import { Navigate } from "react-router-dom"
import { LoginForm } from "@/components/login-form"
import { useAuth } from "@/contexts/AuthContext"
import { getRoleRedirectPath } from "@/lib/rbac"

export default function LoginPage() {
  const { user, loading } = useAuth()

  // Show loading state
  if (loading) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect if already logged in
  if (user) {
    const redirectPath = getRoleRedirectPath()
    return <Navigate to={redirectPath} replace />
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  )
}
