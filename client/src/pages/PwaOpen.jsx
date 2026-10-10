import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPwaEntry } from '../utils/pwaEntry'

/**
 * PWA start_url entry — role isolated.
 * School admin → mobile V-Community only (not full ERP dashboard).
 */
export default function PwaOpen() {
  const navigate = useNavigate()
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
    // School session → admin chat app (not full website dashboard)
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

    setHint('Open the invite link your school sent you, then install the app from that page.')
  }, [navigate])

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
        <div className="font-bold text-lg mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
          V-Community
        </div>
        <p className="text-sm text-slate-500 mb-4">{hint}</p>
        <p className="text-xs text-slate-400 leading-relaxed">
          Parents use the parent portal link. Teachers use the teacher portal link.
          School office: log in, open Admin V-Community, then Install app.
        </p>
      </div>
    </div>
  )
}
