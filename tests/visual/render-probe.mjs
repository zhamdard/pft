/**
 * Runs tests/visual/probe-entry.jsx through Vite with the audit mocks active.
 *
 * Server-rendering a page is the fastest way to debug a React crash: the error
 * naming comes with a full component stack, and there is no browser in the way.
 *
 *   node tests/visual/render-probe.mjs
 */
import { createServer } from 'vite'
import { renderToStaticMarkup } from 'react-dom/server'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

const server = await createServer({
  configFile: path.join(here, 'vite.config.mjs'),
  logLevel: 'error',
})

try {
  const mod = await server.ssrLoadModule('/tests/visual/probe-entry.jsx')
  let captured = null
  const html = renderToStaticMarkup(mod.tree(), {
    onError(error, errorInfo) {
      captured = { message: error.message, componentStack: errorInfo?.componentStack || '' }
    },
  })
  if (captured) {
    console.error('\n=== RENDER FAILED ===')
    console.error(captured.message)
    console.error('\n--- component stack ---')
    console.error(captured.componentStack)
    process.exitCode = 1
  } else {
    console.log(`rendered OK — ${html.length} chars of markup`)
    console.log(html.slice(0, 600))
  }
} catch (err) {
  console.error('\n=== RENDER FAILED ===')
  console.error(err.message)
  console.error('\n--- component stack ---')
  console.error(err.stack || '(no stack)')
  process.exitCode = 1
} finally {
  await server.close()
}