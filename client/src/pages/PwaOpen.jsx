import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

/**
 * PWA entry (/open) — production launcher.
 * 1) Existing session → correct dashboard
 * 2) Else → School admin vs Parent/Teacher (V-Community), school code if needed
 */
export default function PwaOpen() {
  const navigate = useNavigate()
  const [schoolCode, setSchoolCode] = useState(() => {
    try {
      return (
        localStorage.getItem('lastCommunitySchoolId') ||
        localStorage.getItem('parentSchoolId') ||
        localStorage.getItem('teacherSchoolId') ||
        ''
      )
    } catch {
      return ''
    }
  })
  const [error, setError] = useState('')

  useEffect(() => {
    // Auto-route logged-in users
    if (localStorage.getItem('parentAuthToken')) {
      navigate('/parent/dashboard', { replace: true })
      return
    }
    if (localStorage.getItem('teacherAuthToken')) {
      navigate('/teacher/dashboard', { replace: true })
      return
    }
    if (localStorage.getItem('authToken') && localStorage.getItem('schoolId')) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])

  const goCommunity = (pathSuffix) => {
    const id = String(schoolCode || '').trim()
    if (!id || id.length < 10) {
      setError('Enter your school community code (from the link your school shared).')
      return
    }
    try {
      localStorage.setItem('lastCommunitySchoolId', id)
    } catch (_) {}
    navigate(`/community/${id}/${pathSuffix}`)
  }

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(160deg, #eef2ff 0%, #f8fafc 50%, #f1f5f9 100%)' }}
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <img src="/pwa-icon-192.png" alt="" className="w-12 h-12 rounded-2xl object-cover" />
          <div>
            <div className="font-bold text-lg" style={{ fontFamily: 'Syne, sans-serif' }}>
              Vends EduCore
            </div>
            <div className="text-xs text-slate-500">Choose how you sign in</div>
          </div>
        </div>

        {/* V-Community block */}
        <div className="mb-6">
          <div className="text-xs font-bold text-indigo-600 mb-2 tracking-wide">V-COMMUNITY</div>
          <p className="text-sm text-slate-500 mb-3">
            Use the school code from the invite link your school sent you (parents and teachers get different links).
          </p>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">SCHOOL COMMUNITY CODE</label>
          <input
            value={schoolCode}
            onChange={(e) => {
              setSchoolCode(e.target.value)
              setError('')
            }}
            placeholder="Paste school ID from invite link"
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm outline-none focus:border-indigo-500 mb-2"
          />
          {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
          <button
            type="button"
            onClick={() => goCommunity('login')}
            className="w-full py-3.5 rounded-xl text-white text-sm font-bold mb-2"
            style={{ background: '#4f46e5' }}
          >
            Parent / Teacher — Sign in
          </button>
          <button
            type="button"
            onClick={() => goCommunity('register')}
            className="w-full py-3 rounded-xl text-sm font-bold border-2 border-slate-200 text-slate-700"
          >
            Create Parent / Teacher account
          </button>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            Invite link looks like: …/community/<strong>SCHOOL_ID</strong>/login — copy the SCHOOL_ID part only.
          </p>
        </div>

        {/* Soft fallback — primary entry is role-specific invite links from school */}
        <p className="text-center text-[11px] text-slate-400 mt-2">
          School office staff?{' '}
          <Link to="/?admin=1" className="underline font-semibold text-slate-500">
            Email login
          </Link>
        </p>
      </div>
    </div>
  )
}
