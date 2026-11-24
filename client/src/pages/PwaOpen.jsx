import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getPwaEntry } from '../utils/pwaEntry'
import PwaInstallBanner from '../components/PwaInstallBanner'

function isDesktopViewport() {
  try {
    return window.matchMedia('(min-width: 768px)').matches
  } catch {
    return false
  }
}

function lastSchoolId() {
  return (
    localStorage.getItem('lastCommunitySchoolId') ||
    localStorage.getItem('seCommunitySchoolId') ||
    localStorage.getItem('parentSchoolId') ||
    localStorage.getItem('teacherSchoolId') ||
    localStorage.getItem('schoolId') ||
    ''
  )
}

/**
 * PWA start_url (/open) — role isolated.
 * After logout, still route to the school's community login (not a dead-end card).
 */
export default function PwaOpen() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [hint, setHint] = useState('')
  const [schoolId, setSchoolId] = useState('')

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
      if (isDesktopViewport()) {
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/admin/v-community', { replace: true })
      }
      return
    }

    const entry = getPwaEntry()
    const sid =
      (entry?.schoolId && String(entry.schoolId)) ||
      lastSchoolId() ||
      (params.get('schoolId') || '')

    if (entry?.role === 'parent' && sid) {
      navigate(`/community/${sid}/login?role=parent`, { replace: true })
      return
    }
    if (entry?.role === 'teacher' && sid) {
      navigate(`/community/${sid}/login?role=teacher`, { replace: true })
      return
    }
    if (entry?.role === 'admin') {
      navigate('/', { replace: true })
      return
    }

    // Logged out but we still know the school — go to community login (pick role on page)
    if (sid) {
      navigate(`/community/${sid}/login`, { replace: true })
      return
    }

    setSchoolId('')
    setHint(
      'Open the invite link your school sent (parent or teacher), then install the app from that page. After logout, open the same invite link once so this app remembers your school.'
    )
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
      style={{ background: 'linear-gradient(160deg, #e0f2fe 0%, #f8fafc 50%, #f1f5f9 100%)' }}
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-6 sm:p-8 text-center">
        <img src="/pwa-icon-192.png" alt="" className="w-14 h-14 rounded-2xl object-cover mx-auto mb-4" />
        <div className="font-bold text-lg mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
          SE Community
        </div>
        <p className="text-sm text-slate-500 mb-4">{hint}</p>
        <PwaInstallBanner />
        <Link to="/" className="text-sm font-bold" style={{ color: '#0284c7' }}>
          School admin website login →
        </Link>
      </div>
    </div>
  )
}
