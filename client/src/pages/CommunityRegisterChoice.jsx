import { useEffect } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { setPwaEntry } from '../utils/pwaEntry'

/**
 * Combined parent+teacher choice is DISABLED.
 * School must share separate links:
 *   /community/:schoolId/register/parent
 *   /community/:schoolId/register/teacher
 * If someone hits /register without role → redirect to login only.
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
      return
    }
    // No combined chooser — go to role-specific login only
    navigate(`/community/${schoolId}/login`, { replace: true })
  }, [role, schoolId, navigate])

  return (
    <div className="min-h-[100dvh] flex items-center justify-center text-sm text-slate-500">
      Opening…
    </div>
  )
}
