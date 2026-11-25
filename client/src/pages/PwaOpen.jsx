import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getPwaEntry, setPwaEntry } from '../utils/pwaEntry'
import { applyPwaManifest, parseSchoolIdFromInput } from '../utils/pwa'
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
    ''
  )
}

/**
 * PWA launcher (/open).
 * - Logged in → correct dashboard
 * - Parent/teacher entry + schoolId → that portal login only
 * - Admin entry → school website login (never community)
 * - Recovery: paste invite link (preferred) — parents never need to "know" Mongo id
 */
export default function PwaOpen() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [ready, setReady] = useState(false)
  const [invite, setInvite] = useState('')
  const [role, setRole] = useState('parent')
  const [err, setErr] = useState('')

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
      if (isDesktopViewport()) navigate('/dashboard', { replace: true })
      else navigate('/admin/v-community', { replace: true })
      return
    }

    const qRole = (params.get('role') || '').toLowerCase()
    const entry = getPwaEntry()
    const sid =
      (entry?.schoolId && String(entry.schoolId)) ||
      lastSchoolId() ||
      (params.get('schoolId') || '')

    // Force admin portal when requested
    if (qRole === 'admin' || entry?.role === 'admin') {
      try {
        setPwaEntry('admin', localStorage.getItem('schoolId') || entry?.schoolId || '')
        applyPwaManifest(localStorage.getItem('schoolId') || '', 'admin')
      } catch (_) {}
      navigate('/?admin=1&source=pwa', { replace: true })
      return
    }

    if ((entry?.role === 'parent' || qRole === 'parent') && sid) {
      navigate(`/community/${sid}/login?role=parent`, { replace: true })
      return
    }
    if ((entry?.role === 'teacher' || qRole === 'teacher') && sid) {
      navigate(`/community/${sid}/login?role=teacher`, { replace: true })
      return
    }

    if (sid && (entry?.role === 'parent' || entry?.role === 'teacher')) {
      navigate(`/community/${sid}/login?role=${entry.role}`, { replace: true })
      return
    }

    // Known school but role unclear — still community login (role picker on page)
    if (sid) {
      navigate(`/community/${sid}/login`, { replace: true })
      return
    }

    setReady(true)
  }, [navigate, params])

  const continueWithInvite = (e) => {
    e.preventDefault()
    setErr('')
    const sid = parseSchoolIdFromInput(invite)
    if (!sid || sid.length < 12) {
      setErr('Paste the full invite link your school sent (or the school ID from that link).')
      return
    }
    const r = role === 'teacher' ? 'teacher' : 'parent'
    try {
      localStorage.setItem('lastCommunitySchoolId', sid)
      localStorage.setItem('seCommunitySchoolId', sid)
      setPwaEntry(r, sid)
      applyPwaManifest(sid, r)
    } catch (_) {}
    navigate(`/community/${sid}/login?role=${r}`, { replace: true })
  }

  if (!ready) {
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
        <p className="text-sm text-slate-500 mb-4 text-left leading-relaxed">
          Parents and teachers should open the <strong>invite link</strong> from their school
          (WhatsApp / SMS), then install the app from that page. The school is saved automatically —
          you should not need to type an ID every time.
        </p>
        <form className="text-left space-y-3 mb-4" onSubmit={continueWithInvite}>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
            Invite link (from your school)
          </label>
          <input
            value={invite}
            onChange={(e) => setInvite(e.target.value)}
            placeholder="https://…/community/…/login"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-500"
          />
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">I am a</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          >
            <option value="parent">Parent</option>
            <option value="teacher">Teacher</option>
          </select>
          {err && <p className="text-xs text-red-600">{err}</p>}
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: '#0284c7' }}
          >
            Continue to login
          </button>
        </form>
        <PwaInstallBanner />
        <Link to="/?admin=1" className="text-sm font-bold block mt-3" style={{ color: '#0284c7' }}>
          School admin login →
        </Link>
      </div>
    </div>
  )
}
