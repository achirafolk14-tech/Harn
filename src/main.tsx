import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AdminFeedback } from './components/AdminFeedback.tsx'

const adminMatch = window.location.pathname.match(
  /^\/admin\/([a-zA-Z0-9_-]{8,64})\/?$/,
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {adminMatch ? <AdminFeedback token={adminMatch[1]!} /> : <App />}
  </StrictMode>,
)
