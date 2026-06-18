import { Routes, Route, Navigate } from "react-router-dom";
import AuthLayout from "./Layouts/AuthLayout";
import RegisterForm from "./features/auth/RegisterForm";
import CareerSelectForm from "./features/auth/CareerSelectForm";
import { OnboardingPercentileStep } from "./pages/OnboardingPercentileStep";
import LifestylePage from "./pages/LifestylePage";
import ExplorerPage from "./pages/ExplorerPage";
import CockpitShell from "./pages/CockpitShell";
import LoginPage from "./pages/LoginPage";
import TodayPage from "./pages/TodayPage";
import ChatPage from "./pages/ChatPage";
import GoalsPage from "./pages/GoalsPage";
import GoalCreatePage from "./pages/GoalCreatePage";
import VisionPage from "./pages/VisionPage";
import ProofPage from "./pages/ProofPage";
import AdminPage from "./pages/AdminPage";
import CycleDashboard from "./pages/CycleDashboard";
import CycleListPage from "./pages/CycleListPage";
import WeeklyPlanningPage from "./pages/WeeklyPlanningPage";
import MidReviewPage from "./pages/MidReviewPage";
import EndReviewPage from "./pages/EndReviewPage";
import MessagesPage from "./pages/MessagesPage";
import ConversationThread from "./pages/ConversationThread";
import NewMessagePage from "./pages/NewMessagePage";
import MessagesSettings from "./pages/MessagesSettings";
import MessagesIngest from "./pages/MessagesIngest";
import FeedPage from "./pages/FeedPage";
import JobsHome from "./pages/JobsHome";
import JobDetailPage from "./pages/JobDetailPage";
import JobApplyPage from "./pages/JobApplyPage";
import RecruiterDashboard from "./pages/RecruiterDashboard";
import RecruiterPostPage from "./pages/RecruiterPostPage";
import RecruiterJobPage from "./pages/RecruiterJobPage";
import RecruiterApplicantPage from "./pages/RecruiterApplicantPage";
import PlanningHome from "./pages/PlanningHome";
import DailyPlanPage from "./pages/DailyPlanPage";
import WeeklyPlanPage from "./pages/WeeklyPlanPage";
import MonthlyPlanPage from "./pages/MonthlyPlanPage";
import EventsDashboard from "./pages/EventsDashboard";
import EventWorkspacePage from "./pages/EventWorkspacePage";
import TimeBlockingEngine from "./pages/TimeBlockingEngine";
import ContactsHome from "./pages/ContactsHome";
import ContactProfilePage from "./pages/ContactProfilePage";
import ContactsFindPage from "./pages/ContactsFindPage";
import DiscoverHome from "./pages/DiscoverHome";
import DomainDiscoveryPage from "./pages/DomainDiscoveryPage";
import SubdomainDiscoveryPage from "./pages/SubdomainDiscoveryPage";
import LocalDiscoveryPage from "./pages/LocalDiscoveryPage";
import FocusLauncher from "./pages/FocusLauncher";
import FocusSession from "./pages/FocusSession";
import FocusComplete from "./pages/FocusComplete";
import FocusHistory from "./pages/FocusHistory";
import FocusStats from "./pages/FocusStats";
import ShopPage from "./pages/ShopPage";
import WallsPage from "./pages/WallsPage";
import StoriesPage from "./pages/StoriesPage";
import AwardsPage from "./pages/AwardsPage";
import ProfilePage from "./pages/ProfilePage";
import InterestsPage from "./pages/InterestsPage";
import StoryDetailPage from "./pages/StoryDetailPage";
import StoryCreatePage from "./pages/StoryCreatePage";
import PersonalisedHomePage from "./pages/PersonalisedHomePage";
import SettingsPage from "./pages/SettingsPage";
import CognitivePage from "./pages/CognitivePage";
import LearningShell from "./pages/LearningShell";
import LearningCards from "./pages/LearningCards";
import LearningNotes from "./pages/LearningNotes";
import LearningQueue from "./pages/LearningQueue";
import LearningMultiplayer from "./pages/LearningMultiplayer";
import LearningGroups from "./pages/LearningGroups";
import LearningCertifications from "./pages/LearningCertifications";
import LearningEmployer from "./pages/LearningEmployer";
import LearningBooks from "./pages/LearningBooks";
import StudentShell  from "./pages/StudentShell";
import ParentShell   from "./pages/ParentShell";
import TeacherShell     from "./pages/TeacherShell";
import UniversityShell  from "./pages/UniversityShell";

