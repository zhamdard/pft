/**
 * Vite config for the responsive audit harness.
 *
 * It swaps four data modules for in-memory mocks so the REAL shell and the REAL
 * pages can be rendered in a browser without signing in to Google or touching
 * Firestore. Nothing in src/ is modified — the substitution happens at load
 * time only for this config, so production is unaffected.
 *
 *   npm run audit:ui
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..', '..')

/** Real module (relative to root) → mock that stands in for it. */
const MOCKS = {
  'src/context/UserContext.jsx': 'tests/visual/mocks/UserContext.jsx',
  'src/hooks/useTransactions.js': 'tests/visual/mocks/useTransactions.js',
  'src/hooks/useBudgets.js': 'tests/visual/mocks/useBudgets.js',
  'src/hooks/useIncomeSources.js': 'tests/visual/mocks/useIncomeSources.js',
}

const asPosix = (p) => p.replace(/\\/g, '/')

function auditMocks() {
  return {
    name: 'pft-audit-mocks',
    enforce: 'pre',
    load(id) {
      const clean = asPosix(id.split('?')[0])
      for (const [target, mock] of Object.entries(MOCKS)) {
        if (clean.endsWith(`/${target}`)) {
          return fs.readFileSync(path.join(root, mock), 'utf8')
        }
      }
      return null
    },
  }
}

export default defineConfig({
  root,
  plugins: [auditMocks(), react()],
  server: { port: 5199, strictPort: true, host: '127.0.0.1' },
  logLevel: 'warn',
})