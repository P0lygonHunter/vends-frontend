import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getPwaEntry, setPwaEntry } from '../utils/pwaEntry'
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
    setHint('need-school')
  }, [navigate, params])

  const goLogin = (sid, role) => {
    const id = String(sid || '').trim()
    if (!id) return
    try {
      localStorage.setItem('lastCommunitySchoolId', id)
      localStorage.setItem('seCommunitySchoolId', id)
      setPwaEntry(role || 'parent', id)
    } catch (_) {}
    navigate(`/community/${id}/login${role ? `?role=${role}` : ''}`, { replace: true })
  }

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
        <p className="text-sm text-slate-500 mb-4">
          Enter your school ID to open the parent / teacher login. You only need this once after a fresh install — next time logout will return here automatically.
        </p>
        <form
          className="text-left space-y-3 mb-4"
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            goLogin(fd.get('schoolId'), fd.get('role') || 'parent')
          }}
        >
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">School ID</label>
          <input
            name="schoolId"
            defaultValue={schoolId || ''}
            placeholder="Paste school ID from invite link"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-500"
            required
          />
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">I am a</label>
          <select name="role" defaultValue="parent" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
            <option value="parent">Parent</option>
            <option value="teacher">Teacher</option>
          </select>
          <button type="submit" className="w-full py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: '#0284c7' }}>
            Continue to login
          </button>
        </form>
        <PwaInstallBanner />
        <Link to="/" className="text-sm font-bold" style={{ color: '#0284c7' }}>
          School admin website login →
        </Link>
      </div>
    </div>
  )
}
