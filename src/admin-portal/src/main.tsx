import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// StrictMode removed — it double-invokes effects in dev which causes
// ElevenLabs TTS to fire twice, producing two simultaneous voices.
createRoot(document.getElementById('root')!).render(<App />)
