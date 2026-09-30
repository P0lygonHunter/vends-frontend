import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { fetchSchoolInfo } from '../services/schoolApi'
import { pathAllowed, PATH_FEATURE, minPlanLabel } from '../utils/planAccess'

/**
 * Hard-blocks school routes that the current plan cannot access.
 * Prevents URL / race navigation around sidebar locks.
 */
export default function PlanGuard({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [state, setState] = useState({ ready: false, allowed: true, need: null })

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const schoolId = localStorage.getItem('schoolId')
      if (!schoolId) {
        if (!cancelled) setState({ ready: true, allowed: true, need: null })
        return
      }
      try {
        const res = await fetchSchoolInfo(schoolId)
        const plan = res.data?.school?.plan
        const features = res.data?.planFeatures
        const ok = pathAllowed(plan, location.pathname, features)
        const feat = PATH_FEATURE[
          Object.keys(PATH_FEATURE)
            .filter((p) => location.pathname === p || location.pathname.startsWith(p + '/'))
            .sort((a, b) => b.length - a.length)[0]
        ]
        if (!cancelled) {
          setState({ ready: true, allowed: ok, need: feat ? minPlanLabel(feat) : 'a higher' })
        }
      } catch {
        // On error: only allow core paths (starter floor)
        const ok = pathAllowed('starter', location.pathname, null)
        if (!cancelled) setState({ ready: true, allowed: ok, need: 'Standard' })
      }
    }
    setState((s) => ({ ...s, ready: false }))
    run()
    return () => {
      cancelled = true
    }
  }, [location.pathname])

  if (!state.ready) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-sm text-slate-500">
        Checking plan access…
      </div>
    )
  }

  if (!state.allowed) {
    return (
      <div className="max-w-lg mx-auto mt-16 p-6 rounded-2xl border border-amber-200 bg-amber-50 text-center">
        <div className="text-3xl mb-2">🔒</div>
        <h2 className="text-lg font-bold text-slate-800 mb-2">Plan upgrade required</h2>
        <p className="text-sm text-slate-600 mb-4">
          This module needs the <strong>{state.need}</strong> plan or higher. Your current plan cannot open this page.
        </p>
        <button
          type="button"
          onClick={() => navigate('/subscription')}
          className="px-4 py-2 rounded-xl text-white text-sm font-semibold"
          style={{ background: '#4f46e5' }}
        >
          Go to Subscription
        </button>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="ml-2 px-4 py-2 rounded-xl text-sm font-medium border border-slate-200"
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  return children
}
