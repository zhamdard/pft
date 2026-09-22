import {
  db,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from '../firebase/firebase'
import { sortByDateDesc } from '../utils/sort'

const txCollection = (uid) => collection(db, 'users', uid, 'transactions')
const txDoc = (uid, id) => doc(db, 'users', uid, 'transactions', id)

/**
 * Subscribe to all of a user's transactions (ordered newest first).
 * Returns an unsubscribe function.
 *
 * NOTE: the query orders by a single field on purpose — see utils/sort.js.
 * Two `orderBy` clauses would require a composite Firestore index, and a
 * missing index shows up to the user as "my data disappeared".
 *
 * `callback(items, error)` — the error argument is only passed on failure,
 * so callers can show real guidance instead of an empty dashboard.
 */
export function listenTransactions(uid, callback) {
  const q = query(txCollection(uid), orderBy('date', 'desc'))
  return onSnapshot(
    q,
    (snap) => {
      const items = []
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }))
      callback(sortByDateDesc(items))
    },
    (error) => {
      console.error('[PFT] transactions listener failed:', error?.code || error)
      callback([], error)
    },
  )
}

export async function addTransaction(uid, data) {
  return addDoc(txCollection(uid), { ...data, createdAt: serverTimestamp() })
}

export async function updateTransaction(uid, id, data) {
  return updateDoc(txDoc(uid, id), data)
}

export async function deleteTransaction(uid, id) {
  return deleteDoc(txDoc(uid, id))
}
