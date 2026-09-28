import { Suspense, lazy, useState } from 'react'
import { UserProvider, useUser } from './context/UserContext'
import { DataHealthProvider } from './context/DataHealthContext'
import { ToastProvider } from './components/ui/Toast'
import { Spinner } from './components/ui/Primitives'
import { Brand } from './components/layout/Brand'
import DataHealthBanner from './components/DataHealthBanner'
import Sidebar from './components/layout/Sidebar'
import MobileNav from './components/layout/MobileNav'
import MoreSheet from './components/layout/MoreSheet'
import { TopBar } from './components/layout/TopBar'
import TransactionForm from './components/TransactionForm'
import { DEFAULT_VIEW, MORE_NAV_ITEMS } from './components/layout/appNav'
import { useTransactions } from './hooks/useTransactions'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

/*
 * Everything except the two screens you land on is loaded on demand.
 *
 * The Data Studio alone pulls in the Excel library, which is several hundred
 * kilobytes that nobody needs while checking their balance on a phone. Splitting
 * these out keeps the first paint small; the chunks download the moment you tap
 * the section, and Vite caches them after that.
 */
const Transactions = lazy(() => import('./pages/Transactions'))
const History = lazy(() => import('./pages/History'))
const Earnings = lazy(() => import('./pages/Earnings'))
const Budgets = lazy(() => import('./pages/Budgets'))
const DataStudio = lazy(() => import('./pages/DataStudio'))
const Settings = lazy(() => import('./pages/Settings'))

/** Placeholder while a lazily-loaded section is on its way. */
function PageLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner className="text-slate-300" size={28} />
    </div>
  )
}


function Splash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-slate-50">
      <Brand />
      <Spinner className="text-indigo-600" size={30} />
    </div>
  )
}

function Shell() {
  const { user } = useUser()
  const [view, setView] = useState(DEFAULT_VIEW)
  const [form, setForm] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const { transactions, loading } = useTransactions(user?.uid)

  const openAdd = (type = 'expense') => setForm({ mode: 'create', defaultType: type, tx: null })
  const openEdit = (tx) => setForm({ mode: 'edit', defaultType: tx.type, tx })
  const closeForm = () => setForm(null)

  return (
    /* min-h-dvh, not min-h-screen: 100vh is wrong on iOS Safari while the URL
     * bar is expanded, which is what makes layouts jump and clip. */
    <div className="min-h-dvh lg:pl-64">
      <Sidebar view={view} setView={setView} />

      {/* pb-nav clears the fixed bottom bar plus the home indicator on phones. */}
      <div className="pb-nav lg:pb-10">
        <TopBar view={view} onMenu={() => setMenuOpen(true)} />
        <main className="mx-auto max-w-6xl px-4 py-5 lg:px-8 lg:py-6">
          <DataHealthBanner onOpenSettings={() => setView('settings')} />

          {/* Eager: the landing screen, so the first paint is instant. */}
          {view === 'dashboard' && (
            <Dashboard
              transactions={transactions}
              loading={loading}
              openAdd={openAdd}
              openEdit={openEdit}
              setView={setView}
            />
          )}

          {/* Lazy: the rest, fetched on the first tap. */}
          <Suspense fallback={<PageLoading />}>
            {view === 'transactions' && (
              <Transactions transactions={transactions} openAdd={openAdd} openEdit={openEdit} />
            )}
            {view === 'history' && (
              <History
                transactions={transactions}
                loading={loading}
                setView={setView}
                openAdd={openAdd}
              />
            )}
            {view === 'earnings' && <Earnings transactions={transactions} loading={loading} />}
            {view === 'budgets' && <Budgets transactions={transactions} />}
            {view === 'data' && <DataStudio transactions={transactions} />}
            {view === 'settings' && <Settings transactions={transactions} />}
          </Suspense>
        </main>
      </div>

      <MobileNav view={view} setView={setView} onAdd={openAdd} />
      <MoreSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        view={view}
        setView={setView}
        items={MORE_NAV_ITEMS}
      />

      <TransactionForm state={form} onClose={closeForm} />
    </div>
  )
}

function AppInner() {
  const { user, authLoading } = useUser()
  if (authLoading) return <Splash />
  if (!user) return <Login />
  return <Shell />
}

export default function App() {
  return (
    <ToastProvider>
      {/* Data-health sits above the user context so auth itself can report
          Firestore problems (for example, settings that can't be created). */}
      <DataHealthProvider>
        <UserProvider>
          <AppInner />
        </UserProvider>
      </DataHealthProvider>
    </ToastProvider>
  )
}
