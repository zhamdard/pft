import { RefreshCw, Settings2 } from 'lucide-react'
import { Alert } from './ui/Alert'
import { Button } from './ui/Primitives'
import { useDataHealth } from '../context/DataHealthContext'
import { describeFirestoreError } from '../utils/firestoreErrors'

const SCOPE_LABEL = {
  transactions: 'transactions',
  budgets: 'budgets',
  settings: 'preferences',
}

/**
 * One clear explanation when Firestore can't be read. Without this the app
 * looks "empty" and the user has no idea whether the problem is their data,
 * their rules, or their connection.
 */
export default function DataHealthBanner({ onOpenSettings }) {
  const { errorList, retry } = useDataHealth()

  if (errorList.length === 0) return null

  const { scope, error } = errorList[0]
  const info = describeFirestoreError(error)
  const otherScopes = errorList.slice(1).map((e) => SCOPE_LABEL[e.scope] || e.scope)
  const tone = error?.code === 'unavailable' ? 'offline' : 'error'

  return (
    <Alert
      tone={tone}
      title={info.title}
      detail={
        otherScopes.length
          ? `${info.detail} Also affecting: ${otherScopes.join(', ')}.`
          : info.detail
      }
      steps={info.steps}
      code={error?.code}
      className="mb-5"
      actions={
        <>
          <Button size="sm" variant="secondary" onClick={retry}>
            <RefreshCw size={15} /> Try again
          </Button>
          {onOpenSettings && (
            <Button size="sm" variant="ghost" onClick={onOpenSettings}>
              <Settings2 size={15} /> Run a check in Settings
            </Button>
          )}
        </>
      }
    />
  )
}
