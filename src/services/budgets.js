import {
  db,
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from '../firebase/firebase'

// Key scheme: `${categoryId}_${monthKey}` — one monthly limit per expense category.
const budgetDoc = (uid, key) => doc(db, 'users', uid, 'budgets', key)

export function listenBudgets(uid, monthKey, callback) {
  const q = query(
    collection(db, 'users', uid, 'budgets'),
    where('monthKey', '==', monthKey),
  )
  return onSnapshot(
    q,
    (snap) => {
      const list = []
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }))
      callback(list)
    },
    (error) => {
      console.error(error)
      callback([], error)
    },
  )
}

/** Save a monthly budget for a category. Saving 0 / negative removes it. */
export async function saveBudget(uid, monthKey, categoryId, amount) {
  const num = Math.max(0, Number(amount) || 0)
  const ref = budgetDoc(uid, `${categoryId}_${monthKey}`)
  if (num <= 0) {
    return deleteDoc(ref)
  }
  return setDoc(ref, { categoryId, monthKey, amount: num })
}
