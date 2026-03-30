import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import Login from './pages/Login'
import DatabaseManagement from './pages/DatabaseManagement'
import Settings from './pages/Settings'
import VipPlans from './pages/VipPlans'
import UserLibraryLevels from './pages/UserLibraryLevels'
import VipManagement from './pages/VipManagement'
import AvatarReview from './pages/AvatarReview'
import Database from './pages/Database'
import Carousels from './pages/Carousels'
import Users from './pages/Users'
import PageMargins from './pages/PageMargins'
import ActivityManagement from './pages/ActivityManagement'

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DatabaseManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/database-management"
        element={
          <ProtectedRoute>
            <DatabaseManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vip-management"
        element={
          <ProtectedRoute>
            <VipManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/page-margins"
        element={
          <ProtectedRoute>
            <PageMargins />
          </ProtectedRoute>
        }
      />
      <Route
        path="/avatar-review"
        element={
          <ProtectedRoute>
            <AvatarReview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/database"
        element={
          <ProtectedRoute>
            <Database />
          </ProtectedRoute>
        }
      />
      <Route
        path="/carousels"
        element={
          <ProtectedRoute>
            <Carousels />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <Users />
          </ProtectedRoute>
        }
      />
      <Route
        path="/activity-management"
        element={
          <ProtectedRoute>
            <ActivityManagement />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
