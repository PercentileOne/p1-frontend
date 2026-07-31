import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Nav } from './components/Nav';
import Home from './pages/Home';
import Jobs from './pages/Jobs';
import Learn from './pages/Learn';
import Community from './pages/Community';
import MyInterviews from './pages/MyInterviews';
import Portals from './pages/Portals';
import Pricing from './pages/Pricing';

function ExternalRedirect({ to }: { to: string }) {
  useEffect(() => { window.location.replace(to); }, [to]);
  return null;
}

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: '#05040f' }}>
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/community" element={<Community />} />
        <Route path="/my-interviews" element={<MyInterviews />} />
        <Route path="/portals" element={<Portals />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/login" element={<ExternalRedirect to="https://candidate.explain.global/login" />} />
        <Route path="/register" element={<ExternalRedirect to="https://candidate.explain.global/register" />} />
      </Routes>
    </div>
  );
}
