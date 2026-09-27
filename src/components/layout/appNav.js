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
 * The four tabs kept in the mobile bottom bar. Everything else lives under
 * "More" — seven icons in a bottom bar on a phone is a mis-tap generator.
 */
export const MOBILE_NAV_KEYS = ['dashboard', 'transactions', 'history', 'earnings']

export const DEFAULT_VIEW = 'dashboard'

