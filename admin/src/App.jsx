import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import Login from './pages/Login'
import Games from './pages/Games'
import Categories from './pages/Categories'
import Settings from './pages/Settings'
import Characters from './pages/Characters'
import Actions from './pages/Actions'
import VipPlans from './pages/VipPlans'
import AvatarReview from './pages/AvatarReview'
import Database from './pages/Database'
import Carousels from './pages/Carousels'
import UserLibrary from './pages/UserLibrary'
import Users from './pages/Users'

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
            <Games />
          </ProtectedRoute>
        }
      />
      <Route
        path="/categories"
        element={
          <ProtectedRoute>
            <Categories />
          </ProtectedRoute>
        }
      />
      <Route
        path="/characters"
        element={
          <ProtectedRoute>
            <Characters />
          </ProtectedRoute>
        }
      />
      <Route
        path="/actions"
        element={
          <ProtectedRoute>
            <Actions />
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
        path="/vip-plans"
        element={
          <ProtectedRoute>
            <VipPlans />
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
        path="/user-library"
        element={
          <ProtectedRoute>
            <UserLibrary />
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
