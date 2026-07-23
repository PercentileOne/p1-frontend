import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DemoLinkedIn from './pages/DemoLinkedIn'
import DemoVallum from './pages/DemoVallum'
import CandidatePractice from './pages/CandidatePractice'
import InterviewRoom from './pages/InterviewRoom'
import InterviewSummary from './pages/InterviewSummary'
import InterviewIntake from './pages/InterviewIntake'
import LeagueTable from './pages/LeagueTable'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/demo/linkedin-job" element={<DemoLinkedIn />} />
        <Route path="/demo/vallum-job" element={<DemoVallum />} />
        <Route path="/candidate/practice/:packId" element={<CandidatePractice />} />
        <Route path="/interview-intake/:packId" element={<InterviewIntake />} />
        <Route path="/interview-room/:packId" element={<InterviewRoom />} />
        <Route path="/interview-summary/:sessionId" element={<InterviewSummary />} />
        <Route path="/league" element={<LeagueTable />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
