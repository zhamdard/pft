import { forwardRef } from 'react'

const baseField =
  'w-full rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-400 ' +
  'transition disabled:bg-slate-50 disabled:text-slate-400'

function Label({ label, hint, htmlFor }) {
  if (!label) return null
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
      {label}
      {hint ? <span className="ml-1.5 text-xs font-normal text-slate-400">{hint}</span> : null}
    </label>
  )
}

export function Field({ label, hint, htmlFor, error, children, className = '' }) {
  return (
    <div className={className}>
      <Label label={label} hint={hint} htmlFor={htmlFor} />
      {children}
      {error ? <p className="mt-1 text-xs font-medium text-rose-600">{error}</p> : null}
    </div>
  )
}

export const TextInput = forwardRef(function TextInput(
  { type = 'text', error, className = '', icon, ...props },
  ref,
) {
  return (
    <div className={`relative ${icon ? '' : ''}`}>
      {icon ? (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
      ) : null}
      <input
        ref={ref}
        type={type}
        className={`${baseField} ${icon ? 'pl-10' : 'px-3.5'} py-2.5 ${
          error ? 'border-rose-400 focus:ring-rose-400' : ''
        } ${className}`}
        {...props}
      />
    </div>
  )
})

export const Select = forwardRef(function Select({ error, className = '', children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={`${baseField} appearance-none bg-no-repeat bg-[right_0.75rem_center] px-3.5 py-2.5 pr-10
        ${error ? 'border-rose-400 focus:ring-rose-400' : ''} ${className}`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m4 6 4 4 4-4'/></svg>\")",
      }}
      {...props}
    >
      {children}
    </select>
  )
})
