/**
 * Debug probe: server-renders one page with the audit mocks active, so a React
 * error surfaces with a full component stack instead of a minified browser
 * stack. Run: node tests/visual/render-probe.mjs
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { ToastProvider } from '../../src/components/ui/Toast.jsx'
import { DataHealthProvider } from '../../src/context/DataHealthContext.jsx'
import { UserProvider } from '../../src/context/UserContext.jsx'
import Earnings from '../../src/pages/Earnings.jsx'

const transactions = [
  {
    id: 't1',
    type: 'income',
    category: 'salary',
    amount: 3400,
    date: '2026-09-01',
    description: 'Monthly salary',
  },
  {
    id: 't2',
    type: 'expense',
    category: 'housing',
    amount: 1480,
    date: '2026-09-03',
    description: 'Rent',
  },
]

export function tree() {
  return (
    <ToastProvider>
      <DataHealthProvider>
        <UserProvider>
          <Earnings transactions={transactions} loading={false} />
        </UserProvider>
      </DataHealthProvider>
    </ToastProvider>
  )
}