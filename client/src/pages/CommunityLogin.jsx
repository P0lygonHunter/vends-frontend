import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import axios from 'axios'
import API_BASE_URL from '../config/api'

export default function CommunityLogin() {
  const { schoolId } = useParams()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!phone || !password) {
      setError('Please enter your phone number and password')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await axios.post(`${API_BASE_URL}/community/login`, { schoolId, phone, password })
      const { role, token, account } = res.data
      if (role === 'parent') {
        localStorage.setItem('parentAuthToken', token)
        localStorage.setItem('parentSchoolId', schoolId)
        localStorage.setItem('parentName', account.name || 'Parent')
        localStorage.setItem('parentPhoto', account.photo || '')
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
        navigate('/parent/dashboard')
      } else {
        localStorage.setItem('teacherAuthToken', token)
        localStorage.setItem('teacherSchoolId', schoolId)
        localStorage.setItem('teacherName', account.name || 'Teacher')
        localStorage.setItem('teacherPhoto', account.photo || '')
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
        navigate('/teacher/dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your phone and password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#f8fafc' }}>
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: '#4f46e5' }}>
            🎓
          </div>
          <div>
            <div className="font-bold text-lg" style={{ fontFamily: 'Syne, sans-serif' }}>V Community</div>
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>Welcome Back</h1>
        <p className="text-sm text-slate-500 mb-6">For parents and teachers — one account, all your school updates</p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
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
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-indigo-500 transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">PASSWORD</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-indigo-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 disabled:opacity-60"
            style={{ background: '#4f46e5', fontFamily: 'Syne,sans-serif' }}
          >
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
