import { Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "./contexts/AuthContext"
import { ProtectedRoute } from "./components/ProtectedRoute"
import LoginPage from "./pages/Login"
import DashboardPage from "./pages/Dashboard"
import EmployeesPage from "./pages/Employees"
import UsersPage from "./pages/Users"
import AreasPage from "./pages/Areas"
import DevelopersPage from "./pages/Developers"
import ContactsPage from "./pages/Contacts"
import ProjectsPage from "./pages/Projects"
import PropertiesPage from "./pages/Properties"
import DatabasePage from "./pages/Database"
import UnauthorizedPage from "./pages/Unauthorized"

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Protected routes - accessible to all authenticated users */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Employees page - role-based access */}
        <Route
          path="/employees"
          element={
            <ProtectedRoute>
              <EmployeesPage />
            </ProtectedRoute>
          }
        />

        {/* Users page - role-based access */}
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <UsersPage />
            </ProtectedRoute>
          }
        />

        {/* Contacts page - all authenticated roles can access */}
        <Route
          path="/contacts"
          element={
            <ProtectedRoute>
              <ContactsPage />
            </ProtectedRoute>
          }
        />

        {/* Areas page - role-based access */}
        <Route
          path="/areas"
          element={
            <ProtectedRoute>
              <AreasPage />
            </ProtectedRoute>
          }
        />

        {/* Developers page - role-based access */}
        <Route
          path="/developers"
          element={
            <ProtectedRoute>
              <DevelopersPage />
            </ProtectedRoute>
          }
        />

        {/* Projects pages - by type */}
        <Route
          path="/projects/:type"
          element={
            <ProtectedRoute>
              <ProjectsPage />
            </ProtectedRoute>
          }
        />

        {/* Properties pages - by listing type */}
        <Route
          path="/properties/:type"
          element={
            <ProtectedRoute>
              <PropertiesPage />
            </ProtectedRoute>
          }
        />

        {/* Database page */}
        <Route
          path="/database"
          element={
            <ProtectedRoute>
              <DatabasePage />
            </ProtectedRoute>
          }
        />

        {/* Role-based routes - can be customized as needed */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute requiredRole="Admin">
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales-manager/dashboard"
          element={
            <ProtectedRoute requiredRole="Sales Manager">
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Default redirect - redirect to login if not authenticated, otherwise dashboard */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
