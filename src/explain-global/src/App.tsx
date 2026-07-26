import { Routes, Route } from 'react-router-dom';
import { Nav } from './components/Nav';
import Home from './pages/Home';
import Jobs from './pages/Jobs';
import Learn from './pages/Learn';
import Community from './pages/Community';
import MyInterviews from './pages/MyInterviews';

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
      </Routes>
    </div>
  );
}
