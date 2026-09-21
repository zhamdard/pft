/**
 * Curated, opinionated category set with a stable id, human label,
 * brand color (used across charts & chips) and an emoji glyph.
 * Keeping a fixed set keeps the UI clean and the data tidy.
 */

export const CATEGORIES = {
  income: [
    { id: 'salary', label: 'Salary', color: '#6366f1', emoji: '💼' },
    { id: 'freelance', label: 'Freelance', color: '#8b5cf6', emoji: '🖥️' },
    { id: 'business', label: 'Business', color: '#f59e0b', emoji: '🏪' },
    { id: 'investments', label: 'Investments', color: '#10b981', emoji: '📈' },
    { id: 'gift', label: 'Gift', color: '#ec4899', emoji: '🎁' },
    { id: 'other-income', label: 'Other', color: '#64748b', emoji: '➕' },
  ],
  expense: [
    { id: 'food', label: 'Food & Dining', color: '#f97316', emoji: '🍜' },
    { id: 'groceries', label: 'Groceries', color: '#84cc16', emoji: '🛒' },
    { id: 'transport', label: 'Transport', color: '#0ea5e9', emoji: '🚗' },
    { id: 'housing', label: 'Housing & Rent', color: '#3b82f6', emoji: '🏠' },
    { id: 'utilities', label: 'Utilities', color: '#eab308', emoji: '💡' },
    { id: 'health', label: 'Health & Care', color: '#ef4444', emoji: '🏥' },
    { id: 'fun', label: 'Fun & Leisure', color: '#a855f7', emoji: '🎬' },
    { id: 'shopping', label: 'Shopping', color: '#ec4899', emoji: '🛍️' },
    { id: 'education', label: 'Education', color: '#14b8a6', emoji: '📚' },
    { id: 'travel', label: 'Travel', color: '#06b6d4', emoji: '✈️' },
    { id: 'personal', label: 'Personal Care', color: '#f43f5e', emoji: '💆' },
    { id: 'other-expense', label: 'Other', color: '#64748b', emoji: '📦' },
  ],
}

export const ALL_CATEGORIES = [...CATEGORIES.expense, ...CATEGORIES.income]

/** Resolve a transaction's category object; falls back to the type's "Other". */
export function getCategory(type, id) {
  const list = type === 'income' ? CATEGORIES.income : CATEGORIES.expense
  return list.find((c) => c.id === id) || list[list.length - 1]
}
