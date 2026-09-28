/**
 * Render smoke tests.
 *
 * The logic tests in tests/*.test.js cover pure functions, but the mobile
 * navigation is pure layout — and layout regressions (a dropped destination, a
 * tab that gets too small to tap) are exactly the kind of bug that logic tests
 * cannot see. These render each navigation surface to static markup and assert
 * on the result.
 *
 * Run with: npm run test:render
 */
import { renderToStaticMarkup } from 'react-dom/server'
import MobileNav from '../../src/components/layout/MobileNav.jsx'
import MoreSheet from '../../src/components/layout/MoreSheet.jsx'
import { TopBar } from '../../src/components/layout/TopBar.jsx'
import Sidebar from '../../src/components/layout/Sidebar.jsx'
import { UserProvider } from '../../src/context/UserContext.jsx'
import { DataHealthProvider } from '../../src/context/DataHealthContext.jsx'
import { ToastProvider } from '../../src/components/ui/Toast.jsx'
import {
  NAV_ITEMS,
  MOBILE_TABS,
  MORE_NAV_ITEMS,
} from '../../src/components/layout/appNav.js'

const results = []
const check = (name, ok, extra = '') => results.push({ name, ok: Boolean(ok), extra })

/** Strip HTML entities so we can assert on human-readable text. */
const decode = (html) =>
  html
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')

/** The app needs these providers before the shells will render. */
const withProviders = (children) => (
  <ToastProvider>
    <DataHealthProvider>
      <UserProvider>{children}</UserProvider>
    </DataHealthProvider>
  </ToastProvider>
)

export function run() {
  /* --- The important one: the phone redesign must not lose a destination --- */
  check('nav has 7 destinations', NAV_ITEMS.length === 7, `got ${NAV_ITEMS.length}`)
  check('bottom bar holds exactly 4 tabs', MOBILE_TABS.length === 4, `got ${MOBILE_TABS.length}`)
  check('menu holds the other 3', MORE_NAV_ITEMS.length === 3, `got ${MORE_NAV_ITEMS.length}`)

  const reachable = [...MOBILE_TABS, ...MORE_NAV_ITEMS].map((i) => i.key).sort()
  const expected = NAV_ITEMS.map((i) => i.key).sort()
  check(
    'every destination is still reachable somewhere',
    JSON.stringify(reachable) === JSON.stringify(expected),
    `reachable=${reachable.join(',')} expected=${expected.join(',')}`,
  )
  check('no destination appears twice', new Set(reachable).size === reachable.length)
  check('every tab has an icon and a label', MOBILE_TABS.every((i) => i.icon && i.label))
  check('settings moved into the menu', MORE_NAV_ITEMS.some((i) => i.key === 'settings'))

  /* --- Bottom tab bar --------------------------------------------------- */
  const bar = renderToStaticMarkup(<MobileNav view="dashboard" setView={() => {}} onAdd={() => {}} />)
  const barText = decode(bar)
  const tabLabels = ['Dashboard', 'Transactions', 'History', 'Pay & income']
  check(
    'bottom bar renders all four tab labels',
    tabLabels.every((l) => barText.includes(l)),
    tabLabels.filter((l) => !barText.includes(l)).join(', ') || 'none missing',
  )
  check(
    'bottom bar has exactly one add button',
    (bar.match(/aria-label="Add transaction"/g) || []).length === 1,
  )
  check(
    'bottom bar no longer contains the 3 crowded items',
    !bar.includes('Data studio') && !bar.includes('Budgets') && !bar.includes('Settings'),
  )
  check('bottom bar marks the active tab', bar.includes('aria-current="page"'))
  check('bottom bar clears the home indicator', bar.includes('safe-bottom'))
  check('tab targets are at least 3.5rem tall', bar.includes('min-h-[3.5rem]'))

  /* --- Top bar ---------------------------------------------------------- */
  const header = renderToStaticMarkup(<TopBar view="budgets" onMenu={() => {}} />)
  check('header names the current section', header.includes('Budgets'), header.slice(0, 200))
  check('header exposes a menu button', header.includes('aria-label="Open menu"'))
  check('header respects the notch', header.includes('safe-top'))

  /* --- Overflow menu (needs auth context for the account row) ----------- */
  const sheet = renderToStaticMarkup(
    withProviders(
      <MoreSheet open onClose={() => {}} view="dashboard" setView={() => {}} items={MORE_NAV_ITEMS} />,
    ),
  )
  check(
    'menu sheet lists the three sections',
    ['Budgets', 'Data studio', 'Settings'].every((l) => sheet.includes(l)),
    sheet.slice(0, 300),
  )
  check('menu sheet offers sign out', sheet.includes('Sign out'))

  /* --- Desktop sidebar -------------------------------------------------- */
  const sidebar = renderToStaticMarkup(
    withProviders(<Sidebar view="dashboard" setView={() => {}} />),
  )
  /* The providers wrap their own markup (the toast layer), so assert on the
   * sidebar's markers rather than on an empty string. */
  check(
    'desktop sidebar hides itself when signed out',
    !sidebar.includes('Sign out') && !sidebar.includes('aria-label="Primary"'),
    sidebar.slice(0, 160),
  )

  return results
}