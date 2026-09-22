import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Bug,
  Check,
  CircleCheck,
  Copy,
  LifeBuoy,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Alert, CheckRow } from '../components/ui/Alert'
import { Button } from '../components/ui/Primitives'
import { useUser } from '../context/UserContext'
import { Brand } from '../components/layout/Brand'
import { useToast } from '../components/ui/Toast'
import { describeAuthError } from '../utils/authErrors'
import {
  buildDiagnosticsReport,
  checkAuthRelay,
  copyText,
  environmentInfo,
} from '../services/diagnostics'
import firebaseConfig from '../firebase/config'

/**
 * Codes that describe the *popup* rather than the sign-in itself. A browser
 * that can't hand the result back through a popup may still be perfectly
 * happy with a full-page redirect, so we retry automatically instead of
 * dead-ending the user on "the window closed and nothing happened".
 */
const RETRY_AS_REDIRECT = new Set([
  'auth/popup-blocked',
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
])

const isConfigured = () => {
  const key = firebaseConfig.apiKey || ''
  return Boolean(key) && !key.startsWith('PASTE_')
}

function GoogleLogo({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
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

function HelpPanel({ checks, checking, onRun, onCopy, copied, problem, authError, onBack }) {
  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-slate-800 cursor-pointer"
      >
        <ArrowLeft size={14} /> Back to sign in
      </button>

      <h1 className="text-lg font-bold text-slate-900">Sign-in troubleshooting</h1>
      <p className="mt-1 text-sm text-slate-500">
        These checks run inside this page — no developer tools needed.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={onRun} disabled={checking}>
          {checking ? <LoaderCircle size={15} className="animate-spin" /> : <LifeBuoy size={15} />}
          {checking ? 'Checking…' : 'Run checks'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCopy}>
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? 'Copied' : 'Copy report'}
        </Button>
      </div>

      {checks && (
        <ul className="mt-4 border-t border-slate-100 pt-2">
          {checks.map((c) => (
            <CheckRow key={c.id} state={c.state} label={c.label} value={c.value} />
          ))}
        </ul>
      )}

      {problem && (
        <Alert
          className="mt-5"
          tone="error"
          title={problem.title}
          detail={problem.detail}
          steps={problem.steps}
          code={authError?.code}
        />
      )}

      <div className="mt-6 space-y-3 text-xs leading-relaxed text-slate-500">
        <p>
          <span className="font-semibold text-slate-700">
            Nothing happens after choosing an account?
          </span>{' '}
          The Google window must be able to talk back to this page. Ad-blockers, privacy
          extensions and strict “block third-party cookies” settings are the usual culprits — try
          a private window with extensions disabled, or a different browser.
        </p>
        <p>
          <span className="font-semibold text-slate-700">Using a real domain?</span> Add it under
          Firebase → Authentication → Settings → Authorized domains, otherwise Google refuses to
          hand the sign-in back to the app.
        </p>
        <p>
          <span className="font-semibold text-slate-700">Still stuck?</span> Press “Copy report”
          and send it along — it lists your project, sign-in method and the last error code.
        </p>
      </div>
    </>
  )
}

function SignInPanel({ ready, busy, problem, authError, onGoogle, onRedirect, onHelp, onDismiss }) {
  return (
    <>
      <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
        <Sparkles size={13} /> Personal finance, simplified
      </div>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Welcome to PFT</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">
        Track your pay, spending and budgets in one calm place. Sign in with Google and your data
        is saved privately to your own account — available on every device.
      </p>

      <div className="mt-6 space-y-3">
        <Button
          className="w-full"
          size="lg"
          onClick={onGoogle}
          disabled={!ready || Boolean(busy)}
        >
          {busy === 'popup' ? <LoaderCircle size={18} className="animate-spin" /> : <GoogleLogo />}
          {busy === 'popup' ? 'Signing in…' : 'Continue with Google'}
        </Button>

        <button
          type="button"
          onClick={onRedirect}
          disabled={!ready || Boolean(busy)}
          className="w-full rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50 cursor-pointer"
        >
          {busy === 'redirect' ? (
            <span className="inline-flex items-center gap-2">
              <LoaderCircle size={14} className="animate-spin" /> Redirecting to Google…
            </span>
          ) : (
            'Trouble signing in? Open Google in this tab instead'
          )}
        </button>
      </div>

      {!ready && (
        <Alert
          className="mt-5"
          tone="warn"
          title="Firebase isn’t connected yet"
          detail="Add your project keys to src/firebase/config.js, then reload this page. docs/SETUP.md walks through it in about five minutes."
        />
      )}

      {problem && ready && (
        <Alert
          className="mt-5"
          tone="error"
          title={problem.title}
          detail={problem.detail}
          steps={problem.steps}
          code={authError?.code}
          actions={
            <>
              <Button size="sm" variant="secondary" onClick={onRedirect}>
                Try again in this tab
              </Button>
              <Button size="sm" variant="ghost" onClick={onDismiss}>
                Dismiss
              </Button>
            </>
          }
        />
      )}

      <button
        type="button"
        onClick={onHelp}
        className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 transition hover:text-indigo-800 cursor-pointer"
      >
        <Bug size={14} /> Having trouble signing in?
      </button>

      <div className="mt-6 space-y-2.5 border-t border-slate-100 pt-5">
        {[
          {
            Icon: ShieldCheck,
            text: 'Your data lives in Google Cloud (Firestore), never on a shared server.',
          },
          {
            Icon: LockKeyhole,
            text: 'Only your signed-in account can read it — enforced by database rules.',
          },
          {
            Icon: CircleCheck,
            text: 'Sign in on phone, tablet and desktop and see the same numbers.',
          },
        ].map(({ Icon, text }) => (
          <p key={text} className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-500">
            <Icon size={15} className="mt-px shrink-0 text-emerald-600" />
            {text}
          </p>
        ))}
      </div>
    </>
  )
}

