import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import API_BASE_URL from '../config/api'

export default function Register() {
  const [form, setForm] = useState({
    schoolName: '', principalName: '', phone: '',
    email: '', password: '', address: '', city: '', totalStudents: ''
  })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handle = (e) => setForm({...form, [e.target.name]: e.target.value})

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.schoolName || !form.principalName || !form.phone || !form.email || !form.password) {
      setError('Please fill all required fields'); return
    }
    if (!form.email.includes('@') || !form.email.includes('.')) {
      setError('Please enter a valid email!'); return
    }
    if (!/^[0-9+\-\s]{10,15}$/.test(form.phone)) {
      setError('Please enter a valid phone! Example: +92-300-1234567'); return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters'); return
    }
    setLoading(true)
    setError('')
    try {
      const res = await axios.post(`${API_BASE_URL}/register-school`, form)
      localStorage.setItem('schoolId', res.data.school._id)
      localStorage.setItem('schoolName', form.schoolName)
      localStorage.setItem('principalName', form.principalName)
      localStorage.setItem('phone', form.phone)
      localStorage.setItem('email', form.email)
      localStorage.setItem('city', form.city)
      localStorage.setItem('address', form.address)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Try again.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{background: 'linear-gradient(135deg, #3730a3 0%, #4f46e5 100%)'}}>
      <div className="bg-white rounded-2xl p-10 w-full max-w-xl shadow-2xl">

        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🏫</span>
          <h2 className="text-2xl font-bold" style={{fontFamily:'Syne,sans-serif'}}>
            Register Your School
          </h2>
        </div>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          Please provide your school's official details.
        </p>

        <div className="flex items-center gap-3 p-4 rounded-xl mb-6"
          style={{background:'linear-gradient(135deg,#f59e0b,#ef4444)'}}>
          <span className="text-2xl">⏳</span>
          <div>
            <div className="text-white font-bold text-sm">Free Trial: 30 Days</div>
            <div className="text-white text-xs opacity-80">Up to 100 students · Limited features</div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">SCHOOL NAME *</label>
              <input name="schoolName" onChange={handle}
                placeholder="Al-Noor Public School"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-indigo-500 transition-all"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">PRINCIPAL NAME *</label>
              <input name="principalName" onChange={handle}
                placeholder="Mr. Ahmed Khan"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-indigo-500 transition-all"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">PHONE *</label>
              <input name="phone" onChange={handle}
                placeholder="+92-300-0000000"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-indigo-500 transition-all"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">OFFICIAL EMAIL *</label>
              <input name="email" type="email" onChange={handle}
                placeholder="principal@school.pk"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-indigo-500 transition-all"/>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-500 mb-1 block">PASSWORD *</label>
              <div className="relative">
                <input name="password" type={showPass ? 'text' : 'password'} onChange={handle}
                  placeholder="Min 6 characters"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-indigo-500 transition-all"/>
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
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">CITY</label>
              <input name="city" onChange={handle}
                placeholder="Karachi"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-indigo-500 transition-all"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">TOTAL STUDENTS</label>
              <input name="totalStudents" type="number" onChange={handle}
                placeholder="500"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-indigo-500 transition-all"/>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-500 mb-1 block">ADDRESS</label>
              <input name="address" onChange={handle}
                placeholder="Block 5, Gulshan-e-Iqbal, Karachi"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-indigo-500 transition-all"/>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 mt-2"
            style={{background:'#4f46e5', fontFamily:'Syne,sans-serif'}}>
            {loading ? 'Registering...' : 'Start 30-Day Free Trial 🚀'}
          </button>

          <div className="text-center">
            <span className="text-sm text-slate-500">Already registered? </span>
            <button type="button" onClick={() => navigate('/')}
              className="text-sm font-bold"
              style={{color:'#4f46e5'}}>
              Login here →
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}