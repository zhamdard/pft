import { useState } from 'react'
import { UserProvider, useUser } from './context/UserContext'
import { ToastProvider } from './components/ui/Toast'
import { Spinner } from './components/ui/Primitives'
import { Brand } from './components/layout/Brand'
import Sidebar from './components/layout/Sidebar'
import MobileNav from './components/layout/MobileNav'
import { TopBar } from './components/layout/TopBar'
import FloatingAdd from './components/FloatingAdd'
import TransactionForm from './components/TransactionForm'
import { DEFAULT_VIEW } from './components/layout/appNav'
import { useTransactions } from './hooks/useTransactions'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Budgets from './pages/Budgets'
import Settings from './pages/Settings'

function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50">
      <Brand />
      <Spinner className="text-indigo-600" size={30} />
    </div>
  )
}

function Shell() {
  const { user } = useUser()
  const [view, setView] = useState(DEFAULT_VIEW)
  const [form, setForm] = useState(null)
  const { transactions, loading } = useTransactions(user?.uid)

  const openAdd = (type = 'expense') => setForm({ mode: 'create', defaultType: type, tx: null })
  const openEdit = (tx) => setForm({ mode: 'edit', defaultType: tx.type, tx })
  const closeForm = () => setForm(null)

  return (
    <div className="min-h-screen lg:pl-64">
      <Sidebar view={view} setView={setView} />

      <div className="pb-24 lg:pb-10">
        <TopBar view={view} />
        <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
          {view === 'dashboard' && (
            <Dashboard
              transactions={transactions}
              loading={loading}
              openAdd={openAdd}
              openEdit={openEdit}
              setView={setView}
            />
          )}
          {view === 'transactions' && (
            <Transactions transactions={transactions} openAdd={openAdd} openEdit={openEdit} />
          )}
          {view === 'budgets' && <Budgets transactions={transactions} />}
          {view === 'settings' && <Settings />}
        </main>
      </div>

      <MobileNav view={view} setView={setView} onAdd={openAdd} />
      {(view === 'dashboard' || view === 'transactions') && (
        <FloatingAdd onClick={() => openAdd('expense')} />
      )}

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
      <UserProvider>
        <AppInner />
      </UserProvider>
    </ToastProvider>
  )
}
