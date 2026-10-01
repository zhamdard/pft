import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles/main.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// The service worker is what makes the app installable (Add to Home Screen /
// Install app) and able to open the shell offline. It only exists in the
// production build (`public/sw.js` → `dist/sw.js`), so registration is skipped
// in dev where there is nothing to register.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('[PFT] Service worker registration failed:', err)
    })
  })
}

