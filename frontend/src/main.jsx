import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Route /api requests to VITE_API_URL if configured (e.g. for Vercel frontend + Render backend)
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
if (API_BASE) {
  const originalFetch = window.fetch
  window.fetch = (input, init) => {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      input = `${API_BASE}${input}`
    } else if (input instanceof Request && input.url.startsWith('/api/')) {
      input = new Request(`${API_BASE}${input.url}`, input)
    }
    return originalFetch(input, init)
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
