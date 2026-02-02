import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { MentraAuthProvider } from '@mentra/react'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <MentraAuthProvider>
        <App />
      </MentraAuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
