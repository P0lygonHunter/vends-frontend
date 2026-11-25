import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import SiteFooter from '../components/SiteFooter'
import axios from 'axios'
import API_BASE_URL from '../config/api'
import { setPwaEntry, getPwaEntry } from '../utils/pwaEntry'
import { applyPwaManifest } from '../utils/pwa'
import PwaInstallBanner from '../components/PwaInstallBanner'

function getOrCreateDeviceId() {
  try {
    let id = localStorage.getItem('vendsDeviceId')
    if (!id || id.length < 16) {
      id = (crypto.randomUUID && crypto.randomUUID()) || `d_${Date.now()}_${Math.random().toString(36).slice(2)}`
      localStorage.setItem('vendsDeviceId', id)
    }
    return id
  } catch {
    return `d_${Date.now()}`
  }
}

export default function Login() {
  const googleBtnRef = useRef(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isNewUser, setIsNewUser] = useState(false)
  const [expiredInfo, setExpiredInfo] = useState(null)
  const [otpStep, setOtpStep] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [devOtpHint, setDevOtpHint] = useState('')
  const [rememberDevice, setRememberDevice] = useState(true)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

    // PWA: parent/teacher → /open; school admin stays on this login page
  useEffect(() => {
    const standalone =
      (typeof window !== 'undefined' &&
        (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true)) ||
      searchParams.get('source') === 'pwa'
    if (!standalone) return
    const entry = getPwaEntry()
    const role = (searchParams.get('role') || entry?.role || '').toLowerCase()
    if (role === 'parent' || role === 'teacher') {
      navigate('/open', { replace: true })
      return
    }
    // Admin (or unknown): school website login inside the app
    try {
      setPwaEntry('admin', localStorage.getItem('schoolId') || entry?.schoolId || '')
      applyPwaManifest(localStorage.getItem('schoolId') || '', 'admin')
    } catch (_) {}
  }, [navigate, searchParams])


  // Already logged in → dashboard (PWA reopen should not force login)
  useEffect(() => {
    const token = localStorage.getItem('authToken')
    const sid = localStorage.getItem('schoolId')
    if (token && sid && searchParams.get('admin') !== '1') {
      // admin=1 still shows form if they want re-login; otherwise skip
    }
    if (token && sid && !searchParams.get('relogin')) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate, searchParams])

  const persistSchoolSession = (token, school) => {
    localStorage.setItem('authToken', token)
    localStorage.setItem('schoolId', school._id)
    localStorage.setItem('schoolName', school.schoolName)
    localStorage.setItem('principalName', school.principalName)
    localStorage.setItem('phone', school.phone)
    localStorage.setItem('email', school.adminEmail)
    localStorage.setItem('city', school.city)
    localStorage.setItem('plan', school.plan)
    try {
      setPwaEntry('admin', school._id)
      applyPwaManifest(school._id, 'admin')
    } catch (_) {}
    navigate('/dashboard')
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) { setError('Please enter email and password'); return }
    setLoading(true)
    setError('')
    setIsNewUser(false)
    setDevOtpHint('')
    try {
      const res = await axios.post(`${API_BASE_URL}/school/login`, { email, password, deviceId: getOrCreateDeviceId() })
      if (res.data.requiresOtp) {
        setOtpStep(true)
        if (res.data.devOtp) setDevOtpHint(`Dev OTP: ${res.data.devOtp}`)
        setError('')
      } else {
        persistSchoolSession(res.data.token, res.data.school)
      }
    } catch (err) {
      const data = err.response?.data
      const msg = data?.error || 'Login failed'
      if (msg === 'Trial expired! Please subscribe.' && data?.expiryDate) {
        setExpiredInfo(data.expiryDate)
      } else {
        setError(msg)
      }
    }
    setLoading(false)
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (!/^[0-9]{6}$/.test(otpCode)) { setError('Enter the 6-digit code from your email'); return }
    setLoading(true)
    setError('')
    try {
      const res = await axios.post(`${API_BASE_URL}/school/login/verify-otp`, { email, code: otpCode, deviceId: getOrCreateDeviceId(), rememberDevice, deviceLabel: navigator.userAgent?.slice(0, 60) || 'Browser' })
      persistSchoolSession(res.data.token, res.data.school)
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid code')
    }
    setLoading(false)
  }

  const handleGoogle = async (idToken) => {
    setLoading(true)
    setError('')
    try {
      const res = await axios.post(`${API_BASE_URL}/school/auth/google`, { idToken })
      persistSchoolSession(res.data.token, res.data.school)
    } catch (err) {
      setError(err.response?.data?.error || 'Google sign-in failed')
    }
    setLoading(false)
  }

  const loadGoogle = () => {
    setError('')
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) {
      setError('Google Sign-In is not configured (VITE_GOOGLE_CLIENT_ID). Add it in Vercel env and redeploy.')
      return
    }
    const start = () => {
      /* global google */
      if (!window.google?.accounts?.id) {
        setError('Google script failed to load. Check network / ad blockers.')
        return
      }
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response.credential) handleGoogle(response.credential)
        },
      })
      // Official button is more reliable than One Tap prompt()
      const host = googleBtnRef.current
      if (host) {
        host.innerHTML = ''
        window.google.accounts.id.renderButton(host, {
          theme: 'outline',
          size: 'large',
          width: host.offsetWidth || 320,
          text: 'continue_with',
          shape: 'pill',
        })
      }
      try {
        window.google.accounts.id.prompt()
      } catch (_) { /* ignore */ }
    }
    const existing = document.getElementById('google-gsi')
    if (existing) {
      start()
      return
    }
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.id = 'google-gsi'
    s.onload = start
    s.onerror = () => setError('Could not load Google Sign-In script.')
    document.body.appendChild(s)
  }

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        loadGoogle()
      } catch (_) {}
    }, 500)
    return () => clearTimeout(t)
  }, [])



  const formatExpiry = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleString('en-PK', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    })
  }

  return (
    <div className="flex flex-col min-h-screen">
    <div className="flex flex-1 min-h-0">
      {/* LEFT SIDE */}
      <div className="flex-1 flex flex-col justify-center px-16 py-12"
        style={{background: 'linear-gradient(135deg, #075985 0%, #0284c7 50%, #0ea5e9 100%)'}}>
        <div className="flex items-center gap-4 mb-12">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)'}}>
            🎓
          </div>
          <div>
            <div className="text-white font-bold text-xl" style={{fontFamily: 'Syne, sans-serif'}}>
              Synapse <span className="font-normal opacity-80">EduCore</span>
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'rgba(186,230,253,0.95)' }}>
              Time is your real money.
            </div>
          </div>
        </div>

        <h1 className="text-white font-bold text-4xl leading-tight mb-4"
          style={{fontFamily: 'Syne, sans-serif'}}>
          Pakistan's Most Secure School Platform
        </h1>
        <p className="text-white opacity-75 text-base leading-relaxed mb-10 max-w-sm">
          Manage students, attendance, fees & parent community — built for schools in 2026.
        </p>

        <div className="flex flex-col gap-3">
          {[
            {icon: '🔐', text: 'Secure login · Email verification & encrypted sessions'},
            {icon: '🏫', text: 'Multi-School Isolation — Each school sees only its own data'},
            {icon: '📊', text: 'Real-time Attendance & Analytics'},
            {icon: '🌐', text: 'International-Standard Infrastructure'},
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)'}}>
              <span className="text-xl">{f.icon}</span>
              <p className="text-white text-sm opacity-90">{f.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="w-[480px] flex items-center justify-center px-12 bg-white">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold mb-1" style={{fontFamily: 'Syne, sans-serif'}}>
            Welcome Back
          </h2>
          <p className="text-slate-500 text-sm mb-8">
            Sign in with your school's registered email
          </p>

          {error && (
            <div className="px-4 py-3 rounded-xl text-sm mb-4"
              style={{background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca'}}>
              {error}
              {isNewUser && (
                <button onClick={() => navigate('/register')}
                  className="block mt-2 font-bold underline">
                  → Register your school here
                </button>
              )}
            </div>
          )}

          <form onSubmit={otpStep ? handleVerifyOtp : handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">SCHOOL EMAIL</label>
              <input
                type="email"
                placeholder="principal@yourschool.edu.pk"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-sky-500 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">PASSWORD</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-sky-500 transition-all"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-3">
                  {showPass ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            {otpStep && (
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">EMAIL VERIFICATION CODE</label>
                <input
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6-digit code"
                  inputMode="numeric"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-sky-500"
                />
                {devOtpHint && <p className="text-xs text-amber-600 mt-1">{devOtpHint}</p>}
                <button type="button" className="text-xs text-sky-600 mt-2" onClick={() => { setOtpStep(false); setOtpCode(''); setDevOtpHint('') }}>
                  ← Back to password
              <label className="flex items-center gap-2 text-sm text-slate-600 mt-3 cursor-pointer">
                <input type="checkbox" checked={rememberDevice} onChange={e => setRememberDevice(e.target.checked)} className="rounded border-slate-300" />
                Remember this device for 30 days (skip email code next time)
              </label>

                </button>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90"
              style={{background:'#0284c7', fontFamily:'Syne,sans-serif'}}>
              {loading ? 'Please wait...' : (otpStep ? 'Verify & Sign In →' : 'Sign In to EduCore →')}
            </button>
          </form>
        <PwaInstallBanner />


          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
            <div className="relative flex justify-center text-xs"><span className="px-2 bg-white text-slate-400">Or</span></div>
          </div>
          <div ref={googleBtnRef} className="w-full min-h-[44px] flex justify-center" />
          <button
            type="button"
            onClick={loadGoogle}
            disabled={loading}
            className="w-full text-xs text-slate-400 mt-1 underline-offset-2 hover:underline"
          >
            Google button not showing? Tap here to load
          </button>
          <p className="text-xs text-center text-slate-400 mt-2">Email verification (OTP) may be required after password sign-in when enabled by the platform.</p>

          <div className="text-center mt-4">
            <span className="text-sm text-slate-500">New school? </span>
            <button onClick={() => navigate('/register')}
              className="text-sm font-bold"
              style={{color:'#0284c7'}}>
              Register here →
            </button>
          </div>

          <p className="text-center text-slate-400 text-xs mt-6">
            By signing in, you agree to our{' '}
            <Link to="/terms" className="underline hover:text-sky-600">Terms</Link>
            {' '}&{' '}
            <Link to="/privacy" className="underline hover:text-sky-600">Privacy Policy</Link>.
          </p>

        </div>
      </div>

      {/* TRIAL EXPIRED MODAL */}
      {expiredInfo && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
          style={{background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)'}}>
          <div className="bg-white rounded-3xl p-10 w-full max-w-md text-center"
            style={{boxShadow:'0 20px 60px rgba(2,132,199,0.18), 0 8px 24px rgba(15,23,42,0.08)'}}>
            <div className="text-5xl mb-4">🔒</div>
            <h2 className="font-bold text-2xl mb-2" style={{fontFamily:'Syne,sans-serif'}}>
              Trial Period Ended
            </h2>
            <p className="text-sm mb-6" style={{color:'#475569', lineHeight:'1.6'}}>
              Your free trial ended on <strong>{formatExpiry(expiredInfo)}</strong>.
              <br/>Please subscribe to a plan to continue using Synapse EduCore.
            </p>

            <div className="text-left rounded-xl p-5 mb-6" style={{background:'#f0f9ff', border:'1px solid #bae6fd'}}>
              <div className="font-bold text-sm mb-3">💳 Payment Details</div>
              <div className="text-sm flex flex-col gap-2" style={{color:'#475569'}}>
                <div><strong>JazzCash:</strong> 0300-1234567 (Ahmed Ali)</div>
                <div><strong>EasyPaisa:</strong> 0311-7654321 (Ahmed Ali)</div>
                <div><strong>Bank Account:</strong> HBL - 1234-5678-9012 (Ahmed Ali)</div>
                <div><strong>Support Team:</strong> +92-333-9876543 (EduCore Support)</div>
              </div>
            </div>

            <button onClick={() => setExpiredInfo(null)}
              className="w-full py-3 rounded-xl text-white font-bold text-sm"
              style={{background:'#0284c7', fontFamily:'Syne,sans-serif'}}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
    <SiteFooter variant="dark" />
    </div>
  )
}