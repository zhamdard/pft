/**
 * Navigation model — the same seven destinations, and the same four in the
 * bottom bar, as the web app's `components/layout/appNav.js`.
 *
 * Kept separate from that file because the icon type differs: the web uses
 * lucide-react components, React Native uses glyph fonts from
 * @expo/vector-icons. Everything else — order, labels, which four are the
 * primary tabs, which three live in the overflow sheet — mirrors the web
 * rationale documented there (seven tabs would drop each target below 44px).
 */
import { colors } from './theme'

export const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'home' },
  { key: 'transactions', label: 'Transactions', icon: 'swap-horizontal' },
  { key: 'history', label: 'History', icon: 'bar-chart' },
  { key: 'earnings', label: 'Pay & income', icon: 'wallet' },
  { key: 'budgets', label: 'Budgets', icon: 'target' },
  { key: 'data', label: 'Data studio', icon: 'server' },
  { key: 'settings', label: 'Settings', icon: 'settings' },
]

export const MOBILE_NAV_KEYS = ['dashboard', 'transactions', 'history', 'earnings']

export const MOBILE_TABS = MOBILE_NAV_KEYS.map((key) => NAV_ITEMS.find((n) => n.key === key)).filter(
  Boolean,
)

export const MORE_NAV_ITEMS = NAV_ITEMS.filter((n) => !MOBILE_NAV_KEYS.includes(n.key))

export const DEFAULT_VIEW = 'dashboard'

/** Views not yet ported to native — surfaced honestly rather than as a crash. */
export const NATIVE_TODO = new Set(['history', 'earnings', 'budgets', 'data', 'settings'])

export const tabColor = (active) => (active ? colors.primary : colors.textFaint)
