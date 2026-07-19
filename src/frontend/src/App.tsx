import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import CockpitShell from "./pages/CockpitShell";
import LearningShell from "./pages/LearningShell";
import LearningCards from "./pages/LearningCards";
import LearningNotes from "./pages/LearningNotes";
import LearningBooks from "./pages/LearningBooks";
import LearningCertifications from "./pages/LearningCertifications";
import LearningGroups from "./pages/LearningGroups";
import LearningMultiplayer from "./pages/LearningMultiplayer";
import LearningQueue from "./pages/LearningQueue";
import LearningEmployer from "./pages/LearningEmployer";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import GoalsPage from "./pages/GoalsPage";
import GoalCreatePage from "./pages/GoalCreatePage";
import CycleDashboard from "./pages/CycleDashboard";
import CycleListPage from "./pages/CycleListPage";
import TodayPage from "./pages/TodayPage";
import PlanningHome from "./pages/PlanningHome";
import WeeklyPlanPage from "./pages/WeeklyPlanPage";
import WeeklyPlanningPage from "./pages/WeeklyPlanningPage";
import MonthlyPlanPage from "./pages/MonthlyPlanPage";
import DailyPlanPage from "./pages/DailyPlanPage";
import FocusLauncher from "./pages/FocusLauncher";
import FocusSession from "./pages/FocusSession";
import FocusComplete from "./pages/FocusComplete";
import FocusHistory from "./pages/FocusHistory";
import FocusStats from "./pages/FocusStats";
import MessagesPage from "./pages/MessagesPage";
import ConversationThread from "./pages/ConversationThread";
import NewMessagePage from "./pages/NewMessagePage";
import MessagesIngest from "./pages/MessagesIngest";
import MessagesSettings from "./pages/MessagesSettings";
import ContactsHome from "./pages/ContactsHome";
import ContactsFindPage from "./pages/ContactsFindPage";
import ContactProfilePage from "./pages/ContactProfilePage";
import JobsHome from "./pages/JobsHome";
import JobDetailPage from "./pages/JobDetailPage";
import JobApplyPage from "./pages/JobApplyPage";
import DiscoverHome from "./pages/DiscoverHome";
import DomainDiscoveryPage from "./pages/DomainDiscoveryPage";
import SubdomainDiscoveryPage from "./pages/SubdomainDiscoveryPage";
import LocalDiscoveryPage from "./pages/LocalDiscoveryPage";
import StoriesPage from "./pages/StoriesPage";
import StoryDetailPage from "./pages/StoryDetailPage";
import StoryCreatePage from "./pages/StoryCreatePage";
import FeedPage from "./pages/FeedPage";
import WallsPage from "./pages/WallsPage";
import AwardsPage from "./pages/AwardsPage";
import ProofPage from "./pages/ProofPage";
import VisionPage from "./pages/VisionPage";
import InterestsPage from "./pages/InterestsPage";
import CognitivePage from "./pages/CognitivePage";
import ShopPage from "./pages/ShopPage";
import ChatPage from "./pages/ChatPage";
import AdminPage from "./pages/AdminPage";
import PersonalisedHomePage from "./pages/PersonalisedHomePage";
import MidReviewPage from "./pages/MidReviewPage";
import EndReviewPage from "./pages/EndReviewPage";
import EventsDashboard from "./pages/EventsDashboard";
import EventWorkspacePage from "./pages/EventWorkspacePage";
import TimeBlockingEngine from "./pages/TimeBlockingEngine";
import RecruiterDashboard from "./pages/RecruiterDashboard";
import RecruiterJobPage from "./pages/RecruiterJobPage";
import RecruiterPostPage from "./pages/RecruiterPostPage";
import RecruiterApplicantPage from "./pages/RecruiterApplicantPage";
import StudentShell from "./pages/StudentShell";
import ParentShell from "./pages/ParentShell";
import TeacherShell from "./pages/TeacherShell";
import UniversityShell from "./pages/UniversityShell";

