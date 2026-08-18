import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import API_BASE_URL from '../config/api'

export default function CEODashboard() {
  const [schoolList, setSchoolList] = useState([])
  const [logs, setLogs] = useState([])
  const [activePage, setActivePage] = useState('overview')
  const [toast, setToast] = useState('')
  const [extendModal, setExtendModal] = useState(null)
  const [extendDays, setExtendDays] = useState(30)
  const [extendPlan, setExtendPlan] = useState('lite')
  const [loading, setLoading] = useState(true)

  const navigate = useNavigate()

  useEffect(() => {
    if (localStorage.getItem('ceoLoggedIn') !== 'true') {
      navigate('/ceo/login')
      return
    }

    fetchSchools()
    fetchLogs()
  }, [])

  const fetchSchools = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/admin/schools`
      )

      setSchoolList(res.data)
    } catch (err) {
      console.log(err)
    }

    setLoading(false)
  }

  const fetchLogs = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/admin/login-logs`
      )

      setLogs(res.data)
    } catch (err) {
      console.log(err)
    }
  }

  const showToast = (msg) => {
    setToast(msg)

    setTimeout(() => {
      setToast('')
    }, 3000)
  }

  const toggleBlock = async (id, name) => {
    try {
      const res = await axios.patch(
        `${API_BASE_URL}/admin/toggle-block/${id}`
      )

      showToast(
        res.data.message.includes('true')
          ? `🔒 ${name} blocked!`
          : `✅ ${name} unblocked!`
      )

      fetchSchools()
    } catch (err) {
      console.log(err)
    }
  }

  const deleteSchool = async (id, name) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete "${name}"? This will delete all their students, teachers, and attendance records. This cannot be undone!`
      )
    ) {
      return
    }

    try {
      const res = await axios.delete(
        `${API_BASE_URL}/admin/delete-school/${id}`
      )

      showToast(`🗑️ ${res.data.message}`)

      fetchSchools()
    } catch (err) {
      console.log(err)
    }
  }

  const handleExtend = async () => {
    try {
      await axios.patch(
        `${API_BASE_URL}/admin/extend-trial/${extendModal._id}`,
        {
          days: Number(extendDays),
          plan: extendPlan
        }
      )

      showToast(
        `✅ ${extendModal.schoolName}'s plan extended successfully!`
      )

      setExtendModal(null)
      fetchSchools()
    } catch (err) {
      console.log(err)
    }
  }

  const ceoLogout = () => {
    localStorage.removeItem('ceoLoggedIn')
    navigate('/')
  }

  const daysLeft = (expiryDate) => {
    const diff = new Date(expiryDate) - new Date()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

    return days > 0 ? days : 0
  }

  const planLabel = (plan) => {
    if (plan === 'free_trial') {
      return {
        text: 'Free Trial',
        bg: '#ecfdf5',
        color: '#059669'
      }
    }

    if (plan === 'lite') {
      return {
        text: 'Lite Edition',
        bg: '#eef2ff',
        color: '#4f46e5'
      }
    }

    if (plan === 'zk') {
      return {
        text: 'ZK Edition',
        bg: '#f5f3ff',
        color: '#7c3aed'
      }
    }

    return {
      text: plan,
      bg: '#f1f5f9',
      color: '#475569'
    }
  }

  const formatDateTime = (dateStr) => {
    const d = new Date(dateStr)

    return d.toLocaleString('en-PK', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  // REAL REVENUE CALCULATION
  const planPrices = {
    free_trial: 0,
    lite: 4999,
    zk: 14999
  }

  const liteSchools = schoolList.filter(
    s => s.plan === 'lite'
  ).length

  const zkSchools = schoolList.filter(
    s => s.plan === 'zk'
  ).length

  const trialSchools = schoolList.filter(
    s => s.plan === 'free_trial'
  ).length

  const monthlyRevenue =
    (liteSchools * planPrices.lite) +
    (zkSchools * planPrices.zk)

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK').format(amount)
  }

  const navItems = [
    {
      id: 'overview',
      icon: '📊',
      label: 'Dashboard'
    },
    {
      id: 'schools',
      icon: '🏫',
      label: 'All Schools'
    },
    {
      id: 'logins',
      icon: '🔍',
      label: 'Login Logs'
    }
  ]

  const totalSchools = schoolList.length

  const blockedSchools = schoolList.filter(
    s => s.blocked
  ).length

  const expiredSchools = schoolList.filter(
    s => new Date(s.expiryDate) < new Date()
  ).length

  const activeSchools = schoolList.filter(
    s =>
      !s.blocked &&
      new Date(s.expiryDate) >= new Date()
  ).length

  return (
    <div
      className="flex min-h-screen"
      style={{ background: '#f8fafc' }}
    >

      {/* CEO SIDEBAR */}
      <aside
        className="fixed left-0 top-0 bottom-0 flex flex-col"
        style={{
          width: '240px',
          background: '#0f0c29'
        }}
      >

        <div
          className="flex items-center gap-3 px-5 py-6"
          style={{
            borderBottom:
              '1px solid rgba(255,255,255,0.08)'
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{
              background:
                'linear-gradient(135deg,#ef4444,#dc2626)'
            }}
          >
            🛡️
          </div>

          <div>
            <div
              className="text-white font-bold text-sm"
              style={{
                fontFamily: 'Syne,sans-serif'
              }}
            >
              CEO Panel
            </div>

            <div
              className="text-xs"
              style={{
                color: 'rgba(255,255,255,0.4)'
              }}
            >
              Vends EduCore
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1 px-3 py-5 flex-1">
          {navItems.map(item => (
            <div
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer text-sm font-medium transition-all"
              style={{
                background:
                  activePage === item.id
                    ? 'rgba(239,68,68,0.2)'
                    : 'transparent',

                color:
                  activePage === item.id
                    ? '#fff'
                    : 'rgba(255,255,255,0.5)'
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </div>

        <div
          className="px-3 pb-5"
          style={{
            borderTop:
              '1px solid rgba(255,255,255,0.08)',
            paddingTop: '16px'
          }}
        >
          <div
            onClick={ceoLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer text-sm"
            style={{
              color: '#f87171'
            }}
          >
            <span>🚪</span>
            Logout
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div
        style={{
          marginLeft: '240px',
          flex: 1
        }}
      >

        {/* TOPBAR */}
        <div
          className="flex items-center gap-4 px-8 bg-white"
          style={{
            height: '64px',
            borderBottom: '1px solid #e2e8f0',
            position: 'sticky',
            top: 0,
            zIndex: 50
          }}
        >
          <h2
            className="flex-1 font-bold text-xl"
            style={{
              fontFamily: 'Syne,sans-serif'
            }}
          >
            {navItems.find(
              n => n.id === activePage
            )?.label}
          </h2>

          <div
            className="px-3 py-1 rounded-full text-white text-xs font-bold"
            style={{
              background:
                'linear-gradient(135deg,#ef4444,#dc2626)'
            }}
          >
            🔴 CEO ACCESS
          </div>

          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{
              background:
                'linear-gradient(135deg,#ef4444,#dc2626)'
            }}
          >
            MV
          </div>
        </div>

        <div className="p-8">

          {/* TOAST */}
          {toast && (
            <div
              className="fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-white font-semibold text-sm"
              style={{
                background: '#1e1b4b',
                boxShadow:
                  '0 8px 32px rgba(0,0,0,0.2)'
              }}
            >
              {toast}
            </div>
          )}

          {loading ? (
            <div className="text-center py-20 text-slate-400">
              Loading...
            </div>
          ) : (
            <>

              {/* OVERVIEW */}
              {activePage === 'overview' && (
                <div>

                  {/* STATS */}
                  <div className="grid grid-cols-5 gap-5 mb-7">

                    <div
                      className="bg-white rounded-2xl p-6 border"
                      style={{
                        borderColor: '#e2e8f0',
                        boxShadow:
                          '0 4px 24px rgba(0,0,0,0.05)'
                      }}
                    >
                      <div
                        className="text-xs font-bold uppercase mb-2"
                        style={{
                          color: '#94a3b8',
                          letterSpacing: '0.8px'
                        }}
                      >
                        Total Schools
                      </div>

                      <div
                        className="font-bold text-3xl mb-1"
                        style={{
                          fontFamily: 'Syne,sans-serif'
                        }}
                      >
                        {totalSchools}
                      </div>

                      <div
                        className="text-xs font-semibold"
                        style={{ color: '#10b981' }}
                      >
                        All registered schools
                      </div>
                    </div>

                    <div
                      className="bg-white rounded-2xl p-6 border"
                      style={{
                        borderColor: '#e2e8f0',
                        boxShadow:
                          '0 4px 24px rgba(0,0,0,0.05)'
                      }}
                    >
                      <div
                        className="text-xs font-bold uppercase mb-2"
                        style={{
                          color: '#94a3b8',
                          letterSpacing: '0.8px'
                        }}
                      >
                        Active Schools
                      </div>

                      <div
                        className="font-bold text-3xl mb-1"
                        style={{
                          fontFamily: 'Syne,sans-serif'
                        }}
                      >
                        {activeSchools}
                      </div>

                      <div
                        className="text-xs font-semibold"
                        style={{ color: '#10b981' }}
                      >
                        Active subscriptions/trials
                      </div>
                    </div>

                    <div
                      className="bg-white rounded-2xl p-6 border"
                      style={{
                        borderColor: '#e2e8f0',
                        boxShadow:
                          '0 4px 24px rgba(0,0,0,0.05)'
                      }}
                    >
                      <div
                        className="text-xs font-bold uppercase mb-2"
                        style={{
                          color: '#94a3b8',
                          letterSpacing: '0.8px'
                        }}
                      >
                        Blocked Schools
                      </div>

                      <div
                        className="font-bold text-3xl mb-1"
                        style={{
                          fontFamily: 'Syne,sans-serif'
                        }}
                      >
                        {blockedSchools}
                      </div>

                      <div
                        className="text-xs font-semibold"
                        style={{ color: '#ef4444' }}
                      >
                        Currently blocked
                      </div>
                    </div>

                    <div
                      className="bg-white rounded-2xl p-6 border"
                      style={{
                        borderColor: '#e2e8f0',
                        boxShadow:
                          '0 4px 24px rgba(0,0,0,0.05)'
                      }}
                    >
                      <div
                        className="text-xs font-bold uppercase mb-2"
                        style={{
                          color: '#94a3b8',
                          letterSpacing: '0.8px'
                        }}
                      >
                        Expired
                      </div>

                      <div
                        className="font-bold text-3xl mb-1"
                        style={{
                          fontFamily: 'Syne,sans-serif'
                        }}
                      >
                        {expiredSchools}
                      </div>

                      <div
                        className="text-xs font-semibold"
                        style={{ color: '#f59e0b' }}
                      >
                        Need attention
                      </div>
                    </div>

                    {/* REAL REVENUE */}
                    <div
                      className="rounded-2xl p-6 border"
                      style={{
                        background:
                          'linear-gradient(135deg,#1e1b4b,#3730a3)',
                        borderColor: '#4f46e5',
                        boxShadow:
                          '0 8px 32px rgba(79,70,229,0.18)'
                      }}
                    >
                      <div
                        className="text-xs font-bold uppercase mb-2"
                        style={{
                          color:
                            'rgba(255,255,255,0.6)',
                          letterSpacing: '0.8px'
                        }}
                      >
                        Monthly Revenue
                      </div>

                      <div
                        className="font-bold text-2xl mb-1 text-white"
                        style={{
                          fontFamily: 'Syne,sans-serif'
                        }}
                      >
                        PKR {formatCurrency(monthlyRevenue)}
                      </div>

                      <div
                        className="text-xs font-semibold"
                        style={{
                          color: '#a5b4fc'
                        }}
                      >
                        Lite + ZK subscriptions
                      </div>
                    </div>

                  </div>

                  {/* REVENUE BREAKDOWN */}
                  <div className="grid grid-cols-3 gap-5 mb-7">

                    <div
                      className="bg-white rounded-2xl p-6 border"
                      style={{
                        borderColor: '#e2e8f0'
                      }}
                    >
                      <div
                        className="text-xs font-bold uppercase mb-3"
                        style={{
                          color: '#94a3b8'
                        }}
                      >
                        Lite Edition
                      </div>

                      <div
                        className="text-2xl font-bold mb-1"
                        style={{
                          fontFamily: 'Syne,sans-serif'
                        }}
                      >
                        {liteSchools} schools
                      </div>

                      <div
                        className="text-sm"
                        style={{
                          color: '#4f46e5'
                        }}
                      >
                        PKR {formatCurrency(
                          liteSchools * planPrices.lite
                        )} / month
                      </div>
                    </div>

                    <div
                      className="bg-white rounded-2xl p-6 border"
                      style={{
                        borderColor: '#e2e8f0'
                      }}
                    >
                      <div
                        className="text-xs font-bold uppercase mb-3"
                        style={{
                          color: '#94a3b8'
                        }}
                      >
                        ZK Edition
                      </div>

                      <div
                        className="text-2xl font-bold mb-1"
                        style={{
                          fontFamily: 'Syne,sans-serif'
                        }}
                      >
                        {zkSchools} schools
                      </div>

                      <div
                        className="text-sm"
                        style={{
                          color: '#7c3aed'
                        }}
                      >
                        PKR {formatCurrency(
                          zkSchools * planPrices.zk
                        )} / month
                      </div>
                    </div>

                    <div
                      className="bg-white rounded-2xl p-6 border"
                      style={{
                        borderColor: '#e2e8f0'
                      }}
                    >
                      <div
                        className="text-xs font-bold uppercase mb-3"
                        style={{
                          color: '#94a3b8'
                        }}
                      >
                        Free Trial
                      </div>

                      <div
                        className="text-2xl font-bold mb-1"
                        style={{
                          fontFamily: 'Syne,sans-serif'
                        }}
                      >
                        {trialSchools} schools
                      </div>

                      <div
                        className="text-sm"
                        style={{
                          color: '#059669'
                        }}
                      >
                        PKR 0 / month
                      </div>
                    </div>

                  </div>

                  {/* REGISTERED SCHOOLS */}
                  <div
                    className="bg-white rounded-2xl border"
                    style={{
                      borderColor: '#e2e8f0'
                    }}
                  >

                    <div
                      className="flex items-center justify-between px-6 py-5"
                      style={{
                        borderBottom:
                          '1px solid #e2e8f0'
                      }}
                    >
                      <h3 className="font-bold text-base">
                        Registered Schools
                      </h3>

                      <span
                        className="text-xs"
                        style={{
                          color: '#94a3b8'
                        }}
                      >
                        🔒 Each school's data is fully isolated
                      </span>
                    </div>

                    {schoolList.length === 0 ? (
                      <div className="text-center py-16 text-slate-400">
                        No schools registered yet
                      </div>
                    ) : (
                      schoolList.map((s, i) => {
                        const plan = planLabel(s.plan)
                        const expired =
                          new Date(s.expiryDate) <
                          new Date()

                        return (
                          <div
                            key={s._id}
                            className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50"
                            style={{
                              borderBottom:
                                i <
                                schoolList.length - 1
                                  ? '1px solid #f1f5f9'
                                  : 'none'
                            }}
                          >

                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                              style={{
                                background: '#eef2ff'
                              }}
                            >
                              🏫
                            </div>

                            <div className="flex-1">

                              <div className="font-semibold text-sm">
                                {s.schoolName}
                              </div>

                              <div
                                className="text-xs"
                                style={{
                                  color: '#94a3b8'
                                }}
                              >
                                {s.city} · Principal:{' '}
                                {s.principalName} ·{' '}
                                {s.phone} ·{' '}
                                {s.adminEmail}
                              </div>

                            </div>

                            <div
                              className="text-sm"
                              style={{
                                color: '#64748b'
                              }}
                            >
                              {expired
                                ? 'Expired'
                                : `${daysLeft(
                                    s.expiryDate
                                  )} days left`}
                            </div>

                            <span
                              className="px-3 py-1 rounded-full text-xs font-bold"
                              style={{
                                background: plan.bg,
                                color: plan.color
                              }}
                            >
                              {plan.text}
                            </span>

                            <button
                              onClick={() =>
                                toggleBlock(
                                  s._id,
                                  s.schoolName
                                )
                              }
                              className="px-3 py-1 rounded-lg text-xs font-bold"
                              style={{
                                background: s.blocked
                                  ? '#ecfdf5'
                                  : '#fef2f2',
                                color: s.blocked
                                  ? '#059669'
                                  : '#ef4444'
                              }}
                            >
                              {s.blocked
                                ? '✅ Unblock'
                                : '🔒 Block'}
                            </button>

                            <button
                              onClick={() =>
                                deleteSchool(
                                  s._id,
                                  s.schoolName
                                )
                              }
                              className="px-3 py-1 rounded-lg text-xs font-bold"
                              style={{
                                background: '#1e1b4b',
                                color: '#fff'
                              }}
                            >
                              🗑️ Delete
                            </button>

                            <button
                              onClick={() =>
                                setExtendModal(s)
                              }
                              className="px-3 py-1 rounded-lg text-xs font-bold"
                              style={{
                                background: '#eef2ff',
                                color: '#4f46e5'
                              }}
                            >
                              📅 Extend
                            </button>

                          </div>
                        )
                      })
                    )}

                  </div>

                </div>
              )}

              {/* ALL SCHOOLS */}
              {activePage === 'schools' && (
                <div
                  className="bg-white rounded-2xl border"
                  style={{
                    borderColor: '#e2e8f0'
                  }}
                >

                  <div
                    className="px-6 py-5"
                    style={{
                      borderBottom:
                        '1px solid #e2e8f0'
                    }}
                  >
                    <h3 className="font-bold text-base">
                      All Registered Schools
                    </h3>
                  </div>

                  {schoolList.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                      No schools registered yet
                    </div>
                  ) : (
                    schoolList.map((s, i) => {
                      const plan = planLabel(s.plan)

                      return (
                        <div
                          key={s._id}
                          className="flex items-center gap-4 px-6 py-5 hover:bg-slate-50"
                          style={{
                            borderBottom:
                              i <
                              schoolList.length - 1
                                ? '1px solid #f1f5f9'
                                : 'none'
                          }}
                        >

                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                            style={{
                              background: '#eef2ff'
                            }}
                          >
                            🏫
                          </div>

                          <div className="flex-1">

                            <div className="font-semibold text-sm mb-1">
                              {s.schoolName}
                            </div>

                            <div
                              className="text-xs"
                              style={{
                                color: '#94a3b8'
                              }}
                            >
                              {s.city} · {s.adminEmail} ·{' '}
                              {s.phone}
                            </div>

                            <div
                              className="text-xs mt-1"
                              style={{
                                color: '#94a3b8'
                              }}
                            >
                              Principal:{' '}
                              {s.principalName} · Limit:{' '}
                              {s.studentLimit} students
                            </div>

                          </div>

                          <span
                            className="px-3 py-1 rounded-full text-xs font-bold"
                            style={{
                              background: plan.bg,
                              color: plan.color
                            }}
                          >
                            {plan.text}
                          </span>

                          <button
                            onClick={() =>
                              toggleBlock(
                                s._id,
                                s.schoolName
                              )
                            }
                            className="px-4 py-2 rounded-xl text-xs font-bold"
                            style={{
                              background: s.blocked
                                ? '#ecfdf5'
                                : '#fef2f2',
                              color: s.blocked
                                ? '#059669'
                                : '#ef4444'
                            }}
                          >
                            {s.blocked
                              ? '✅ Unblock'
                              : '🔒 Block'}
                          </button>

                          <button
                            onClick={() =>
                              deleteSchool(
                                s._id,
                                s.schoolName
                              )
                            }
                            className="px-4 py-2 rounded-xl text-xs font-bold"
                            style={{
                              background: '#1e1b4b',
                              color: '#fff'
                            }}
                          >
                            🗑️ Delete
                          </button>

                          <button
                            onClick={() =>
                              setExtendModal(s)
                            }
                            className="px-4 py-2 rounded-xl text-xs font-bold"
                            style={{
                              background: '#eef2ff',
                              color: '#4f46e5'
                            }}
                          >
                            📅 Extend
                          </button>

                        </div>
                      )
                    })
                  )}

                </div>
              )}

              {/* LOGIN LOGS */}
              {activePage === 'logins' && (
                <div
                  className="bg-white rounded-2xl border"
                  style={{
                    borderColor: '#e2e8f0'
                  }}
                >

                  <div
                    className="px-6 py-5"
                    style={{
                      borderBottom:
                        '1px solid #e2e8f0'
                    }}
                  >
                    <h3 className="font-bold text-base">
                      🔍 Login Activity Log
                    </h3>

                    <p
                      className="text-xs mt-1"
                      style={{
                        color: '#94a3b8'
                      }}
                    >
                      Last 50 login attempts — date,
                      time & status
                    </p>
                  </div>

                  {logs.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                      No login activity yet
                    </div>
                  ) : (
                    <table className="w-full border-collapse">

                      <thead>
                        <tr
                          style={{
                            background: '#f8fafc'
                          }}
                        >
                          {[
                            'School',
                            'Email Used',
                            'Date & Time',
                            'Status'
                          ].map(h => (
                            <th
                              key={h}
                              className="text-left px-5 py-3 text-xs font-bold uppercase"
                              style={{
                                color: '#94a3b8',
                                letterSpacing: '0.8px',
                                borderBottom:
                                  '1px solid #e2e8f0'
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {logs.map(l => (
                          <tr
                            key={l._id}
                            style={{
                              borderTop:
                                '1px solid #f1f5f9'
                            }}
                          >

                            <td className="px-5 py-4 text-sm font-semibold">
                              {l.schoolName}
                            </td>

                            <td
                              className="px-5 py-4 text-sm"
                              style={{
                                color: '#64748b'
                              }}
                            >
                              {l.email}
                            </td>

                            <td
                              className="px-5 py-4 text-sm"
                              style={{
                                color: '#64748b'
                              }}
                            >
                              {formatDateTime(
                                l.createdAt
                              )}
                            </td>

                            <td className="px-5 py-4">

                              <span
                                className="px-3 py-1 rounded-full text-xs font-bold"
                                style={{
                                  background:
                                    l.status ===
                                    'Success'
                                      ? '#ecfdf5'
                                      : l.status ===
                                        'Blocked'
                                      ? '#fef2f2'
                                      : '#fffbeb',

                                  color:
                                    l.status ===
                                    'Success'
                                      ? '#059669'
                                      : l.status ===
                                        'Blocked'
                                      ? '#dc2626'
                                      : '#d97706'
                                }}
                              >
                                {l.status ===
                                'Success'
                                  ? '✓ Success'
                                  : l.status ===
                                    'Blocked'
                                  ? '🔒 Blocked'
                                  : '✗ Failed'}
                              </span>

                            </td>

                          </tr>
                        ))}
                      </tbody>

                    </table>
                  )}

                </div>
              )}

            </>
          )}

          {/* EXTEND PLAN MODAL */}
          {extendModal && (
            <div
              className="fixed inset-0 flex items-center justify-center z-50"
              style={{
                background:
                  'rgba(0,0,0,0.5)',
                backdropFilter:
                  'blur(4px)'
              }}
            >

              <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">

                <h3
                  className="font-bold text-xl mb-2"
                  style={{
                    fontFamily:
                      'Syne,sans-serif'
                  }}
                >
                  📅 Extend Plan
                </h3>

                <p
                  className="text-sm mb-6"
                  style={{
                    color: '#64748b'
                  }}
                >
                  {extendModal.schoolName}
                </p>

                <div className="flex flex-col gap-4">

                  <div>

                    <label
                      className="text-xs font-semibold mb-1 block"
                      style={{
                        color: '#475569'
                      }}
                    >
                      Number of Days
                    </label>

                    <input
                      type="number"
                      min="1"
                      value={extendDays}
                      onChange={e =>
                        setExtendDays(
                          e.target.value
                        )
                      }
                      className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none"
                      style={{
                        borderColor: '#e2e8f0'
                      }}
                    />

                    <div className="flex gap-2 mt-2">

                      {[7, 30, 90, 365].map(d => (
                        <button
                          key={d}
                          onClick={() =>
                            setExtendDays(d)
                          }
                          className="px-3 py-1 rounded-lg text-xs font-bold"
                          style={{
                            background:
                              '#f1f5f9',
                            color:
                              '#475569'
                          }}
                        >
                          {d} days
                        </button>
                      ))}

                    </div>

                  </div>

                  <div>

                    <label
                      className="text-xs font-semibold mb-1 block"
                      style={{
                        color: '#475569'
                      }}
                    >
                      Plan Type
                    </label>

                    <select
                      value={extendPlan}
                      onChange={e =>
                        setExtendPlan(
                          e.target.value
                        )
                      }
                      className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none"
                      style={{
                        borderColor: '#e2e8f0'
                      }}
                    >
                      <option value="free_trial">
                        Free Trial
                      </option>

                      <option value="lite">
                        Lite Edition
                      </option>

                      <option value="zk">
                        ZK Edition
                      </option>
                    </select>

                  </div>

                </div>

                <div className="flex gap-3 mt-6">

                  <button
                    onClick={() =>
                      setExtendModal(null)
                    }
                    className="flex-1 py-3 rounded-xl text-sm font-semibold"
                    style={{
                      border:
                        '1.5px solid #e2e8f0',
                      color: '#475569'
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleExtend}
                    className="flex-1 py-3 rounded-xl text-white text-sm font-bold"
                    style={{
                      background: '#4f46e5'
                    }}
                  >
                    Update Plan
                  </button>

                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}