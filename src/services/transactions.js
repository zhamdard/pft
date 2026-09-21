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

const txCollection = (uid) => collection(db, 'users', uid, 'transactions')
const txDoc = (uid, id) => doc(db, 'users', uid, 'transactions', id)

/**
 * Subscribe to all of a user's transactions (ordered newest first).
 * Returns an unsubscribe function.
 */
export function listenTransactions(uid, callback) {
  const q = query(txCollection(uid), orderBy('date', 'desc'), orderBy('createdAt', 'desc'))
  return onSnapshot(
    q,
    (snap) => {
      const items = []
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }))
      callback(items)
    },
    (error) => {
      console.error(error)
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
