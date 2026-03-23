import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import './styles/animations.css'
import { ToastProvider } from './components/ui/Toast'
import { AuthProvider } from './context'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthProvider>
  </StrictMode>,
)
