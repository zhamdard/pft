import { Home, ArrowLeftRight, Target, Settings } from 'lucide-react'

export const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: Home },
  { key: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { key: 'budgets', label: 'Budgets', icon: Target },
  { key: 'settings', label: 'Settings', icon: Settings },
]

export const DEFAULT_VIEW = 'dashboard'
