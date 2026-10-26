import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './motion/tokens.css'
import './utils/maplibreWorker'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
