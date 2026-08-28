import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import AuthCallback from './pages/AuthCallback'
import Dashboard from './pages/Dashboard'
import InterviewRoom from './pages/InterviewRoom'
import InterviewSummary from './pages/InterviewSummary'
import InterviewIntake from './pages/InterviewIntake'
import InterviewPackStart from './pages/InterviewPackStart'
import ScreenCandidates from './pages/ScreenCandidates'
import LeagueTable from './pages/LeagueTable'
import FlowViewer from './pages/FlowViewer'
import LearnHome from './pages/learn/LearnHome'
import LessonViewer from './pages/learn/LessonViewer'
import LearnBookshelf from './pages/learn/LearnBookshelf'
import CandidateHome from './pages/candidate/CandidateHome'

// Redirects unauthenticated users to /login. Waits for the async session
// re-validation (AuthProvider's isLoading) before deciding, so a page refresh
// with a still-valid token doesn't flash-redirect to /login first.
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth()
  if (isLoading) return null
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Protected recruiter routes */}
      <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/interview-pack/start" element={<RequireAuth><InterviewPackStart /></RequireAuth>} />
      <Route path="/screen-candidates" element={<RequireAuth><ScreenCandidates /></RequireAuth>} />
      <Route path="/interview-intake/:packId" element={<RequireAuth><InterviewIntake /></RequireAuth>} />
      <Route path="/interview-room/:packId" element={<RequireAuth><InterviewRoom /></RequireAuth>} />
      <Route path="/interview-summary/:sessionId" element={<RequireAuth><InterviewSummary /></RequireAuth>} />
      <Route path="/league" element={<RequireAuth><LeagueTable /></RequireAuth>} />
      <Route path="/flow-viewer" element={<RequireAuth><FlowViewer /></RequireAuth>} />
      <Route path="/learn" element={<RequireAuth><LearnHome /></RequireAuth>} />
      <Route path="/learn/lesson/:lessonId" element={<RequireAuth><LessonViewer /></RequireAuth>} />
      <Route path="/learn/bookshelf" element={<RequireAuth><LearnBookshelf /></RequireAuth>} />

      {/* Candidate portal */}
      <Route path="/candidate/home" element={<CandidateHome />} />

      <Route path="*" element={<Navigate to="/login" replace />} />
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
