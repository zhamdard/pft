/**
 * Runs the render smoke tests through Vite's dev pipeline so JSX, Tailwind and
 * the app's `@` aliases resolve exactly as they do in the browser.
 *
 *   npm run test:render
 *
 * Exits non-zero if any check fails, so it is safe to use in CI.
 */
import { createServer } from 'vite'

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})

try {
  const mod = await server.ssrLoadModule('/tests/render/entry.jsx')
  const results = mod.run()
  const failed = results.filter((r) => !r.ok)

  for (const r of results) {
    const detail = r.ok ? '' : `   <- ${String(r.extra).slice(0, 220)}`
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${detail}`)
  }
  console.log(`\n${results.length - failed.length}/${results.length} passed`)
  if (failed.length) process.exitCode = 1
} catch (err) {
  console.error('SMOKE RUN CRASHED:', err)
  process.exitCode = 1
} finally {
  await server.close()
}