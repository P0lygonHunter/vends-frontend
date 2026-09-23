import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import API_BASE_URL from '../config/api'

export default function TeacherRegister() {
  const { schoolId } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', phone: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = e => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.name || !form.phone || !form.password) { setError('Please fill all fields'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    setError('')
    try {
      const res = await axios.post(`${API_BASE_URL}/teacher-portal/register`, { ...form, schoolId })
      localStorage.setItem('teacherAuthToken', res.data.token)
      localStorage.setItem('teacherSchoolId', schoolId)
      localStorage.setItem('teacherName', res.data.teacher.name)
      navigate('/teacher/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed')
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

        <h2 className="text-xl font-bold mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>Teacher Account</h2>
        <p className="text-slate-500 text-sm mb-6">
          Use your name and phone number exactly as the school has them on file.
        </p>

        {error && (
          <div className="px-4 py-3 rounded-xl text-sm mb-4" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">YOUR NAME (AS ON SCHOOL RECORD)</label>
            <input name="name" value={form.name} onChange={handle}
              placeholder="Full name"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-indigo-500 transition-all" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">PHONE NUMBER ON FILE</label>
            <input name="phone" value={form.phone} onChange={handle}
              placeholder="03xx-xxxxxxx"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-indigo-500 transition-all" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">CHOOSE A PASSWORD</label>
            <input type="password" name="password" value={form.password} onChange={handle}
              placeholder="At least 6 characters"
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-indigo-500 transition-all" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 disabled:opacity-60"
            style={{ background: '#4f46e5', fontFamily: 'Syne,sans-serif' }}>
            {loading ? 'Creating account...' : 'Create Account →'}
          </button>
        </form>

        <div className="text-center mt-4">
          <span className="text-sm text-slate-500">Already have an account? </span>
          <Link to={`/community/${schoolId}/login`} className="text-sm font-bold" style={{ color: '#4f46e5' }}>
            Sign in →
          </Link>
        </div>
      </div>
    </div>
  )
}