export default function App() {
  return (
    <Routes>
      {/* Default → Login */}
      <Route path="/"        element={<Navigate to="/login" replace />} />
      <Route path="/login"   element={<LoginPage />} />

      {/* Core app */}
      <Route path="/cockpit"  element={<CockpitShell />} />
      <Route path="/today"    element={<TodayPage />} />
      <Route path="/chat"     element={<ChatPage />} />
      <Route path="/goals"    element={<GoalsPage />} />
      <Route path="/goals/create" element={<GoalCreatePage />} />
      <Route path="/vision"   element={<VisionPage />} />
      <Route path="/proof"    element={<ProofPage />} />
      <Route path="/admin"    element={<AdminPage />} />
      <Route path="/cycle"    element={<CycleDashboard />} />
      <Route path="/cycles"   element={<CycleListPage />} />
      <Route path="/cycle/weekly-planning" element={<WeeklyPlanningPage />} />
      <Route path="/cycle/mid-review"      element={<MidReviewPage />} />
      <Route path="/cycle/end-review"      element={<EndReviewPage />} />
      <Route path="/messages"          element={<MessagesPage />} />
      <Route path="/messages/new"      element={<NewMessagePage />} />
      <Route path="/messages/settings" element={<MessagesSettings />} />
      <Route path="/messages/ingest"   element={<MessagesIngest />} />
      <Route path="/messages/:id"      element={<ConversationThread />} />
      <Route path="/feed"     element={<FeedPage />} />
      <Route path="/explorer" element={<ExplorerPage />} />
      <Route path="/walls"    element={<WallsPage />} />
      <Route path="/stories"         element={<StoriesPage />} />
      <Route path="/awards"          element={<AwardsPage />} />
      <Route path="/profile"         element={<ProfilePage />} />
      <Route path="/interests"       element={<InterestsPage />} />
      <Route path="/home"            element={<PersonalisedHomePage />} />
      <Route path="/settings"        element={<SettingsPage />} />
      <Route path="/cards"           element={<CognitivePage />} />
      <Route path="/learning" element={<LearningShell />}>
        <Route index element={<Navigate to="/learning/cards" replace />} />
        <Route path="cards"          element={<LearningCards />} />
        <Route path="notes"          element={<LearningNotes />} />
        <Route path="queue"          element={<LearningQueue />} />
        <Route path="groups"         element={<LearningGroups />} />
        <Route path="multiplayer"    element={<LearningMultiplayer />} />
        <Route path="certifications" element={<LearningCertifications />} />
        <Route path="books"          element={<LearningBooks />} />
        <Route path="employer"       element={<LearningEmployer />} />
      </Route>
      <Route path="/student" element={<StudentShell />} />
      <Route path="/parent"   element={<ParentShell />} />
      <Route path="/teacher"    element={<TeacherShell />} />
      <Route path="/university" element={<UniversityShell />} />
      <Route path="/stories/create"  element={<StoryCreatePage />} />
      <Route path="/stories/:id"     element={<StoryDetailPage />} />
      <Route path="/jobs"                        element={<JobsHome />} />
      <Route path="/jobs/:id"                    element={<JobDetailPage />} />
      <Route path="/jobs/:id/apply"              element={<JobApplyPage />} />
      <Route path="/recruiter"                   element={<RecruiterDashboard />} />
      <Route path="/recruiter/post"              element={<RecruiterPostPage />} />
      <Route path="/recruiter/jobs/:id"          element={<RecruiterJobPage />} />
      <Route path="/recruiter/applicants/:id"    element={<RecruiterApplicantPage />} />
      <Route path="/contacts"                   element={<ContactsHome />} />
      <Route path="/contacts/find"              element={<ContactsFindPage />} />
      <Route path="/contacts/:id"               element={<ContactProfilePage />} />
      <Route path="/discover"                   element={<DiscoverHome />} />
      <Route path="/discover/:domain"           element={<DomainDiscoveryPage />} />
      <Route path="/discover/:domain/:subdomain"           element={<SubdomainDiscoveryPage />} />
      <Route path="/discover/:domain/:subdomain/:location" element={<LocalDiscoveryPage />} />
      <Route path="/planning"                   element={<PlanningHome />} />
      <Route path="/planning/daily"             element={<DailyPlanPage />} />
      <Route path="/planning/weekly"            element={<WeeklyPlanPage />} />
      <Route path="/planning/monthly"           element={<MonthlyPlanPage />} />
      <Route path="/planning/events"            element={<EventsDashboard />} />
      <Route path="/planning/events/:id"        element={<EventWorkspacePage />} />
      <Route path="/planning/timeblocks"        element={<TimeBlockingEngine />} />
      <Route path="/shop"             element={<ShopPage />} />
      <Route path="/focus"           element={<FocusLauncher />} />
      <Route path="/focus/session"   element={<FocusSession />} />
      <Route path="/focus/complete"  element={<FocusComplete />} />
      <Route path="/focus/history"   element={<FocusHistory />} />
      <Route path="/focus/stats"     element={<FocusStats />} />

      {/* Legacy onboarding routes */}
      <Route path="/register"  element={<AuthLayout><RegisterForm /></AuthLayout>} />
      <Route path="/career"    element={<AuthLayout><CareerSelectForm /></AuthLayout>} />
      <Route path="/percentile" element={<AuthLayout><OnboardingPercentileStep /></AuthLayout>} />
      <Route path="/lifestyle" element={<AuthLayout><LifestylePage /></AuthLayout>} />
    </Routes>
  );
}
