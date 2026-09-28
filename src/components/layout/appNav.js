import {
  Home,
  ArrowLeftRight,
  ChartNoAxesColumn,
  Wallet,
  Target,
  Settings,
  DatabaseZap,
} from 'lucide-react'

/**
 * The app's sections, in the order they appear in the sidebar.
 *
 * Ordering is deliberate: the two screens you open daily (dashboard,
 * transactions) sit at the top and inside the mobile thumb zone, while the
 * occasional ones (history, pay, budgets, data, settings) fall below.
 */
export const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: Home },
  { key: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { key: 'history', label: 'History', icon: ChartNoAxesColumn },
  { key: 'earnings', label: 'Pay & income', icon: Wallet },
  { key: 'budgets', label: 'Budgets', icon: Target },
  { key: 'data', label: 'Data studio', icon: DatabaseZap },
  { key: 'settings', label: 'Settings', icon: Settings },
]

/**
 * The four tabs kept in the mobile bottom bar, in thumb order.
 *
 * Seven destinations in a phone-width bar means each one is ~47px wide, which
 * is below the 44px minimum tap target once padding is taken into account — and
 * labels like "Data studio" wrap. Four tabs plus the raised add button is the
 * layout the money apps use, and the rest stay one tap away in the header menu.
 */
export const MOBILE_NAV_KEYS = ['dashboard', 'transactions', 'history', 'earnings']

/** Those four, resolved to their icon + label. */
export const MOBILE_TABS = MOBILE_NAV_KEYS.map((key) => NAV_ITEMS.find((n) => n.key === key)).filter(
  Boolean,
)

/** Everything not in the bottom bar — shown in the mobile header menu. */
export const MORE_NAV_ITEMS = NAV_ITEMS.filter((n) => !MOBILE_NAV_KEYS.includes(n.key))

export const DEFAULT_VIEW = 'dashboard'

