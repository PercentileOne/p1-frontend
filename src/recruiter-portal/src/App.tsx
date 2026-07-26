import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
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
import LeagueTable from './pages/LeagueTable'
import ClientPortal from './pages/client/ClientPortal'
import CandidateFeedbackPortal from './pages/candidate/CandidateFeedbackPortal'
import CandidateHome from './pages/candidate/CandidateHome'
import CandidatePrep from './pages/candidate/CandidatePrep'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/demo/linkedin-job" element={<DemoLinkedIn />} />
        <Route path="/demo/linkedin-job-paid" element={<DemoLinkedInPaid />} />
        <Route path="/demo/vallum-job" element={<DemoVallum />} />
        <Route path="/demo/vallum-job-paid" element={<DemoVallumPaid />} />
        <Route path="/candidate/practice/:packId" element={<CandidatePractice />} />
        <Route path="/interview-pack/start" element={<InterviewPackStart />} />
        <Route path="/interview-intake/:packId" element={<InterviewIntake />} />
        <Route path="/interview-room/:packId" element={<InterviewRoom />} />
        <Route path="/interview-summary/:sessionId" element={<InterviewSummary />} />
        <Route path="/league" element={<LeagueTable />} />
        {/* Client Portal — hiring manager facing, token encoded in URL hash */}
        <Route path="/client" element={<ClientPortal />} />
        {/* Candidate Portal — self-serve hub, interview prep, feedback */}
        <Route path="/candidate" element={<CandidateHome />} />
        <Route path="/candidate/prep" element={<CandidatePrep />} />
        <Route path="/candidate/feedback" element={<CandidateFeedbackPortal />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
