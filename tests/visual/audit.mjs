/**
 * Responsive audit — measures the real app in a real browser.
 *
 *   npm run audit:ui            # every page at every width
 *   npm run audit:ui -- empty   # the empty states too
 *
 * It drives headless Chrome over the DevTools Protocol using Node's built-in
 * WebSocket, so it needs no browser-automation dependency. For each page and
 * viewport it reports:
 *
 *   BLANK     the page rendered (almost) no text — the "blank screen" bug
 *   OVERFLOW  the document scrolls sideways by more than a pixel
 *   SPILL     an element sticks out past the viewport and nothing clips it
 *
 * Exits non-zero if anything is found, so it can gate a release.
 */
import { spawn } from 'node:child_process'
import { createServer } from 'vite'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

/**
 * Mirror everything to a file as well as the terminal. Redirecting this
 * script's stdout through PowerShell proved unreliable, and a silent audit is
 * worse than useless — the report must survive however it is invoked.
 */
const REPORT = path.join(here, 'audit-report.txt')
fs.writeFileSync(REPORT, '')
for (const level of ['log', 'error']) {
  const original = console[level].bind(console)
  console[level] = (...args) => {
    const line = args.map((a) => (typeof a === 'string' ? a : String(a))).join(' ')
    original(line)
    try {
      fs.appendFileSync(REPORT, `${line}\n`)
    } catch {
      /* never let logging break the audit */
    }
  }
}

/* ------------------------------------------------------------------ */
/* What to test                                                        */
/* ------------------------------------------------------------------ */

const VIEWPORTS = [
  { name: 'iPhone SE (1st gen)', width: 320, height: 568 },
  { name: 'iPhone SE / 8', width: 375, height: 667 },
  { name: 'iPhone 14 Pro Max', width: 430, height: 932 },
  { name: 'iPad portrait', width: 768, height: 1024 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'desktop', width: 1600, height: 900 },
]

/** Sections, by the exact label shown in both the sidebar and the mobile nav. */
const PAGES = [
  'Dashboard',
  'Transactions',
  'History',
  'Pay & income',
  'Budgets',
  'Data studio',
  'Settings',
]

/* ------------------------------------------------------------------ */
/* Browser plumbing                                                    */
/* ------------------------------------------------------------------ */

function chromePath() {
  const candidates = [
    process.env.PFT_CHROME,
    `${process.env.ProgramFiles}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env['ProgramFiles(x86)']}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env.ProgramFiles}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${process.env['ProgramFiles(x86)']}\\Microsoft\\Edge\\Application\\msedge.exe`,
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean)
  const found = candidates.find((p) => fs.existsSync(p))
  if (!found) throw new Error('No Chrome/Edge found. Set PFT_CHROME to the executable path.')
  return found
}

/** Minimal CDP client over the built-in WebSocket (Node 22+). */
function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl)
    const pending = new Map()
    const listeners = new Map()
    let nextId = 1

    const api = {
      send(method, params = {}) {
        return new Promise((res, rej) => {
          const id = nextId++
          pending.set(id, { resolve: res, reject: rej })
          ws.send(JSON.stringify({ id, method, params }))
        })
      },
      /** Subscribe to CDP events (no id) — used to catch page exceptions. */
      on(method, fn) {
        if (!listeners.has(method)) listeners.set(method, [])
        listeners.get(method).push(fn)
      },
      close: () => ws.close(),
    }

    ws.addEventListener('open', () => resolve(api))
    ws.addEventListener('error', (e) => reject(new Error(`CDP socket error: ${e.message || 'x'}`)))
    ws.addEventListener('message', (ev) => {
      let msg
      try {
        msg = JSON.parse(ev.data)
      } catch {
        return
      }
      if (msg.id) {
        const entry = pending.get(msg.id)
        if (!entry) return
        pending.delete(msg.id)
        if (msg.error) entry.reject(new Error(`${msg.error.message} (${msg.error.code})`))
        else entry.resolve(msg.result)
        return
      }
      for (const fn of listeners.get(msg.method) || []) fn(msg.params)
    })
  })
}

