import { useEffect, useState } from 'react'
import axios from 'axios'
import Sidebar from '../components/Sidebar'
import TrialBadge from '../components/TrialBadge'

export default function Subscription() {
  const [school, setSchool] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSchool()
  }, [])

  const loadSchool = async () => {
    try {
      const schoolId = localStorage.getItem('schoolId')

      if (!schoolId) {
        setError('School information not found. Please login again.')
        setLoading(false)
        return
      }

      const res = await axios.get(
        `[https://vends-backend.vercel.app](https://vends-backend.vercel.app)/api/school/check/${schoolId}`
      )

      setSchool(res.data.school)
    } catch (err) {
      setError(
        err.response?.data?.error ||
        'Unable to load subscription information.'
      )
    } finally {
      setLoading(false)
    }
  }

  const daysLeft = (expiryDate) => {
    if (!expiryDate) return 0

    const diff = new Date(expiryDate) - new Date()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

    return days > 0 ? days : 0
  }

  const formatDate = (date) => {
    if (!date) return '-'

    return new Date(date).toLocaleDateString('en-PK', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const planInfo = {
    free_trial: {
      name: 'Free Trial',
      price: 'PKR 0',
      period: '/ 30 days',
      color: '#059669',
      bg: '#ecfdf5',
      border: '#a7f3d0',
      icon: '🆓',
      description: 'Explore Vends EduCore before choosing a paid plan.',
      features: [
        'Up to 100 students',
        'Student management',
        'Teacher management',
        'Attendance management',
        'Basic school dashboard'
      ]
    },

    lite: {
      name: 'Lite Edition',
      price: 'PKR 4,999',
      period: '/ month',
      color: '#4f46e5',
      bg: '#eef2ff',
      border: '#c7d2fe',
      icon: '⚡',
      description: 'Powerful school management for growing institutions.',
      features: [
        'Expanded student capacity',
        'Student management',
        'Teacher management',
        'Attendance management',
        'Result Card',
        'Test Generator',
        'School analytics'
      ]
    },

    zk: {
      name: 'ZK Edition',
      price: 'PKR 14,999',
      period: '/ month',
      color: '#7c3aed',
      bg: '#f5f3ff',
      border: '#ddd6fe',
      icon: '💎',
      description: 'Advanced school management for larger institutions.',
      features: [
        'Large student capacity',
        'All Lite Edition features',
        'Advanced analytics',
        'Advanced academic management',
        'Priority support',
        'Premium features'
      ]
    }
  }

  const currentPlan =
    planInfo[school?.plan] || planInfo.free_trial

  if (loading) {
    return (
      <div
        className="flex min-h-screen"
        style={{ background: '#f8fafc' }}
      >
        <Sidebar
          schoolName={
            localStorage.getItem('schoolName') || 'Your School'
          }
        />

        <div style={{ marginLeft: '260px', flex: 1 }}>
          <div
            className="flex items-center px-8 bg-white"
            style={{
              height: '68px',
              borderBottom: '1px solid #e2e8f0'
            }}
          >
            <h2
              className="font-bold text-xl"
              style={{ fontFamily: 'Syne,sans-serif' }}
            >
              Subscription
            </h2>

            <div className="ml-auto">
              <TrialBadge />
            </div>
          </div>

          <div className="flex justify-center items-center py-24 text-slate-400">
            Loading subscription...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex min-h-screen"
      style={{ background: '#f8fafc' }}
    >
      <Sidebar
        schoolName={
          school?.schoolName ||
          localStorage.getItem('schoolName') ||
          'Your School'
        }
      />

      <div style={{ marginLeft: '260px', flex: 1 }}>
        {/* TOPBAR */}
        <div
          className="flex items-center gap-4 px-8 bg-white"
          style={{
            height: '68px',
            borderBottom: '1px solid #e2e8f0',
            position: 'sticky',
            top: 0,
            zIndex: 50
          }}
        >
          <h2
            className="flex-1 font-bold text-xl"
            style={{ fontFamily: 'Syne,sans-serif' }}
          >
            Subscription
          </h2>

          <TrialBadge />
        </div>

        <div className="p-8">
          {/* ERROR */}
          {error && (
            <div
              className="mb-6 px-5 py-4 rounded-xl text-sm font-semibold"
              style={{
                background: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca'
              }}
            >
              ❌ {error}
            </div>
          )}

          {school && (
            <>
              {/* CURRENT PLAN */}
              <div
                className="bg-white rounded-2xl border p-7 mb-7"
                style={{ borderColor: '#e2e8f0' }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div
                      className="text-xs font-bold uppercase mb-2"
                      style={{
                        color: '#94a3b8',
                        letterSpacing: '0.8px'
                      }}
                    >
                      Current Plan
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                        style={{
                          background: currentPlan.bg
                        }}
                      >
                        {currentPlan.icon}
                      </div>

                      <div>
                        <h3
                          className="font-bold text-2xl"
                          style={{ fontFamily: 'Syne,sans-serif' }}
                        >
                          {currentPlan.name}
                        </h3>

                        <p
                          className="text-sm mt-1"
                          style={{ color: '#64748b' }}
                        >
                          {currentPlan.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  <span
                    className="px-4 py-2 rounded-full text-xs font-bold"
                    style={{
                      background: currentPlan.bg,
                      color: currentPlan.color
                    }}
                  >
                    ● ACTIVE
                  </span>
                </div>

                <div
                  className="grid grid-cols-3 gap-5 mt-7 pt-6"
                  style={{
                    borderTop: '1px solid #f1f5f9'
                  }}
                >
                  <div>
                    <div
                      className="text-xs font-semibold mb-1"
                      style={{ color: '#94a3b8' }}
                    >
                      PLAN PRICE
                    </div>

                    <div
                      className="font-bold text-lg"
                      style={{ color: currentPlan.color }}
                    >
                      {currentPlan.price}
                      <span
                        className="text-xs font-medium ml-1"
                        style={{ color: '#94a3b8' }}
                      >
                        {currentPlan.period}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div
                      className="text-xs font-semibold mb-1"
                      style={{ color: '#94a3b8' }}
                    >
                      EXPIRES
                    </div>

                    <div className="font-bold text-lg">
                      {formatDate(school.expiryDate)}
                    </div>
                  </div>

                  <div>
                    <div
                      className="text-xs font-semibold mb-1"
                      style={{ color: '#94a3b8' }}
                    >
                      TIME REMAINING
                    </div>

                    <div
                      className="font-bold text-lg"
                      style={{
                        color:
                          daysLeft(school.expiryDate) <= 7
                            ? '#dc2626'
                            : '#059669'
                      }}
                    >
                      {daysLeft(school.expiryDate)} days
                    </div>
                  </div>
                </div>
              </div>

              {/* PLANS */}
              <div className="mb-5">
                <h3
                  className="font-bold text-xl"
                  style={{ fontFamily: 'Syne,sans-serif' }}
                >
                  Choose Your Plan
                </h3>

                <p
                  className="text-sm mt-1"
                  style={{ color: '#64748b' }}
                >
                  Upgrade your school management experience.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-5">
                {Object.entries(planInfo).map(
                  ([planKey, plan]) => {
                    const isCurrent =
                      school.plan === planKey

                    return (
                      <div
                        key={planKey}
                        className="bg-white rounded-2xl border p-6 relative"
                        style={{
                          borderColor: isCurrent
                            ? plan.color
                            : '#e2e8f0',
                          boxShadow: isCurrent
                            ? `0 8px 30px ${plan.color}18`
                            : '0 4px 20px rgba(0,0,0,0.03)'
                        }}
                      >
                        {isCurrent && (
                          <div
                            className="absolute top-5 right-5 px-3 py-1 rounded-full text-xs font-bold"
                            style={{
                              background: plan.bg,
                              color: plan.color
                            }}
                          >
                            CURRENT
                          </div>
                        )}

                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-5"
                          style={{
                            background: plan.bg
                          }}
                        >
                          {plan.icon}
                        </div>

                        <h4
                          className="font-bold text-lg"
                          style={{
                            fontFamily: 'Syne,sans-serif'
                          }}
                        >
                          {plan.name}
                        </h4>

                        <div className="mt-3">
                          <span
                            className="font-bold text-2xl"
                            style={{ color: plan.color }}
                          >
                            {plan.price}
                          </span>

                          <span
                            className="text-xs ml-1"
                            style={{ color: '#94a3b8' }}
                          >
                            {plan.period}
                          </span>
                        </div>

                        <p
                          className="text-sm mt-3 leading-6"
                          style={{ color: '#64748b' }}
                        >
                          {plan.description}
                        </p>

                        <div className="mt-5 flex flex-col gap-3">
                          {plan.features.map(
                            (feature, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 text-sm"
                                style={{ color: '#475569' }}
                              >
                                <span
                                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                                  style={{
                                    background: plan.bg,
                                    color: plan.color
                                  }}
                                >
                                  ✓
                                </span>

                                {feature}
                              </div>
                            )
                          )}
                        </div>

                        <button
                          disabled={isCurrent}
                          className="w-full mt-7 py-3 rounded-xl text-sm font-bold transition-all"
                          style={{
                            background: isCurrent
                              ? '#f1f5f9'
                              : plan.color,
                            color: isCurrent
                              ? '#94a3b8'
                              : '#fff',
                            cursor: isCurrent
                              ? 'default'
                              : 'pointer'
                          }}
                        >
                          {isCurrent
                            ? 'Current Plan'
                            : planKey === 'free_trial'
                              ? 'Free Trial'
                              : 'Upgrade Plan'}
                        </button>
                      </div>
                    )
                  }
                )}
              </div>

              {/* SUPPORT NOTICE */}
              <div
                className="mt-7 rounded-2xl p-6"
                style={{
                  background: '#1e1b4b',
                  color: '#fff'
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                    style={{
                      background:
                        'rgba(255,255,255,0.1)'
                    }}
                  >
                    💬
                  </div>

                  <div className="flex-1">
                    <div className="font-bold text-sm">
                      Need to upgrade your plan?
                    </div>

                    <div
                      className="text-xs mt-1"
                      style={{
                        color:
                          'rgba(255,255,255,0.6)'
                      }}
                    >
                      Contact Vends EduCore support to activate
                      your selected plan.
                    </div>
                  </div>

                  <a
                    href="mailto:support@vendseducore.pk"
                    className="px-5 py-2.5 rounded-xl text-sm font-bold"
                    style={{
                      background: '#fff',
                      color: '#1e1b4b',
                      textDecoration: 'none'
                    }}
                  >
                    Contact Support
                  </a>
                </div>

              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}