import { useEffect } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { setPwaEntry } from '../utils/pwaEntry'

/**
 * /community/:schoolId/register
 * Prefer role query or dedicated paths:
 *   /register/parent  /register/teacher
 *   /register?role=parent|teacher
 * Without role: show recovery links only (no combined product portal).
 */
export default function CommunityRegisterChoice() {
  const { schoolId } = useParams()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const role = (params.get('role') || '').toLowerCase()

  useEffect(() => {
    if (role === 'parent') {
      setPwaEntry('parent', schoolId)
      navigate(`/community/${schoolId}/register/parent`, { replace: true })
      return
    }
    if (role === 'teacher') {
      setPwaEntry('teacher', schoolId)
      navigate(`/community/${schoolId}/register/teacher`, { replace: true })
    }
  }, [role, schoolId, navigate])

  if (role === 'parent' || role === 'teacher') {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center text-sm text-slate-500">
        Opening…
      </div>
    )
  }

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(160deg, #f0f9ff 0%, #f8fafc 55%, #f1f5f9 100%)' }}
    >
      <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-xl text-center">
        <div className="text-lg font-bold text-slate-900 mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>
          SE Community
        </div>
        <p className="text-sm text-slate-500 mb-6">
          Use the registration link shared by your school, or choose below.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            to={`/community/${schoolId}/register/parent`}
            onClick={() => setPwaEntry('parent', schoolId)}
            className="w-full py-3 rounded-xl text-white text-sm font-bold"
            style={{ background: '#0284c7' }}
          >
            Parent registration →
          </Link>
          <Link
            to={`/community/${schoolId}/register/teacher`}
            onClick={() => setPwaEntry('teacher', schoolId)}
            className="w-full py-3 rounded-xl text-sm font-bold border-2 border-sky-200 text-sky-800"
          >
            Teacher registration →
          </Link>
          <Link
            to={`/community/${schoolId}/login`}
            className="text-sm font-semibold mt-2"
            style={{ color: '#0284c7' }}
          >
            Already have an account? Sign in →
          </Link>
        </div>
      </div>
    </div>
  )
}
