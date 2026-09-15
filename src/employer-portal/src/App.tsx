import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { logEvent } from './api/flowLogger'
import Login from './pages/Login'
import AuthCallback from './pages/AuthCallback'
import Dashboard from './pages/Dashboard'
import Watch from './pages/Watch'

// Redirects unauthenticated users to /login. Waits for the async session
// re-validation (AuthProvider's isLoading) before deciding, so a page refresh
// with a still-valid token doesn't flash-redirect to /login first.
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth()
  if (isLoading) return null
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

// One page-view event per route change — see api/flowLogger.ts's own top comment.
function usePageViewLogging() {
  const location = useLocation()
  useEffect(() => {
    logEvent('page_view', { page: location.pathname })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])
}

function AppRoutes() {
  usePageViewLogging()
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/watch/:id" element={<Watch />} />

      <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
