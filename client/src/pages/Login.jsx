import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isNewUser, setIsNewUser] = useState(false)
  const [expiredInfo, setExpiredInfo] = useState(null)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) { setError('Please enter email and password'); return }
    setLoading(true)
    setError('')
    setIsNewUser(false)
    try {
      const res = await axios.post('https://vends-backend.vercel.app/api/school/login', { email, password })
      const school = res.data.school
      localStorage.setItem('schoolId', school._id)
      localStorage.setItem('schoolName', school.schoolName)
      localStorage.setItem('principalName', school.principalName)
      localStorage.setItem('phone', school.phone)
      localStorage.setItem('email', school.adminEmail)
      localStorage.setItem('city', school.city)
      localStorage.setItem('plan', school.plan)
      navigate('/dashboard')
    } catch (err) {
      const data = err.response?.data
      const msg = data?.error || 'Login failed'

      if (msg === 'School not found!') {
        setIsNewUser(true)
        setError('School not found! Please register first.')
      } else if (msg === 'Trial expired! Please subscribe.' && data?.expiryDate) {
        setExpiredInfo(data.expiryDate)
      } else {
        setError(msg)
      }
    }
    setLoading(false)
  }

  const formatExpiry = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleString('en-PK', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    })
  }

  return (
    <div className="flex min-h-screen">
      {/* LEFT SIDE */}
      <div className="flex-1 flex flex-col justify-center px-16 py-12"
        style={{background: 'linear-gradient(135deg, #3730a3 0%, #4f46e5 50%, #6366f1 100%)'}}>
        <div className="flex items-center gap-4 mb-12">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)'}}>
            🎓
          </div>
          <div>
            <div className="text-white font-bold text-xl" style={{fontFamily: 'Syne, sans-serif'}}>
              Vends <span className="font-normal opacity-80">EduCore</span>
            </div>
          </div>
        </div>

        <h1 className="text-white font-bold text-4xl leading-tight mb-4"
          style={{fontFamily: 'Syne, sans-serif'}}>
          Pakistan's Most Secure School Platform
        </h1>
        <p className="text-white opacity-75 text-base leading-relaxed mb-10 max-w-sm">
          Manage students, attendance & teachers with enterprise-grade ZK-Circuit security — built for 2026.
        </p>

        <div className="flex flex-col gap-3">
          {[
            {icon: '🔐', text: 'ZK-Circuit Protocol Security'},
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

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">SCHOOL EMAIL</label>
              <input
                type="email"
                placeholder="principal@yourschool.edu.pk"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-indigo-500 transition-all"
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
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-indigo-500 transition-all"
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
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90"
              style={{background:'#4f46e5', fontFamily:'Syne,sans-serif'}}>
              {loading ? 'Signing in...' : 'Sign In to EduCore →'}
            </button>
          </form>

          <div className="text-center mt-4">
            <span className="text-sm text-slate-500">New school? </span>
            <button onClick={() => navigate('/register')}
              className="text-sm font-bold"
              style={{color:'#4f46e5'}}>
              Register here →
            </button>
          </div>

          <p className="text-center text-slate-400 text-xs mt-6">
            By signing in, you agree to our Terms & Privacy Policy.
          </p>

          <div className="text-center mt-4">
            <span onClick={() => navigate('/ceo/login')}
              className="text-xs cursor-pointer"
              style={{color:'rgba(0,0,0,0.2)'}}>
              Platform Admin Access
            </span>
          </div>
        </div>
      </div>

      {/* TRIAL EXPIRED MODAL */}
      {expiredInfo && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
          style={{background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)'}}>
          <div className="bg-white rounded-3xl p-10 w-full max-w-md text-center"
            style={{boxShadow:'0 24px 80px rgba(0,0,0,0.3)'}}>
            <div className="text-5xl mb-4">🔒</div>
            <h2 className="font-bold text-2xl mb-2" style={{fontFamily:'Syne,sans-serif'}}>
              Trial Period Ended
            </h2>
            <p className="text-sm mb-6" style={{color:'#475569', lineHeight:'1.6'}}>
              Your free trial ended on <strong>{formatExpiry(expiredInfo)}</strong>.
              <br/>Please subscribe to a plan to continue using Vends EduCore.
            </p>

            <div className="text-left rounded-xl p-5 mb-6" style={{background:'#f8fafc', border:'1px solid #e2e8f0'}}>
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
              style={{background:'#4f46e5', fontFamily:'Syne,sans-serif'}}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}