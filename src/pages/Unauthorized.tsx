import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAuth } from "@/contexts/AuthContext"

export default function UnauthorizedPage() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleBackToLogin = async () => {
    try {
      await logout()
    } catch (error) {
      console.error("Error during logout:", error)
    }
    navigate("/login", { replace: true })
  }

  const handleGoToDashboard = () => {
    navigate("/dashboard", { replace: true })
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to access this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            If you believe this is an error, please contact your administrator.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleGoToDashboard}>
              Go to Dashboard
            </Button>
            <Button onClick={handleBackToLogin}>
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

