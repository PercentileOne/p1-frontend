import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import AuthVerify from './pages/AuthVerify'
import Dashboard from './pages/Dashboard'
import DemoLinkedIn from './pages/DemoLinkedIn'
import DemoLinkedInPaid from './pages/DemoLinkedInPaid'
import DemoVallum from './pages/DemoVallum'
import DemoVallumPaid from './pages/DemoVallumPaid'
import CandidatePractice from './pages/CandidatePractice'
import InterviewRoom from './pages/InterviewRoom'
import InterviewSummary from './pages/InterviewSummary'
import InterviewIntake from './pages/InterviewIntake'
import InterviewPackStart from './pages/InterviewPackStart'
import ScreenCandidates from './pages/ScreenCandidates'
import LeagueTable from './pages/LeagueTable'
import ClientPortal from './pages/client/ClientPortal'
import CandidateFeedbackPortal from './pages/candidate/CandidateFeedbackPortal'
import CandidateHome from './pages/candidate/CandidateHome'
import CandidatePrep from './pages/candidate/CandidatePrep'
import FlowViewer from './pages/FlowViewer'
import LearnHome from './pages/learn/LearnHome'
import LessonViewer from './pages/learn/LessonViewer'
import LearnBookshelf from './pages/learn/LearnBookshelf'
import CandidatePrepLanding from './pages/CandidatePrepLanding'

// Redirects unauthenticated users to /login
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={window.location.hostname === 'candidate.explain.global' ? '/candidate' : '/login'} replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/auth/verify" element={<AuthVerify />} />

      {/* Protected recruiter routes */}
      <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/demo/linkedin-job" element={<RequireAuth><DemoLinkedIn /></RequireAuth>} />
      <Route path="/demo/linkedin-job-paid" element={<RequireAuth><DemoLinkedInPaid /></RequireAuth>} />
      <Route path="/demo/vallum-job" element={<RequireAuth><DemoVallum /></RequireAuth>} />
      <Route path="/demo/vallum-job-paid" element={<RequireAuth><DemoVallumPaid /></RequireAuth>} />
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

      {/* Candidate-facing routes — no auth required */}
      <Route path="/candidate/practice/:packId" element={<CandidatePractice />} />
      <Route path="/candidate" element={<CandidateHome />} />
      <Route path="/candidate/prep" element={<CandidatePrep />} />
      <Route path="/candidate/feedback" element={<CandidateFeedbackPortal />} />
      <Route path="/client" element={<ClientPortal />} />
      <Route path="/prep/:token" element={<CandidatePrepLanding />} />

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
