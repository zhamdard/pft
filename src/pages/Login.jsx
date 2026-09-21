import { useState } from 'react'
import { Cloud, ShieldCheck, Smartphone, LoaderCircle, TriangleAlert } from 'lucide-react'
import { useUser } from '../context/UserContext'
import { Brand } from '../components/layout/Brand'
import firebaseConfig from '../firebase/config'

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.86c2.26-2.08 3.58-5.15 3.58-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.86-3c-1.08.72-2.45 1.15-4.08 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.56.38-2.28v-3.1H1.29a11.99 11.99 0 0 0 0 10.76l3.98-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.76c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.96 1.19 15.24 0 12 0A11.99 11.99 0 0 0 1.29 6.62l3.98 3.1C6.22 6.87 8.87 4.76 12 4.76Z"
      />
    </svg>
  )
}

const TRUST = [
  { icon: Cloud, text: 'Backed up in Google Cloud' },
  { icon: Smartphone, text: 'Desktop & mobile ready' },
  { icon: ShieldCheck, text: 'Private to your Google account' },
]

export default function Login() {
  const { signIn } = useUser()
  const [busy, setBusy] = useState(false)

  const needsSetup = firebaseConfig.apiKey?.startsWith('PASTE_')

  async function handleSignIn() {
    setBusy(true)
    try {
      await signIn()
    } catch (err) {
      console.error(err)
      setBusy(false)
      if (err?.code === 'auth/popup-closed-by-user') return
      if (err?.code === 'auth/unauthorized-domain') {
        alert(
          'This domain is not authorized for Google sign-in. Please add it to your Firebase ' +
            'project under Authentication → Settings → Authorized domains (or run on localhost).',
        )
        return
      }
      alert(
        'Google sign-in is not configured yet.\n\n👉 Follow docs/SETUP.md to connect Firebase, ' +
          'then restart the app.',
      )
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {needsSetup && (
        <div className="flex items-center gap-2 bg-amber-100/80 px-4 py-2.5 text-center text-xs font-medium text-amber-800">
          <TriangleAlert size={15} className="shrink-0" />
          <span>
            Firebase isn’t connected yet — paste your config in <code>src/firebase/config.js</code>{' '}
            and enable Google sign-in. See <code>docs/SETUP.md</code>.
          </span>
        </div>
      )}

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <Brand />
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-7 shadow-xl shadow-slate-200/60 sm:p-9">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Track your money, everywhere.
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Log in with Google to track your pay and expenses from any device — your data lives
              safely in your own Google Cloud.
            </p>

            <button
              onClick={handleSignIn}
              disabled={busy}
              className="mt-7 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
            >
              {busy ? (
                <LoaderCircle size={20} className="animate-spin text-indigo-600" />
              ) : (
                <GoogleLogo />
              )}
              {busy ? 'Signing in…' : 'Continue with Google'}
            </button>

            <div className="mt-7 space-y-2.5 border-t border-slate-100 pt-6">
              {TRUST.map((t) => (
                <div key={t.text} className="flex items-center gap-2.5 text-sm text-slate-500">
                  <t.icon size={16} className="shrink-0 text-slate-400" />
                  {t.text}
                </div>
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Free • No credit card • Your data stays private to you
          </p>
        </div>
      </main>
    </div>
  )
}
