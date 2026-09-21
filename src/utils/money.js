export const SUPPORTED_CURRENCIES = [
  { code: 'USD', label: 'US Dollar', symbol: '$', locale: 'en-US', fraction: 2 },
  { code: 'EUR', label: 'Euro', symbol: '€', locale: 'de-DE', fraction: 2 },
  { code: 'GBP', label: 'British Pound', symbol: '£', locale: 'en-GB', fraction: 2 },
  { code: 'INR', label: 'Indian Rupee', symbol: '₹', locale: 'en-IN', fraction: 2 },
  { code: 'AUD', label: 'Australian Dollar', symbol: 'A$', locale: 'en-AU', fraction: 2 },
  { code: 'CAD', label: 'Canadian Dollar', symbol: 'C$', locale: 'en-CA', fraction: 2 },
  { code: 'JPY', label: 'Japanese Yen', symbol: '¥', locale: 'ja-JP', fraction: 0 },
  { code: 'CHF', label: 'Swiss Franc', symbol: 'CHF', locale: 'de-CH', fraction: 2 },
  { code: 'AED', label: 'UAE Dirham', symbol: 'د.إ', locale: 'ar-AE', fraction: 2 },
  { code: 'SAR', label: 'Saudi Riyal', symbol: '﷼', locale: 'ar-SA', fraction: 2 },
  { code: 'NZD', label: 'New Zealand Dollar', symbol: 'NZ$', locale: 'en-NZ', fraction: 2 },
  { code: 'SGD', label: 'Singapore Dollar', symbol: 'S$', locale: 'en-SG', fraction: 2 },
  { code: 'HKD', label: 'Hong Kong Dollar', symbol: 'HK$', locale: 'en-HK', fraction: 2 },
  { code: 'ZAR', label: 'South African Rand', symbol: 'R', locale: 'en-ZA', fraction: 2 },
  { code: 'NGN', label: 'Nigerian Naira', symbol: '₦', locale: 'en-NG', fraction: 2 },
  { code: 'KES', label: 'Kenyan Shilling', symbol: 'KSh', locale: 'en-KE', fraction: 2 },
  { code: 'PHP', label: 'Philippine Peso', symbol: '₱', locale: 'en-PH', fraction: 2 },
  { code: 'IDR', label: 'Indonesian Rupiah', symbol: 'Rp', locale: 'id-ID', fraction: 0 },
  { code: 'MYR', label: 'Malaysian Ringgit', symbol: 'RM', locale: 'ms-MY', fraction: 2 },
  { code: 'THB', label: 'Thai Baht', symbol: '฿', locale: 'th-TH', fraction: 2 },
  { code: 'BRL', label: 'Brazilian Real', symbol: 'R$', locale: 'pt-BR', fraction: 2 },
  { code: 'MXN', label: 'Mexican Peso', symbol: 'MX$', locale: 'es-MX', fraction: 2 },
  { code: 'TRY', label: 'Turkish Lira', symbol: '₺', locale: 'tr-TR', fraction: 2 },
  { code: 'KRW', label: 'South Korean Won', symbol: '₩', locale: 'ko-KR', fraction: 0 },
]

export function currencyMeta(code = 'USD') {
  return (
    SUPPORTED_CURRENCIES.find((c) => c.code === code) ||
    SUPPORTED_CURRENCIES[0]
  )
}

/** Format a number as money using the user's selected currency. */
export function formatMoney(amount, code = 'USD') {
  const meta = currencyMeta(code)
  const locale = meta?.locale || 'en-US'
  const currency = meta?.code || 'USD'
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: meta.fraction,
      minimumFractionDigits: meta.fraction,
    }).format(amount)
  } catch {
    return `${meta.symbol}${(amount ?? 0).toFixed(2)}`
  }
}

/** Compact formatting for chart axes ("1.2k"). */
export function compactMoney(value, code = 'USD') {
  const abs = Math.abs(value)
  const symbol = currencyMeta(code).symbol
  if (abs >= 1000000) return `${symbol}${(value / 1000000).toFixed(1)}M`
  if (abs >= 1000) return `${symbol}${(value / 1000).toFixed(1)}k`
  return `${symbol}${Math.round(value)}`
}

export function percent(n) {
  if (!Number.isFinite(n)) return 0
  return Math.round(n)
}
