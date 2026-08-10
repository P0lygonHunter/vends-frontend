import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function CEOLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleLogin = (e) => {
    e.preventDefault()
    if (!email || !password) { setError('Please enter credentials'); return }
    if (email === 'ceo@vendseducore.pk' && password === 'Vends@CEO2026') {
      localStorage.setItem('ceoLoggedIn', 'true')
      navigate('/ceo/dashboard')
    } else {
      setError('Wrong credentials! Access denied.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{background:'linear-gradient(135deg,#0f0c29,#1e1b4b,#24243e)'}}>
      <div className="w-full max-w-sm px-6">

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-5"
            style={{background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', color:'#f87171'}}>
            🔴 RESTRICTED ACCESS
          </div>
          <div className="text-5xl mb-3">🛡️</div>
          <h2 className="text-white font-bold text-2xl mb-2" style={{fontFamily:'Syne,sans-serif'}}>
            Vends EduCore
          </h2>
          <p className="text-xs" style={{color:'rgba(255,255,255,0.4)'}}>
            Super Admin Portal — CEO Only
          </p>
        </div>

        <div className="rounded-2xl p-8"
          style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', backdropFilter:'blur(10px)'}}>

          {error && (
            <div className="px-4 py-3 rounded-xl text-sm mb-4 font-medium"
              style={{background:'rgba(239,68,68,0.15)', color:'#f87171', border:'1px solid rgba(239,68,68,0.3)'}}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold mb-2 block"
                style={{color:'rgba(255,255,255,0.5)', letterSpacing:'0.5px'}}>
                CEO EMAIL
              </label>
              <input
                type="email"
                placeholder="ceo@login.pk"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none text-white"
                style={{background:'rgba(255,255,255,0.08)', border:'1.5px solid rgba(255,255,255,0.15)'}}/>
            </div>
            <div>
              <label className="text-xs font-bold mb-2 block"
                style={{color:'rgba(255,255,255,0.5)', letterSpacing:'0.5px'}}>
                SECRET PASSWORD
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none text-white"
                  style={{background:'rgba(255,255,255,0.08)', border:'1.5px solid rgba(255,255,255,0.15)'}}/>
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-3 text-lg">
                  {showPass ? (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
) : (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
)}
                </button>
              </div>
            </div>
            <button type="submit"
              className="w-full py-3 rounded-xl text-white font-bold text-sm mt-2"
              style={{background:'linear-gradient(135deg,#ef4444,#dc2626)', fontFamily:'Syne,sans-serif'}}>
              🔐 Access CEO Dashboard
            </button>
          </form>

          <p className="text-center mt-4 text-xs" style={{color:'rgba(255,255,255,0.25)'}}>
            Unauthorized access is strictly prohibited.<br/>All login attempts are logged.
          </p>
        </div>

        <div className="text-center mt-5">
          <span onClick={() => navigate('/')}
            className="text-xs cursor-pointer hover:opacity-60 transition-opacity"
            style={{color:'rgba(255,255,255,0.3)', textDecoration:'underline'}}>
            ← Back to School Login
          </span>
        </div>
      </div>
    </div>
  )
}