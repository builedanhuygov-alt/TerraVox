import { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { API_BASE } from '../services/api'
import { 
  Shield, 
  Lock, 
  User as UserIcon, 
  Mail, 
  ArrowRight, 
  CheckCircle2, 
  KeyRound, 
  AlertCircle, 
  Flame, 
  Database, 
  Info 
} from 'lucide-react'
import {
  isFirebaseConfigured,
  getFirebaseConfigStatus,
  registerWithEmailPassword,
  loginWithEmailPassword,
  logoutFirebase,
  resetPassword,
  subscribeToAuthState,
  currentUser,
  logout
} from '../services/firebase'

export { currentUser, logout }


export default function Login() {
  const [authProvider, setAuthProvider] = useState<'firebase' | 'database'>('database')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login')
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const nav = useNavigate()
  const location = useLocation()

  const firebaseStatus = getFirebaseConfigStatus()

  useEffect(() => {
    // If Firebase is configured, default to Firebase provider; otherwise database
    if (firebaseStatus.isConfigured) {
      setAuthProvider('firebase')
    }
  }, [firebaseStatus.isConfigured])

  useEffect(() => {
    // Subscribe to session restoration
    const unsub = subscribeToAuthState((fbUser) => {
      if (fbUser) {
        const from = (location.state as any)?.from?.pathname || '/'
        nav(from)
      }
    })
    return () => unsub()
  }, [])

  const submit = async () => {
    setError('')
    setSuccessMsg('')

    if (mode === 'forgot') {
      if (!email.trim()) {
        setError('Please enter your operator email address.')
        return
      }
      setBusy(true)
      try {
        await resetPassword(email.trim())
        setSuccessMsg(`Password reset instructions sent to ${email.trim()}. Check your inbox.`)
      } catch (err: any) {
        setError(err.message || 'Failed to send password reset email.')
      } finally {
        setBusy(false)
      }
      return
    }

    if (authProvider === 'firebase') {
      if (!email.trim() || !password) {
        setError('Please enter your email and password.')
        return
      }
      if (!firebaseStatus.isConfigured) {
        setError(
          `Firebase configuration is missing (${firebaseStatus.missingKeys.join(', ')}). Switch to Database Authentication or configure your Firebase .env variables.`
        )
        return
      }

      setBusy(true)
      try {
        if (mode === 'register') {
          const user = await registerWithEmailPassword(email.trim(), password)
          setSuccessMsg(`Account created for ${user.email}. Verification email sent. Signing you in...`)
          setTimeout(() => {
            nav((location.state as any)?.from?.pathname || '/')
          }, 1000)
        } else {
          await loginWithEmailPassword(email.trim(), password)
          window.dispatchEvent(new CustomEvent('ecochain-auth'))
          nav((location.state as any)?.from?.pathname || '/')
        }
      } catch (err: any) {
        setError(err.message || 'Authentication error')
      } finally {
        setBusy(false)
      }
    } else {
      // Database Auth
      if (!username.trim() || !password) {
        setError('Please enter your operator ID and password.')
        return
      }
      setBusy(true)
      try {
        if (mode === 'register') {
          const r = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username.trim(), password }),
          })
          if (!r.ok) {
            const txt = await r.text()
            throw new Error(txt || 'Registration failed')
          }
        }
        const fd = new URLSearchParams({ username: username.trim(), password })
        const r = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: fd,
        })
        if (!r.ok) throw new Error(r.status === 401 ? 'Incorrect username or password.' : await r.text())
        const j = await r.json()
        let role = j.role || 'viewer'
        try {
          const me = await fetch(`${API_BASE}/api/auth/me`, {
            headers: { Authorization: `Bearer ${j.access_token}` },
          })
          if (me.ok) {
            const mj = await me.json()
            role = mj.role || role
          }
        } catch {}
        try {
          sessionStorage.setItem('ecogl_admin_token', j.access_token)
          sessionStorage.setItem('ecogl_user', JSON.stringify({ username: username.trim(), role }))
        } catch {}
        window.dispatchEvent(new CustomEvent('ecochain-auth'))
        nav((location.state as any)?.from?.pathname || '/')
      } catch (e: any) {
        setError(String(e.message || e).slice(0, 300))
      } finally {
        setBusy(false)
      }
    }
  }

  return (
    <div className="max-w-md mx-auto my-12 p-6 sm:p-8 bg-[#0c1813] border border-[#1f382c] rounded-2xl shadow-2xl space-y-5">
      {/* Brand Header */}
      <div className="text-center space-y-1.5">
        <div className="w-12 h-12 rounded-xl bg-[#14291f] border border-[#234d3a] flex items-center justify-center mx-auto text-[#4ade80] shadow-sm">
          <Shield size={24} />
        </div>
        <div className="font-extrabold text-xl tracking-tight text-[#f0fdf4]">
          TERRAVOX SECURITY GATEWAY
        </div>
        <p className="text-xs text-[#8b9f94]">
          Command Center Access &amp; Operational Authentication
        </p>
      </div>

      {/* Auth Provider Selector */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-[#08120e] rounded-lg border border-[#14261e] text-xs">
        <button
          type="button"
          onClick={() => { setAuthProvider('database'); setError(''); }}
          className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md font-medium transition-colors ${
            authProvider === 'database'
              ? 'bg-[#1b3a2a] text-[#4ade80] font-semibold border border-[#295c42]'
              : 'text-[#718579] hover:text-[#f0fdf4]'
          }`}
        >
          <Database size={13} />
          <span>Local / Database</span>
        </button>
        <button
          type="button"
          onClick={() => { setAuthProvider('firebase'); setError(''); }}
          className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md font-medium transition-colors ${
            authProvider === 'firebase'
              ? 'bg-[#1b3a2a] text-[#4ade80] font-semibold border border-[#295c42]'
              : 'text-[#718579] hover:text-[#f0fdf4]'
          }`}
        >
          <Flame size={13} />
          <span>Firebase Auth</span>
        </button>
      </div>

      {/* Provider Status Diagnostic */}
      {authProvider === 'firebase' && (
        <div className={`p-2.5 rounded-lg border text-[11px] ${
          firebaseStatus.isConfigured 
            ? 'bg-[#14281e]/60 border-[#22573a] text-[#86efac]'
            : 'bg-[#1f190e] border-[#5e4719] text-[#fcd34d]'
        }`}>
          <div className="flex items-start gap-2">
            <Info size={14} className="shrink-0 mt-0.5" />
            <div>
              {firebaseStatus.isConfigured ? (
                <span>Connected to Firebase Project: <b>{firebaseStatus.projectId}</b></span>
              ) : (
                <div className="space-y-1">
                  <div className="font-semibold">Firebase Console credentials not detected.</div>
                  <div className="text-[10px] text-[#d4b476] leading-relaxed">
                    Set <code className="bg-[#0b0f0d] px-1 py-0.5 rounded text-[#fde047]">VITE_FIREBASE_API_KEY</code>, <code className="bg-[#0b0f0d] px-1 py-0.5 rounded text-[#fde047]">VITE_FIREBASE_AUTH_DOMAIN</code>, and <code className="bg-[#0b0f0d] px-1 py-0.5 rounded text-[#fde047]">VITE_FIREBASE_PROJECT_ID</code> in <code className="underline">.env</code>.
                    You can switch to <b>Local / Database</b> auth to sign in immediately.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mode Switcher */}
      <div className="flex rounded-lg bg-[#08120e] p-1 border border-[#14261e]">
        <button
          onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            mode === 'login' ? 'bg-[#22c55e] text-[#070f0b]' : 'text-[#8b9f94] hover:text-[#f0fdf4]'
          }`}
        >
          Sign In
        </button>
        <button
          onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            mode === 'register' ? 'bg-[#22c55e] text-[#070f0b]' : 'text-[#8b9f94] hover:text-[#f0fdf4]'
          }`}
        >
          Register
        </button>
        {authProvider === 'firebase' && (
          <button
            onClick={() => { setMode('forgot'); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              mode === 'forgot' ? 'bg-[#22c55e] text-[#070f0b]' : 'text-[#8b9f94] hover:text-[#f0fdf4]'
            }`}
          >
            Reset
          </button>
        )}
      </div>

      {/* Input Form */}
      <div className="space-y-3.5 text-xs">
        {authProvider === 'firebase' || mode === 'forgot' ? (
          <div className="space-y-1">
            <label className="text-[#8b9f94] block text-[11px] font-medium">Operator Email</label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#08120e] border border-[#1f382c] focus-within:border-[#22c55e] transition-colors">
              <Mail size={14} className="text-[#5b6f64]" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="operator@calfire.ca.gov"
                autoComplete="email"
                className="bg-transparent border-0 outline-none w-full text-xs text-[#e6ede9] placeholder-[#5b6f64]"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <label className="text-[#8b9f94] block text-[11px] font-medium">Operator / Command ID</label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#08120e] border border-[#1f382c] focus-within:border-[#22c55e] transition-colors">
              <UserIcon size={14} className="text-[#5b6f64]" />
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. calfire_ops"
                autoComplete="username"
                className="bg-transparent border-0 outline-none w-full text-xs text-[#e6ede9] placeholder-[#5b6f64]"
              />
            </div>
          </div>
        )}

        {mode !== 'forgot' && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[#8b9f94] block text-[11px] font-medium">Password</label>
              {authProvider === 'firebase' && (
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-[10px] text-[#4ade80] hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#08120e] border border-[#1f382c] focus-within:border-[#22c55e] transition-colors">
              <Lock size={14} className="text-[#5b6f64]" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submit() }}
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="bg-transparent border-0 outline-none w-full text-xs text-[#e6ede9] placeholder-[#5b6f64]"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-[#ef4444]/15 border border-[#ef4444]/30 text-[11px] text-[#fca5a5] flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5 text-[#ef4444]" />
            <span className="leading-tight">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg bg-[#22c55e]/15 border border-[#22c55e]/30 text-[11px] text-[#86efac] flex items-start gap-2">
            <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-[#22c55e]" />
            <span className="leading-tight">{successMsg}</span>
          </div>
        )}

        <button
          onClick={submit}
          disabled={busy}
          className="w-full py-2.5 rounded-lg bg-[#22c55e] text-[#070f0b] font-bold text-xs hover:bg-[#16a34a] disabled:opacity-50 transition-colors shadow-sm mt-2 flex items-center justify-center gap-2"
        >
          <span>
            {busy
              ? 'Authenticating...'
              : mode === 'forgot'
              ? 'Send Password Reset Email'
              : mode === 'login'
              ? 'Sign In to Command Center'
              : 'Register Operator Account'}
          </span>
          <ArrowRight size={14} />
        </button>
      </div>

      <div className="pt-2 text-center border-t border-[#14261e] text-[11px] text-[#718579]">
        <Link to="/" className="hover:text-[#4ade80] transition-colors">
          ← Return to Command Center
        </Link>
      </div>
    </div>
  )
}