async function launchChrome(url) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pft-audit-'))
  const child = spawn(
    chromePath(),
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-features=Translate,MediaRouter',
      '--hide-scrollbars',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      url,
    ],
    { stdio: 'ignore' },
  )

  const portFile = path.join(profile, 'DevToolsActivePort')
  const deadline = Date.now() + 30000
  while (!fs.existsSync(portFile)) {
    if (Date.now() > deadline) {
      child.kill()
      throw new Error('Chrome did not expose a debugging port within 30s')
    }
    await new Promise((r) => setTimeout(r, 150))
  }
  const [port] = fs.readFileSync(portFile, 'utf8').split('\n')

  let target = null
  while (!target && Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`)
      const list = await res.json()
      target = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
    } catch {
      /* not up yet */
    }
    if (!target) await new Promise((r) => setTimeout(r, 150))
  }
  if (!target) {
    child.kill()
    throw new Error('No page target appeared in Chrome')
  }

  return {
    cdp: await connect(target.webSocketDebuggerUrl),
    stop() {
      try {
        child.kill()
      } catch {
        /* already gone */
      }
      try {
        fs.rmSync(profile, { recursive: true, force: true })
      } catch {
        /* Windows may still hold a handle; harmless */
      }
    },
  }
}

/* ------------------------------------------------------------------ */
/* Scripts injected into the page                                      */
/* ------------------------------------------------------------------ */

/**
 * `docOverflow` is the authoritative "the page scrolls sideways" signal.
 * `spill` lists elements that genuinely escape the viewport — anything already
 * contained by a clipping or scrolling ancestor is ignored, since that is the
 * intended behaviour for decorative blobs and the history strip.
 */
const MEASURE = `(() => {
  const de = document.documentElement
  const vw = de.clientWidth
  const IGNORE = new Set(['svg','path','g','rect','circle','ellipse','line','polyline','polygon','defs','clippath','text','tspan','use','stop','lineargradient'])

  const contained = (el) => {
    let p = el.parentElement
    while (p && p !== de) {
      const ox = getComputedStyle(p).overflowX
      if (ox === 'hidden' || ox === 'auto' || ox === 'scroll') return true
      p = p.parentElement
    }
    return false
  }

  const spill = []
  for (const el of document.body.querySelectorAll('*')) {
    const tag = el.tagName.toLowerCase()
    if (IGNORE.has(tag)) continue
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue
    if (r.right <= vw + 1 && r.left >= -1) continue
    if (contained(el)) continue
    spill.push({
      tag,
      cls: String(el.className || '').slice(0, 110),
      left: Math.round(r.left),
      right: Math.round(r.right),
      text: (el.textContent || '').trim().slice(0, 45),
    })
  }

  const main = document.querySelector('main')
  const mainText = main ? (main.innerText || '').trim() : ''

  return JSON.stringify({
    vw,
    docOverflow: de.scrollWidth - vw,
    pageHeight: de.scrollHeight,
    mainHeight: main ? Math.round(main.getBoundingClientRect().height) : 0,
    mainTextLen: mainText.length,
    spill: spill.slice(0, 10),
    spillTotal: spill.length,
  })
})()`

/** Navigate by clicking the real control, opening the phone menu when needed. */
const NAV_HELPER = `window.__nav = async (label) => {
  const sel = 'nav[aria-label="Primary"] button, aside button, nav[aria-label="More sections"] button'
  const find = () => [...document.querySelectorAll(sel)]
    .find((b) => b.textContent.trim().replace(/\\s+/g, ' ') === label)
  let btn = find()
  if (!btn) {
    const menu = document.querySelector('button[aria-label="Open menu"]')
    if (menu) {
      menu.click()
      await new Promise((r) => setTimeout(r, 300))
      btn = find()
    }
  }
  if (!btn) return { ok: false }
  btn.click()
  await new Promise((r) => setTimeout(r, 400))
  return { ok: true }
}
true`

/* ------------------------------------------------------------------ */
/* Driver                                                              */
/* ------------------------------------------------------------------ */

async function main() {
  const includeEmpty = process.argv.includes('empty')
  const runs = includeEmpty ? [false, true] : [false]

  const server = await createServer({
    configFile: path.join(here, 'vite.config.mjs'),
    logLevel: 'error',
  })
  await server.listen()
  const base = `http://127.0.0.1:${server.config.server.port}/tests/visual/index.html`
  console.log(`audit server: ${base}`)

  const browser = await launchChrome(`${base}?empty=0`)
  const { cdp } = browser
  await cdp.send('Runtime.enable')
  await cdp.send('Page.enable')

  /* A React crash unmounts the whole tree, which is exactly the "blank screen"
   * symptom — so capture the reason, or the report is just "it's blank". */
  const pageErrors = []
  cdp.on('Runtime.exceptionThrown', (p) => {
    const d = p.exceptionDetails || {}
    pageErrors.push(d.exception?.description || d.text || 'unknown exception')
  })
  cdp.on('Runtime.consoleAPICalled', (p) => {
    if (p.type === 'error') {
      const text = (p.args || []).map((a) => a.description || a.value).join(' ')
      pageErrors.push(`console.error: ${text}`)
    }
  })

  const evaluate = async (expression) => {
    const r = await cdp.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (r.exceptionDetails) {
      throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text)
    }
    return r.result.value
  }

  const waitForApp = async () => {
    for (let i = 0; i < 80; i += 1) {
      const ready = await evaluate(
        `Boolean(document.querySelector('main') && (document.querySelector('button[aria-label="Open menu"]') || document.querySelector('aside')))`,
      )
      if (ready) return true
      await new Promise((r) => setTimeout(r, 200))
    }
    return false
  }

  /**
   * Code-split views fetch their chunk after navigation. Without a settle
   * window the measurement can catch the Suspense fallback and report it as a
   * blank screen, which is a harness bug rather than an app bug.
   */
  const waitForContent = async () => {
    for (let i = 0; i < 40; i += 1) {
      const len = await evaluate(
        `(document.querySelector('main')?.innerText || '').trim().length`,
      )
      if (len >= 40) return true
      await new Promise((r) => setTimeout(r, 100))
    }
    return false
  }

  const problems = []

  for (const empty of runs) {
    for (const vp of VIEWPORTS) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width < 1024,
      })
      await cdp.send('Page.navigate', {
        url: `${base}?empty=${empty ? 1 : 0}&w=${vp.width}&t=${Date.now()}`,
      })
      if (!(await waitForApp())) {
        problems.push({ empty, vp, page: '(app)', kind: 'NO-APP', detail: 'app never mounted' })
        console.log(`\n=== ${vp.width}x${vp.height} - APP DID NOT MOUNT`)
        continue
      }
      await evaluate(NAV_HELPER)

      console.log(`\n=== ${vp.width}x${vp.height} - ${vp.name} ${empty ? '[empty]' : ''}`)

      for (const label of PAGES) {
        pageErrors.length = 0
        const nav = await evaluate(`window.__nav(${JSON.stringify(label)})`)
        if (!nav?.ok) {
          problems.push({ empty, vp, page: label, kind: 'NOT-FOUND', detail: 'nav control missing' })
          console.log(`  ${label.padEnd(14)} - could not navigate`)
          continue
        }
        await waitForContent()
        const m = JSON.parse(await evaluate(MEASURE))
        const flags = []
        if (m.mainTextLen < 40) flags.push('BLANK')
        if (m.docOverflow > 1) flags.push('OVERFLOW')
        if (m.spillTotal > 0) flags.push('SPILL')

        console.log(
          `  ${label.padEnd(14)} h=${String(m.pageHeight).padStart(5)}  text=${String(
            m.mainTextLen,
          ).padStart(5)}  docOverflow=${m.docOverflow}${flags.length ? `  <<< ${flags.join(' ')}` : ''}`,
        )

        if (flags.includes('BLANK')) {
          const why = pageErrors.length
            ? [...new Set(pageErrors)]
                .sort((a, b) => {
                  // React's own log names the crashing component — prefer it.
                  const score = (s) => (s.includes('The above error occurred in') ? 2 : 0)
                  return score(b) - score(a) || b.length - a.length
                })[0]
                .replace(/\s+/g, ' ')
                .slice(0, 900)
            : 'no exception captured'
          problems.push({
            empty,
            vp,
            page: label,
            kind: 'BLANK',
            detail: `rendered ${m.mainTextLen} chars (main height ${m.mainHeight}px) — ${why}`,
          })
        }
        if (flags.includes('OVERFLOW')) {
          problems.push({
            empty,
            vp,
            page: label,
            kind: 'OVERFLOW',
            detail: `document scrolls sideways by ${m.docOverflow}px`,
          })
        }
        for (const s of m.spill) {
          problems.push({
            empty,
            vp,
            page: label,
            kind: 'SPILL',
            detail: `<${s.tag}> right=${s.right} (vw ${m.vw}) cls="${s.cls}" text="${s.text}"`,
          })
        }
      }
    }
  }

  /* --- Scroll reset: the classic "blank screen when switching tabs" --- */
  console.log('\n=== scroll behaviour when switching views (375px)')
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 667,
    deviceScaleFactor: 1,
    mobile: true,
  })
  await cdp.send('Page.navigate', { url: `${base}?empty=0&scroll=${Date.now()}` })
  await waitForApp()
  await evaluate(NAV_HELPER)
  await evaluate('window.scrollTo(0, document.documentElement.scrollHeight)')
  await new Promise((r) => setTimeout(r, 400))
  const before = await evaluate('window.scrollY')
  await evaluate(`window.__nav('Transactions')`)
  await new Promise((r) => setTimeout(r, 400))
  const after = await evaluate('window.scrollY')
  const showing = await evaluate(
    `(() => { const m = document.querySelector('main'); return m ? (m.innerText || '').trim().replace(/\\s+/g, ' ').slice(0, 45) : '' })()`,
  )
  console.log(`  Dashboard scrolled to ${before}px -> tapped Transactions -> scrollY = ${after}`)
  console.log(`  main now starts with: "${showing}"`)
  if (after > 4) {
    problems.push({
      empty: false,
      vp: { width: 375, height: 667, name: 'iPhone SE / 8' },
      page: 'Transactions',
      kind: 'NO-SCROLL-RESET',
      detail: `landed at scrollY=${after} instead of the top - reads as a blank screen`,
    })
  }

  /* ---------------------------------------------------------------- */

  browser.stop()
  await server.close()

  console.log(`\n${'='.repeat(72)}`)
  if (!problems.length) {
    console.log('No responsive problems found.')
    return
  }
  console.log(`${problems.length} problem(s):\n`)
  const byKind = {}
  for (const p of problems) {
    byKind[p.kind] = byKind[p.kind] || []
    byKind[p.kind].push(p)
  }
  for (const [kind, list] of Object.entries(byKind)) {
    console.log(`--- ${kind} (${list.length}) ---`)
    const seen = new Set()
    for (const p of list) {
      const key = `${p.page}|${p.detail}`
      if (seen.has(key)) continue
      seen.add(key)
      console.log(`  ${p.page} @ ${p.vp.width}px${p.empty ? ' [empty]' : ''}: ${p.detail}`)
    }
    console.log('')
  }
  process.exitCode = 1
}

main().catch((err) => {
  console.error('audit failed:', err.message)
  process.exitCode = 1
})