export default function Login() {
  const { signInPopup, signInRedirect, authError, clearAuthError, authLoading, signedInWith } =
    useUser()
  const toast = useToast()

  const [busy, setBusy] = useState(null) // 'popup' | 'redirect' | null
  const [autoRetried, setAutoRetried] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [copied, setCopied] = useState(false)
  const [checks, setChecks] = useState(null)
  const [checking, setChecking] = useState(false)

  const ready = isConfigured()
  const problem = authError ? describeAuthError(authError) : null

  // A failed attempt must always unlock the buttons again, otherwise a
  // dismissed popup leaves the page looking frozen.
  useEffect(() => {
    if (authError) setBusy(null)
  }, [authError])

  // Popup blocked or closed → continue the very same sign-in as a redirect.
  // This MUST actually start the redirect; setting the "Redirecting…" flag
  // without navigating would leave the page stuck on a spinner forever.
  useEffect(() => {
    if (!authError || autoRetried || authLoading) return
    if (!RETRY_AS_REDIRECT.has(authError.code)) return
    setAutoRetried(true)
    clearAuthError()
    setBusy('redirect')
    signInRedirect().catch((err) => {
      console.warn('[PFT] fallback redirect failed:', err?.code || err)
      setBusy(null)
    })
  }, [authError, autoRetried, authLoading, clearAuthError, signInRedirect])

  async function handleGoogle() {
    if (!ready || busy) return
    clearAuthError()
    setBusy('popup')
    try {
      await signInPopup()
      toast('Signed in — loading your data…')
    } catch (err) {
      // A closed popup isn't worth a red banner: the effect above continues
      // the same sign-in as a redirect.
      if (err?.code === 'auth/popup-closed-by-user') return
      console.warn('[PFT] popup sign-in failed:', err?.code || err)
      setBusy(null)
    }
  }

  async function handleRedirect() {
    if (!ready || busy) return
    clearAuthError()
    setBusy('redirect')
    try {
      await signInRedirect()
    } catch (err) {
      console.warn('[PFT] redirect sign-in failed:', err?.code || err)
      setBusy(null)
    }
  }

  async function runChecks() {
    setChecking(true)
    const env = environmentInfo()
    setChecks([
      {
        id: 'config',
        state: env.configured ? 'pass' : 'fail',
        label: 'Firebase project connected',
        value: env.configured ? env.projectId : 'src/firebase/config.js is still a placeholder',
      },
      {
        id: 'storage',
        state: env.storage ? 'pass' : 'fail',
        label: 'Browser storage allowed (Google requires it)',
        value: env.storage ? 'yes' : 'blocked — private mode?',
      },
      {
        id: 'online',
        state: env.online ? 'pass' : 'fail',
        label: 'Online',
        value: env.online ? 'yes' : 'no',
      },
      { id: 'relay', state: 'pending', label: 'Google sign-in relay reachable' },
    ])

    const relay = await checkAuthRelay()
    setChecks((prev) =>
      prev.map((c) =>
        c.id === 'relay'
          ? { ...c, state: relay.ok ? 'pass' : 'fail', value: relay.detail }
          : c,
      ),
    )
    setChecking(false)
  }

  async function copyReport() {
    const ok = await copyText(
      buildDiagnosticsReport({
        user: null,
        signedInWith: signedInWith || busy || 'not signed in',
        lastError: authError,
        extra: { page: 'login' },
      }),
    )
    setCopied(ok)
    if (ok) setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-50 px-4 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-indigo-200/40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-sky-200/30 blur-3xl"
      />

      <div className="relative w-full max-w-md">
        <div className="flex justify-center">
          <Brand />
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/60 sm:p-8">
          {showHelp ? (
            <HelpPanel
              checks={checks}
              checking={checking}
              onRun={runChecks}
              onCopy={copyReport}
              copied={copied}
              problem={problem}
              authError={authError}
              onBack={() => setShowHelp(false)}
            />
          ) : (
            <SignInPanel
              ready={ready}
              busy={busy}
              problem={problem}
              authError={authError}
              onGoogle={handleGoogle}
              onRedirect={handleRedirect}
              onHelp={() => setShowHelp(true)}
              onDismiss={() => {
                clearAuthError()
                setAutoRetried(true)
              }}
            />
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          PFT · a private finance tracker — for you, and only you.
        </p>
      </div>
    </div>
  )
}
