import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { logEvent } from './api/flowLogger'
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
import LiveAvatar from './pages/LiveAvatar'
import QuestionPackCaps from './pages/QuestionPackCaps'
import ActivityLog from './pages/ActivityLog'
import Access from './pages/Access'
import LocationCheck from './pages/LocationCheck'
import AccessRequests from './pages/AccessRequests'
import Billing from './pages/Billing'

// Redirects unauthenticated users to /login. Waits for the async session
// re-validation (AuthProvider's isLoading) before deciding, so a page refresh
// with a still-valid token doesn't flash-redirect to /login first.
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth()
  if (isLoading) return null
  if (!token) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
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
      <Route path="/live-avatar" element={<RequireAuth><LiveAvatar /></RequireAuth>} />
      <Route path="/question-packs" element={<RequireAuth><QuestionPackCaps /></RequireAuth>} />
      <Route path="/activity-log" element={<RequireAuth><ActivityLog /></RequireAuth>} />
      <Route path="/access" element={<RequireAuth><Access /></RequireAuth>} />
      <Route path="/location-check" element={<RequireAuth><LocationCheck /></RequireAuth>} />
      <Route path="/access-requests" element={<RequireAuth><AccessRequests /></RequireAuth>} />
      <Route path="/billing" element={<RequireAuth><Billing /></RequireAuth>} />

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
