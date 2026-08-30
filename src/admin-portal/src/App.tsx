import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Layout } from './components/Layout'
import Login from './pages/Login'
import Organisations from './pages/Organisations'
import OrganisationDetail from './pages/OrganisationDetail'
import Recruiters from './pages/Recruiters'
import Candidates from './pages/Candidates'
import Employers from './pages/Employers'
import Interviews from './pages/Interviews'
import Careers from './pages/Careers'
import Moderation from './pages/Moderation'
import NameBank from './pages/NameBank'

// Redirects unauthenticated users to /login. Waits for the async session
// re-validation (AuthProvider's isLoading) before deciding, so a page refresh
// with a still-valid token doesn't flash-redirect to /login first.
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth()
  if (isLoading) return null
  if (!token) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/organisations" replace />} />
      <Route path="/login" element={<Login />} />

      <Route path="/organisations" element={<RequireAuth><Organisations /></RequireAuth>} />
      <Route path="/organisations/:id" element={<RequireAuth><OrganisationDetail /></RequireAuth>} />
      <Route path="/recruiters" element={<RequireAuth><Recruiters /></RequireAuth>} />
      <Route path="/candidates" element={<RequireAuth><Candidates /></RequireAuth>} />
      <Route path="/employers" element={<RequireAuth><Employers /></RequireAuth>} />
      <Route path="/interviews" element={<RequireAuth><Interviews /></RequireAuth>} />
      <Route path="/careers" element={<RequireAuth><Careers /></RequireAuth>} />
      <Route path="/moderation" element={<RequireAuth><Moderation /></RequireAuth>} />
      <Route path="/name-bank" element={<RequireAuth><NameBank /></RequireAuth>} />

      <Route path="*" element={<Navigate to="/organisations" replace />} />
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
