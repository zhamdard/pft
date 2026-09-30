/**
 * Audit entry — renders the real App against mocked data.
 *
 * URLs this harness understands:
 *   ?empty=1   render every empty state instead of the fixtures
 *
 * Everything else is driven from tests/visual/audit.mjs, which navigates by
 * clicking the real navigation buttons.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '../../src/App.jsx'
import '../../src/styles/main.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)