import { useState, useEffect } from 'react'
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
  const [otpStep, setOtpStep] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [devOtpHint, setDevOtpHint] = useState('')
  const [trialBanner, setTrialBanner] = useState({ days: 30, students: 100 })

  useEffect(() => {
    axios.get(`${API_BASE_URL}/pricing`).then((res) => {
      const p = res.data?.pricing || {}
      const cat = res.data?.catalog || {}
      setTrialBanner({
        days: Number(cat.trialDays || p.trialDays) || 30,
        students: Number(cat.studentLimitTrial || p.studentLimitTrial) || 100,
      })
    }).catch(() => {})
  }, [])
  const navigate = useNavigate()

  const handle = (e) => setForm({...form, [e.target.name]: e.target.value})

  const saveSession = (token, school) => {
    localStorage.setItem('authToken', token)
    localStorage.setItem('schoolId', school._id)
    localStorage.setItem('schoolName', school.schoolName || form.schoolName)
    localStorage.setItem('principalName', school.principalName || form.principalName)
    localStorage.setItem('phone', school.phone || form.phone)
    localStorage.setItem('email', school.adminEmail || form.email)
    localStorage.setItem('city', school.city || form.city)
    localStorage.setItem('address', form.address)
    localStorage.setItem('plan', school.plan || 'free_trial')
    navigate('/dashboard')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (otpStep) {
      if (!/^[0-9]{6}$/.test(otpCode)) { setError('Enter the 6-digit code from your email'); return }
      setLoading(true)
      setError('')
      try {
        const res = await axios.post(`${API_BASE_URL}/school/register/verify-otp`, {
          email: form.email, code: otpCode
        })
        saveSession(res.data.token, res.data.school)
      } catch (err) {
        setError(err.response?.data?.error || 'Invalid code')
      }
      setLoading(false)
      return
    }
    if (!form.schoolName || !form.principalName || !form.phone || !form.email || !form.password) {
      setError('Please fill all required fields'); return
    }
    if (!form.email.includes('@') || !form.email.includes('.')) {
      setError('Please enter a valid email!'); return
    }
    if (!/^[0-9+\-\s]{10,15}$/.test(form.phone)) {
      setError('Please enter a valid phone! Example: +92-300-1234567'); return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters'); return
    }
    setLoading(true)
    setError('')
    setDevOtpHint('')
    try {
      const res = await axios.post(`${API_BASE_URL}/school/register/request-otp`, form)
      if (res.data.requiresOtp) {
        setOtpStep(true)
        if (res.data.devOtp) setDevOtpHint(`Dev OTP: ${res.data.devOtp}`)
      } else if (res.data.token) {
        saveSession(res.data.token, res.data.school)
      }
    } catch (err) {
      // Fallback: if OTP endpoints fail with 404, try legacy register once
      const msg = err.response?.data?.error || 'Registration failed. Try again.'
      if (err.response?.status === 404) {
        try {
          const res2 = await axios.post(`${API_BASE_URL}/school/register-school`, form)
          if (res2.data.requiresOtp) {
            setOtpStep(true)
            if (res2.data.devOtp) setDevOtpHint(`Dev OTP: ${res2.data.devOtp}`)
          } else {
            saveSession(res2.data.token, res2.data.school)
          }
        } catch (err2) {
          setError(err2.response?.data?.error || msg)
        }
      } else {
        setError(msg)
      }
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
            <div className="text-white font-bold text-sm">Free Trial: {trialBanner.days} Days</div>
            <div className="text-white text-xs opacity-80">Up to {trialBanner.students} students · Then choose a paid plan</div>
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

          {otpStep && (
            <div className="col-span-2 mt-2">
              <label className="text-xs font-semibold text-slate-500 mb-1 block">EMAIL VERIFICATION CODE</label>
              <input
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit code from your email"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-indigo-500"
              />
              {devOtpHint && <p className="text-xs text-amber-600 mt-1">{devOtpHint}</p>}
              <button type="button" className="text-xs text-indigo-600 mt-2" onClick={() => { setOtpStep(false); setOtpCode('') }}>
                ← Edit registration details
              </button>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 mt-2"
            style={{background:'#4f46e5', fontFamily:'Syne,sans-serif'}}>
            {loading ? 'Please wait...' : (otpStep ? 'Verify email & create account' : `Start ${trialBanner.days}-Day Free Trial 🚀`)}
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
