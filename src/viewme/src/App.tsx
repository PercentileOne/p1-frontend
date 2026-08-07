import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Profile from './pages/Profile'
import Login from './pages/Login'

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: '#060A12', color: '#F1F5F9', fontFamily: "-apple-system,'Segoe UI',system-ui,sans-serif", WebkitFontSmoothing: 'antialiased' }}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/:slug" element={<Profile />} />
      </Routes>
    </div>
  )
}
