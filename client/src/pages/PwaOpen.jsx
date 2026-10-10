import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getPwaEntry } from '../utils/pwaEntry'

/**
 * PWA start_url (/open) — role isolated.
 * School admin session → /admin/v-community (chat only), not full ERP.
 */
export default function PwaOpen() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [hint, setHint] = useState('')

  useEffect(() => {
    if (localStorage.getItem('parentAuthToken')) {
      navigate('/parent/dashboard', { replace: true })
      return
    }
    if (localStorage.getItem('teacherAuthToken')) {
      navigate('/teacher/dashboard', { replace: true })
      return
    }
    if (localStorage.getItem('authToken') && localStorage.getItem('schoolId')) {
      navigate('/admin/v-community', { replace: true })
      return
    }

    const entry = getPwaEntry()
    if (entry?.role === 'parent' && entry.schoolId) {
      navigate(`/community/${entry.schoolId}/login?role=parent`, { replace: true })
      return
    }
    if (entry?.role === 'teacher' && entry.schoolId) {
      navigate(`/community/${entry.schoolId}/login?role=teacher`, { replace: true })
      return
    }
    if (entry?.role === 'admin') {
      navigate('/?admin=1', { replace: true })
      return
    }

    // Unknown install — do not show combined parent/teacher UI
    setHint('Open the invite link your school sent (parent, teacher, or admin), then install the app from that page.')
  }, [navigate, params])

  if (!hint) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center text-sm text-slate-500">
        Opening…
      </div>
    )
  }

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(160deg, #eef2ff 0%, #f8fafc 50%, #f1f5f9 100%)' }}
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-6 sm:p-8 text-center">
        <img src="/pwa-icon-192.png" alt="" className="w-14 h-14 rounded-2xl object-cover mx-auto mb-4" />
        <div className="font-bold text-lg mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>V-Community</div>
        <p className="text-sm text-slate-500 mb-4">{hint}</p>
        <a href="/" className="text-sm font-bold" style={{ color: '#4f46e5' }}>School admin website login →</a>
      </div>
    </div>
  )
}
