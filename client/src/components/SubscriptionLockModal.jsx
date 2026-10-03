import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import API_BASE_URL from '../config/api'
import { GRACE_MODAL_DISMISS_KEY } from '../utils/subscriptionLock'

/**
 * Phase 3 — after expiry:
 *  - in grace: modal once per session + sticky banner (print-hidden), writes soft-locked on API
 *  - past grace / blocked: full-screen lock (only Subscription + Logout)
 */
export default function SubscriptionLockModal({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [info, setInfo] = useState(null)
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(GRACE_MODAL_DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    const schoolId = localStorage.getItem('schoolId')
    if (!schoolId) return
    let cancelled = false
    axios
      .get(`${API_BASE_URL}/school/check/${schoolId}`)
      .then(({ data }) => {
        if (cancelled) return
        setInfo(data)
      })
      .catch((err) => {
        if (cancelled) return
        const status = err.response?.status
        const body = err.response?.data
        if (status === 403 && body?.error) {
          setInfo({
            subscriptionExpired: true,
            pastGrace: true,
            softLock: false,
            blocked: true,
            error: body.error,
            supportEmail: body.supportEmail,
            supportPhone: body.supportPhone,
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [location.pathname])

  const expired = Boolean(info?.subscriptionExpired || info?.pastGrace || info?.blocked)
  const inGrace = Boolean(info?.inGrace || (info?.softLock && !info?.pastGrace))
  const hardLock = Boolean(info?.pastGrace || info?.blocked)
  const onSubscriptionPage = location.pathname.startsWith('/subscription')

  const logout = () => {
    try {
      sessionStorage.removeItem(GRACE_MODAL_DISMISS_KEY)
    } catch (_) {}
    localStorage.removeItem('authToken')
    localStorage.removeItem('schoolId')
    localStorage.removeItem('schoolName')
    navigate('/', { replace: true })
  }

  const dismissGrace = () => {
    try {
      sessionStorage.setItem(GRACE_MODAL_DISMISS_KEY, '1')
    } catch (_) {}
    setDismissed(true)
  }

  // Modal: hard lock always (except subscription page); grace only if not yet dismissed this session
  const showModal =
    expired && !onSubscriptionPage && (hardLock || (inGrace && !dismissed))

  const showBanner = expired && inGrace && !hardLock && dismissed && !onSubscriptionPage

  return (
    <>
      {children}

      {/* Sticky grace banner — below typical 68px header, hidden when printing */}
      {showBanner && (
        <div
          className="fixed inset-x-0 z-[90] flex items-center justify-center gap-3 px-4 py-2 text-sm font-semibold text-amber-950 print:hidden"
          style={{
            top: 68,
            background: '#fef3c7',
            borderBottom: '1px solid #fcd34d',
            boxShadow: '0 1px 0 rgba(0,0,0,0.04)',
          }}
        >
          <span>
            Plan ended — {info?.graceDaysLeft ?? 0} day(s) of grace left. Editing is locked until you renew.
          </span>
          <button
            type="button"
            onClick={() => navigate('/subscription')}
            className="px-3 py-1 rounded-lg text-white text-xs font-bold shrink-0"
            style={{ background: '#4f46e5' }}
          >
            Renew
          </button>
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 print:hidden"
          style={{ background: 'rgba(15,23,42,0.72)' }}
        >
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="text-center text-4xl mb-3">{hardLock ? '🚫' : '⚠️'}</div>
            <h2 className="text-xl font-bold text-center mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
              {hardLock ? 'Account locked' : 'Trial / plan ended'}
            </h2>
            <p className="text-sm text-slate-600 text-center mb-4 leading-relaxed">
              {hardLock
                ? info?.error ||
                  'Your grace period has ended. The school account is locked until payment is approved or support extends access.'
                : `Your trial or paid plan has ended. You have ${info?.graceDaysLeft ?? 0} day(s) of grace left. You can still view existing data and open Subscription to renew — adding, editing, or generating new records is locked.`}
            </p>
            {typeof info?.purgeDays === 'number' && !hardLock && (
              <p className="text-xs text-slate-500 text-center mb-4">
                If you do not renew: access hard-locks after {info.graceDays} days, and operational data is permanently deleted on day{' '}
                {info.purgeDays} after expiry. Only your login email and password are kept.
              </p>
            )}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => navigate('/subscription')}
                className="w-full py-3 rounded-xl text-white text-sm font-bold"
                style={{ background: '#4f46e5' }}
              >
                Go to Subscription
              </button>
              {!hardLock && (
                <button
                  type="button"
                  onClick={dismissGrace}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600"
                >
                  Continue viewing (read-only)
                </button>
              )}
              <button type="button" onClick={logout} className="w-full py-2 text-sm text-red-600 font-semibold">
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
