import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import API_BASE_URL from '../config/api'

export default function CommunityLogin() {
  const { schoolId } = useParams()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!phone || !password) { setError('Please enter your phone number and password'); return }
    setLoading(true)
    setError('')
    try {
      const res = await axios.post(`${API_BASE_URL}/community/login`, { schoolId, phone, password })
      const { role, token, account } = res.data
      if (role === 'parent') {
        localStorage.setItem('parentAuthToken', token)
        localStorage.setItem('parentSchoolId', schoolId)
        localStorage.setItem('parentName', account.name)
        navigate('/parent/dashboard')
      } else {
        localStorage.setItem('teacherAuthToken', token)
        localStorage.setItem('teacherSchoolId', schoolId)
        localStorage.setItem('teacherName', account.name)
        navigate('/teacher/dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#f8fafc' }}>
      <div className="w-full max-w-sm bg-white rounded-2xl p-8" style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl text-white" style={{ background: '#4f46e5' }}>🎓</div>
          <div className="font-bold text-lg" style={{ fontFamily: 'Syne, sans-serif' }}>V Community</div>
        </div>

        <h2 className="text-xl font-bold mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>Welcome Back</h2>
        <p className="text-slate-500 text-sm mb-6">For parents and teachers — one account, all your school updates</p>

        {error && (
          <div className="px-4 py-3 rounded-xl text-sm mb-4" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">PHONE NUMBER</label>
            <input
              type="text"
              placeholder="03xx-xxxxxxx"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-indigo-500 transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">PASSWORD</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-indigo-500 transition-all"
            />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 disabled:opacity-60"
            style={{ background: '#4f46e5', fontFamily: 'Syne,sans-serif' }}>
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>

        <div className="text-center mt-4">
          <span className="text-sm text-slate-500">First time here? </span>
          <Link to={`/community/${schoolId}/register`} className="text-sm font-bold" style={{ color: '#4f46e5' }}>
            Create account →
          </Link>
        </div>
      </div>
    </div>
  )
}
