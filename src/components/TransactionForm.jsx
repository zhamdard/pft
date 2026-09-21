import { useEffect, useMemo, useState } from 'react'
import { Trash2, LoaderCircle } from 'lucide-react'
import Modal from './ui/Modal'
import { Button, Segmented } from './ui/Primitives'
import { Field, TextInput } from './ui/Form'
import { CATEGORIES } from '../data/categories'
import { addTransaction, updateTransaction, deleteTransaction } from '../services/transactions'
import { todayISO } from '../utils/date'
import { useUser } from '../context/UserContext'
import { useToast } from './ui/Toast'

/**
 * Shared modal for creating, editing and deleting a transaction.
 * Props come from the app shell:
 *   - state: { mode: 'create'|'edit', tx?, defaultType } or null to close
 *   - onClose
 */
export default function TransactionForm({ state, onClose }) {
  const { user, currency } = useUser()
  const toast = useToast()

  const isEdit = state?.mode === 'edit' && !!state?.tx
  const editing = isEdit ? state.tx : null

  const [type, setType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [date, setDate] = useState(todayISO())
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  // (Re)initialise the form every time the modal opens.
  useEffect(() => {
    if (!state) return
    if (state.mode === 'edit' && state.tx) {
      setType(state.tx.type || 'expense')
      setAmount(String(state.tx.amount ?? ''))
      setCategory(state.tx.category || '')
      setDate(state.tx.date || todayISO())
      setDescription(state.tx.description || '')
    } else {
      setType(state.defaultType || 'expense')
      setAmount('')
      setCategory('')
      setDate(todayISO())
      setDescription('')
    }
  }, [state])

  const categories = useMemo(() => CATEGORIES[type], [type])
  const canSwitchType = !isEdit // type is immutable once saved

  const amountNum = parseFloat(amount)
  const valid = Number.isFinite(amountNum) && amountNum > 0 && !!category && !!date

  async function handleSave() {
    if (!valid || !user) return
    const payload = {
      type,
      amount: Math.round(amountNum * 100) / 100,
      category,
      date,
      description: description.trim(),
    }
    setSaving(true)
    try {
      if (isEdit) {
        await updateTransaction(user.uid, editing.id, payload)
        toast('Transaction updated')
      } else {
        await addTransaction(user.uid, payload)
        toast(type === 'income' ? 'Income added' : 'Expense added')
      }
      onClose()
    } catch (err) {
      console.error(err)
      toast(err.message || 'Something went wrong', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editing || !user) return
    setSaving(true)
    try {
      await deleteTransaction(user.uid, editing.id)
      toast('Transaction deleted', 'info')
      onClose()
    } catch (err) {
      console.error(err)
      toast(err.message || 'Could not delete', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={!!state}
      onClose={onClose}
      title={isEdit ? 'Edit transaction' : 'Add transaction'}
      footer={
        <>
          {isEdit && (
            <Button variant="danger-ghost" onClick={handleDelete} disabled={saving} className="mr-auto">
              <Trash2 size={16} />
              Delete
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!valid || saving}>
            {saving && <LoaderCircle size={16} className="animate-spin" />}
            {isEdit ? 'Save changes' : 'Add'}
          </Button>
        </>
      }
    >
      <Segmented
        value={type}
        onChange={(val) => {
          if (!canSwitchType) return
          setType(val)
          setCategory('')
        }}
        options={[
          { value: 'expense', label: 'Expense' },
          { value: 'income', label: 'Income' },
        ]}
        className="mb-5"
      />

      <Field label="Amount" htmlFor="tx-amount" hint={`in ${currency}`}>
        <TextInput
          id="tx-amount"
          type="text"
          inputMode="decimal"
          autoFocus
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>

      <Field label="Category" className="mt-4">
        <div role="group" className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {categories.map((c) => {
            const active = category === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-center transition cursor-pointer
                  ${
                    active
                      ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500/30'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
              >
                <span className="text-xl leading-none">{c.emoji}</span>
                <span
                  className={`text-[10px] font-medium leading-tight ${
                    active ? 'text-indigo-700' : 'text-slate-500'
                  }`}
                >
                  {c.label.split(' ')[0]}
                </span>
              </button>
            )
          })}
        </div>
      </Field>

      <Field label="Date" htmlFor="tx-date" className="mt-4">
        <TextInput id="tx-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>

      <Field label="Note" hint="optional" htmlFor="tx-description" className="mt-4">
        <TextInput
          id="tx-description"
          placeholder="e.g. Weekly groceries"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
    </Modal>
  )
}

