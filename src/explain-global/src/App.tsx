import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Nav } from './components/Nav';
import Home from './pages/Home';
import Jobs from './pages/Jobs';
import Learn from './pages/Learn';
import Community from './pages/Community';
import MyInterviews from './pages/MyInterviews';
import Portals from './pages/Portals';
import Pricing from './pages/Pricing';
import Register from './pages/Register';
import Login from './pages/Login';
import InvestorGate from './pages/investor/InvestorGate';
import InvestorPortal from './pages/investor/InvestorPortal';

function InvestorApp() {
  const [authed, setAuthed] = useState(sessionStorage.getItem('investor_auth') === '1');
  if (!authed) return <InvestorGate onAuth={() => setAuthed(true)} />;
  return <InvestorPortal />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/investor" element={<InvestorApp />} />
      <Route path="*" element={
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
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Routes>
        </div>
      } />
    </Routes>
  );
}
