import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import API_BASE_URL from '../config/api'

export default function ParentRegister() {
  const { schoolId } = useParams()
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1 = roll+phone check, 2 = name (if new) + password
  const [checking, setChecking] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [accountExists, setAccountExists] = useState(false)
  const [studentName, setStudentName] = useState('')

  const [form, setForm] = useState({ rollNumber: '', phone: '', name: '', password: '' })
  const handle = e => setForm({ ...form, [e.target.name]: e.target.value })

  const handleCheck = async e => {
    e.preventDefault()
    if (!form.rollNumber || !form.phone) { setError('Please fill roll number and phone'); return }
    setChecking(true)
    setError('')
    try {
      const res = await axios.post(`${API_BASE_URL}/parent/register/check`, {
        schoolId, rollNumber: form.rollNumber, phone: form.phone
      })
      setAccountExists(res.data.accountExists)
      setStudentName(res.data.studentName)
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.error || 'Could not verify those details')
    }
    setChecking(false)
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!accountExists && !form.name) { setError('Please enter your name'); return }
    if (!form.password || form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await axios.post(`${API_BASE_URL}/parent/register`, { ...form, schoolId })
      localStorage.setItem('parentAuthToken', res.data.token)
      localStorage.setItem('parentSchoolId', schoolId)
      localStorage.setItem('parentName', res.data.parent.name)
      navigate('/parent/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed')
    }
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#f8fafc' }}>
      <div className="w-full max-w-sm bg-white rounded-2xl p-8" style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl text-white" style={{ background: '#4f46e5' }}>🎓</div>
          <div className="font-bold text-lg" style={{ fontFamily: 'Syne, sans-serif' }}>V Community</div>
        </div>

        <h2 className="text-xl font-bold mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>
          {step === 1 ? "Find Your Child's Record" : accountExists ? 'Link This Child' : 'Create Your Account'}
        </h2>
        <p className="text-slate-500 text-sm mb-6">
          {step === 1
            ? "Use the roll number and phone number your child's school already has on file."
            : accountExists
              ? `${studentName} will be linked to your existing V Community account.`
              : `Welcome! Setting up your account for ${studentName}.`}
        </p>

        {error && (
          <div className="px-4 py-3 rounded-xl text-sm mb-4" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleCheck} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">STUDENT ROLL NUMBER</label>
              <input name="rollNumber" value={form.rollNumber} onChange={handle}
                placeholder="e.g. 102"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-indigo-500 transition-all" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">PHONE NUMBER ON FILE</label>
              <input name="phone" value={form.phone} onChange={handle}
                placeholder="03xx-xxxxxxx"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-indigo-500 transition-all" />
              <p className="text-xs text-slate-400 mt-1">Must match the number the school registered for your child.</p>
            </div>
            <button type="submit" disabled={checking}
              className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: '#4f46e5', fontFamily: 'Syne,sans-serif' }}>
              {checking ? 'Checking...' : 'Continue →'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!accountExists && (
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">YOUR NAME</label>
                <input name="name" value={form.name} onChange={handle}
                  placeholder="Parent / Guardian name"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-indigo-500 transition-all" />
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">
                {accountExists ? 'YOUR EXISTING PASSWORD' : 'CHOOSE A PASSWORD'}
              </label>
              <input type="password" name="password" value={form.password} onChange={handle}
                placeholder={accountExists ? 'Enter your account password' : 'At least 6 characters'}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-indigo-500 transition-all" />
              {accountExists && (
                <p className="text-xs text-slate-400 mt-1">
                  You already have an account on this phone number. Enter that account's password — not a new one — to add this child to it.
                </p>
              )}
            </div>
            <button type="submit" disabled={submitting}
              className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: '#4f46e5', fontFamily: 'Syne,sans-serif' }}>
              {submitting ? 'Please wait...' : accountExists ? 'Link Child →' : 'Create Account →'}
            </button>
            <button type="button" onClick={() => { setStep(1); setError('') }} className="text-xs text-slate-400">
              ← Back
            </button>
          </form>
        )}

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