const IS_RECRUITER_PORTAL = window.location.hostname === "recruiter.explain.global";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={IS_RECRUITER_PORTAL ? "/recruiter" : "/login"} replace />} />
      <Route path="/login" element={IS_RECRUITER_PORTAL ? <Navigate to="/recruiter" replace /> : <LoginPage />} />
      <Route path="/cockpit" element={<CockpitShell />} />
      <Route path="/home" element={<PersonalisedHomePage />} />
      <Route path="/today" element={<TodayPage />} />

      {/* Learning — nested so LearningShell sidebar always wraps sub-pages */}
      <Route path="/learning" element={<LearningShell />}>
        <Route index element={<Navigate to="cards" replace />} />
        <Route path="cards" element={<LearningCards />} />
        <Route path="notes" element={<LearningNotes />} />
        <Route path="books" element={<LearningBooks />} />
        <Route path="certifications" element={<LearningCertifications />} />
        <Route path="groups" element={<LearningGroups />} />
        <Route path="multiplayer" element={<LearningMultiplayer />} />
        <Route path="queue" element={<LearningQueue />} />
        <Route path="employer" element={<LearningEmployer />} />
      </Route>

      {/* Planning */}
      <Route path="/planning" element={<PlanningHome />} />
      <Route path="/planning/weekly" element={<WeeklyPlanPage />} />
      <Route path="/planning/weekly-session" element={<WeeklyPlanningPage />} />
      <Route path="/planning/monthly" element={<MonthlyPlanPage />} />
      <Route path="/planning/daily" element={<DailyPlanPage />} />
      <Route path="/planning/time-blocking" element={<TimeBlockingEngine />} />

      {/* Goals & Cycles */}
      <Route path="/goals" element={<GoalsPage />} />
      <Route path="/goals/create" element={<GoalCreatePage />} />
      <Route path="/cycles" element={<CycleListPage />} />
      <Route path="/cycles/:id" element={<CycleDashboard />} />
      <Route path="/cycles/:id/mid-review" element={<MidReviewPage />} />
      <Route path="/cycles/:id/end-review" element={<EndReviewPage />} />

      {/* Focus */}
      <Route path="/focus" element={<FocusLauncher />} />
      <Route path="/focus/session" element={<FocusSession />} />
      <Route path="/focus/complete" element={<FocusComplete />} />
      <Route path="/focus/history" element={<FocusHistory />} />
      <Route path="/focus/stats" element={<FocusStats />} />

      {/* Messages */}
      <Route path="/messages" element={<MessagesPage />} />
      <Route path="/messages/:id" element={<ConversationThread />} />
      <Route path="/messages/new" element={<NewMessagePage />} />
      <Route path="/messages/ingest" element={<MessagesIngest />} />
      <Route path="/messages/settings" element={<MessagesSettings />} />

      {/* Contacts */}
      <Route path="/contacts" element={<ContactsHome />} />
      <Route path="/contacts/find" element={<ContactsFindPage />} />
      <Route path="/contacts/:id" element={<ContactProfilePage />} />

      {/* Jobs */}
      <Route path="/jobs" element={<JobsHome />} />
      <Route path="/jobs/:id" element={<JobDetailPage />} />
      <Route path="/jobs/:id/apply" element={<JobApplyPage />} />

      {/* Discover */}
      <Route path="/discover" element={<DiscoverHome />} />
      <Route path="/discover/:domain" element={<DomainDiscoveryPage />} />
      <Route path="/discover/:domain/:subdomain" element={<SubdomainDiscoveryPage />} />
      <Route path="/discover/local" element={<LocalDiscoveryPage />} />

      {/* Social */}
      <Route path="/stories" element={<StoriesPage />} />
      <Route path="/stories/:id" element={<StoryDetailPage />} />
      <Route path="/stories/create" element={<StoryCreatePage />} />
      <Route path="/feed" element={<FeedPage />} />
      <Route path="/walls" element={<WallsPage />} />

      {/* Profile & Identity */}
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/awards" element={<AwardsPage />} />
      <Route path="/proof" element={<ProofPage />} />
      <Route path="/vision" element={<VisionPage />} />
      <Route path="/interests" element={<InterestsPage />} />
      <Route path="/cognitive" element={<CognitivePage />} />

      {/* Events */}
      <Route path="/events" element={<EventsDashboard />} />
      <Route path="/events/:id" element={<EventWorkspacePage />} />

      {/* Recruiter */}
      <Route path="/recruiter" element={<RecruiterDashboard />} />
      <Route path="/recruiter/jobs/:id" element={<RecruiterJobPage />} />
      <Route path="/recruiter/jobs/post" element={<RecruiterPostPage />} />
      <Route path="/recruiter/applicants/:id" element={<RecruiterApplicantPage />} />

      {/* Role shells */}
      <Route path="/student/*" element={<StudentShell />} />
      <Route path="/parent/*" element={<ParentShell />} />
      <Route path="/teacher/*" element={<TeacherShell />} />
      <Route path="/university/*" element={<UniversityShell />} />

      {/* Misc */}
      <Route path="/shop" element={<ShopPage />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  );
}
