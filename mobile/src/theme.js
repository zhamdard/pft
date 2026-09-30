/**
 * Design tokens for the native app.
 *
 * These mirror the Tailwind palette the web app uses (indigo-600 accent,
 * slate neutrals) so a user moving between the two sees the same product.
 * Written as plain values rather than Tailwind classes because RN has no CSS
 * cascade — colours live here, spacing lives in the components that need it.
 */
export const colors = {
  // Accent
  primary: '#4f46e5',
  primaryDark: '#4338ca',
  primarySoft: '#eef2ff',

  // Neutrals (Tailwind slate)
  bg: '#f8fafc',
  surface: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  textMuted: '#64748b',
  textFaint: '#94a3b8',
  white: '#ffffff',

  // Semantic
  success: '#059669',
  successSoft: '#d1fae5',
  danger: '#e11d48',
  dangerSoft: '#ffe4e6',
  warning: '#d97706',
  warningSoft: '#fef3c7',

  // Amounts
  income: '#059669',
  expense: '#e11d48',
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 }

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 }

export const type = {
  hero: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  heading: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 15, fontWeight: '500' },
  small: { fontSize: 13, fontWeight: '500' },
  tiny: { fontSize: 11, fontWeight: '600' },
}

/** Tabular figures so money columns line up, like the web app's `tabular-nums`. */
export const numerals = { fontVariant: ['tabular-nums'] }

export const shadow = {
  card: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#4f46e5',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
}
