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

  // CEO password change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  const [ceoEmail, setCeoEmail] = useState('')
  const [newCeoEmail, setNewCeoEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailError, setEmailError] = useState('')

  const [payments, setPayments] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [methodForm, setMethodForm] = useState({
    type: 'jazzcash', label: '', accountDetail: '', accountTitle: '', instructions: '', isActive: true
  })
  const [editingMethodId, setEditingMethodId] = useState(null)
  const [methodSaving, setMethodSaving] = useState(false)
  const [methodError, setMethodError] = useState('')

  const navigate = useNavigate()

  useEffect(() => {
    if (!localStorage.getItem('ceoAuthToken')) {
      navigate('/ceo/login')
      return
    }

    fetchSchools()
    fetchLogs()
    fetchCeoProfile()
  }, [])

  useEffect(() => {
    if (activePage === 'payments') fetchPayments()
    if (activePage === 'methods') fetchPaymentMethods()
  }, [activePage])

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

  const fetchCeoProfile = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/profile`)
      setCeoEmail(res.data.email || '')
      setNewCeoEmail(res.data.email || '')
    } catch (err) {
      console.log(err)
    }
  }

  const fetchPayments = async () => {
    try {
      setPaymentsLoading(true)
      const res = await axios.get(`${API_BASE_URL}/admin/payments`)
      setPayments(res.data.payments || [])
    } catch (err) {
      console.log(err)
    } finally {
      setPaymentsLoading(false)
    }
  }

  const fetchPaymentMethods = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/payment-methods`)
      setPaymentMethods(res.data.methods || [])
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
    localStorage.removeItem('ceoAuthToken')
    navigate('/')
  }

  const handleCeoPasswordChange = async () => {
    setPasswordError('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill all password fields.')
      return
    }

    if (newPassword.length < 12) {
      setPasswordError('New password must be at least 12 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match.')
      return
    }

    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password.')
      return
    }

    try {
      setPasswordSaving(true)

      await axios.patch(`${API_BASE_URL}/admin/change-password`, {
        currentPassword,
        newPassword,
        confirmPassword,
      })

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      showToast('🔐 Password changed successfully!')
    } catch (err) {
      setPasswordError(
        err.response?.data?.error ||
          'Unable to change password. Please try again.'
      )
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleCeoEmailChange = async () => {
    setEmailError('')
    if (!newCeoEmail || !emailPassword) {
      setEmailError('New email and current password are required.')
      return
    }
    try {
      setEmailSaving(true)
      const res = await axios.patch(`${API_BASE_URL}/admin/change-email`, {
        newEmail: newCeoEmail,
        currentPassword: emailPassword,
      })
      if (res.data.token) {
        localStorage.setItem('ceoAuthToken', res.data.token)
      }
      setCeoEmail(res.data.email)
      setNewCeoEmail(res.data.email)
      setEmailPassword('')
      showToast('Email updated successfully')
    } catch (err) {
      setEmailError(err.response?.data?.error || 'Unable to update email.')
    } finally {
      setEmailSaving(false)
    }
  }

  const handleApprovePayment = async (id) => {
    try {
      await axios.patch(`${API_BASE_URL}/admin/payments/${id}/approve`)
      showToast('Payment approved. Invoice generated.')
      fetchPayments()
      fetchSchools()
    } catch (err) {
      showToast(err.response?.data?.error || 'Approve failed')
    }
  }

  const handleRejectPayment = async (id) => {
    const reason = window.prompt('Rejection reason (optional):') || ''
    try {
      await axios.patch(`${API_BASE_URL}/admin/payments/${id}/reject`, { reason })
      showToast('Payment rejected')
      fetchPayments()
    } catch (err) {
      showToast(err.response?.data?.error || 'Reject failed')
    }
  }

  const resetMethodForm = () => {
    setEditingMethodId(null)
    setMethodForm({
      type: 'jazzcash', label: '', accountDetail: '', accountTitle: '', instructions: '', isActive: true
    })
    setMethodError('')
  }

  const handleSaveMethod = async () => {
    setMethodError('')
    if (!methodForm.label || !methodForm.accountDetail) {
      setMethodError('Label and account detail are required.')
      return
    }
    try {
      setMethodSaving(true)
      if (editingMethodId) {
        await axios.patch(`${API_BASE_URL}/admin/payment-methods/${editingMethodId}`, methodForm)
        showToast('Payment method updated')
      } else {
        await axios.post(`${API_BASE_URL}/admin/payment-methods`, methodForm)
        showToast('Payment method added')
      }
      resetMethodForm()
      fetchPaymentMethods()
    } catch (err) {
      setMethodError(err.response?.data?.error || 'Save failed')
    } finally {
      setMethodSaving(false)
    }
  }

  const handleEditMethod = (m) => {
    setEditingMethodId(m._id)
    setMethodForm({
      type: m.type,
      label: m.label,
      accountDetail: m.accountDetail,
      accountTitle: m.accountTitle || '',
      instructions: m.instructions || '',
      isActive: m.isActive !== false,
    })
  }

  const handleDeleteMethod = async (id) => {
    if (!window.confirm('Delete this payment method?')) return
    try {
      await axios.delete(`${API_BASE_URL}/admin/payment-methods/${id}`)
      showToast('Payment method deleted')
      fetchPaymentMethods()
    } catch (err) {
      showToast(err.response?.data?.error || 'Delete failed')
    }
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
    },
    {
      id: 'payments',
      icon: '💳',
      label: 'Payments'
    },
    {
      id: 'methods',
      icon: '🏦',
      label: 'Pay Methods'
    },
    {
      id: 'security',
      icon: '🔐',
      label: 'Security'
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


              {/* PAYMENTS */}
              {activePage === 'payments' && (
                <div>
                  <div className="bg-white rounded-2xl border" style={{ borderColor: '#e2e8f0' }}>
                    <div className="px-6 py-5" style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <h3 className="font-bold text-base">Payments</h3>
                      <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                        Approve pending payments to activate school plans and generate invoices.
                      </p>
                    </div>
                    {paymentsLoading ? (
                      <div className="text-center py-16 text-slate-400">Loading payments...</div>
                    ) : payments.length === 0 ? (
                      <div className="text-center py-16 text-slate-400">No payments yet</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr style={{ background: '#f8fafc' }}>
                              {['School', 'Plan', 'Amount', 'Method', 'Txn ID', 'Status', 'Date', 'Action'].map(h => (
                                <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase" style={{ color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {payments.map(p => (
                              <tr key={p._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td className="px-4 py-3 text-sm">
                                  <div className="font-semibold">{p.schoolName}</div>
                                  <div className="text-xs" style={{ color: '#94a3b8' }}>{p.schoolEmail}</div>
                                </td>
                                <td className="px-4 py-3 text-sm capitalize">{p.plan}</td>
                                <td className="px-4 py-3 text-sm font-semibold">PKR {Number(p.amount).toLocaleString('en-PK')}</td>
                                <td className="px-4 py-3 text-sm">{p.methodLabel}</td>
                                <td className="px-4 py-3 text-sm font-mono text-xs">{p.transactionId}</td>
                                <td className="px-4 py-3 text-sm">
                                  <span className="px-2 py-1 rounded-full text-xs font-bold" style={{
                                    background: p.status === 'paid' ? '#ecfdf5' : p.status === 'pending' ? '#fff7ed' : '#fef2f2',
                                    color: p.status === 'paid' ? '#059669' : p.status === 'pending' ? '#c2410c' : '#dc2626'
                                  }}>{p.status}</span>
                                  {p.invoiceNumber && <div className="text-xs mt-1" style={{ color: '#64748b' }}>{p.invoiceNumber}</div>}
                                </td>
                                <td className="px-4 py-3 text-xs" style={{ color: '#64748b' }}>{formatDateTime(p.createdAt)}</td>
                                <td className="px-4 py-3 text-sm">
                                  {p.status === 'pending' && (
                                    <div className="flex gap-2">
                                      <button onClick={() => handleApprovePayment(p._id)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: '#059669' }}>Approve</button>
                                      <button onClick={() => handleRejectPayment(p._id)} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: '#fef2f2', color: '#dc2626' }}>Reject</button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PAYMENT METHODS */}
              {activePage === 'methods' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#e2e8f0' }}>
                    <h3 className="font-bold text-base mb-1">{editingMethodId ? 'Edit method' : 'Add payment method'}</h3>
                    <p className="text-xs mb-5" style={{ color: '#94a3b8' }}>These details are shown to schools on the upgrade form.</p>
                    {methodError && (
                      <div className="mb-4 px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: '#fef2f2', color: '#dc2626' }}>{methodError}</div>
                    )}
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="text-xs font-semibold mb-1 block" style={{ color: '#475569' }}>Type</label>
                        <select value={methodForm.type} onChange={e => setMethodForm(f => ({ ...f, type: e.target.value }))} className="w-full px-4 py-3 rounded-xl border-2 text-sm" style={{ borderColor: '#e2e8f0' }}>
                          <option value="jazzcash">JazzCash</option>
                          <option value="easypaisa">EasyPaisa</option>
                          <option value="bank">Bank Transfer</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold mb-1 block" style={{ color: '#475569' }}>Label</label>
                        <input value={methodForm.label} onChange={e => setMethodForm(f => ({ ...f, label: e.target.value }))} className="w-full px-4 py-3 rounded-xl border-2 text-sm" style={{ borderColor: '#e2e8f0' }} placeholder="JazzCash" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold mb-1 block" style={{ color: '#475569' }}>Account / Number</label>
                        <input value={methodForm.accountDetail} onChange={e => setMethodForm(f => ({ ...f, accountDetail: e.target.value }))} className="w-full px-4 py-3 rounded-xl border-2 text-sm" style={{ borderColor: '#e2e8f0' }} placeholder="0300-1234567" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold mb-1 block" style={{ color: '#475569' }}>Account Title</label>
                        <input value={methodForm.accountTitle} onChange={e => setMethodForm(f => ({ ...f, accountTitle: e.target.value }))} className="w-full px-4 py-3 rounded-xl border-2 text-sm" style={{ borderColor: '#e2e8f0' }} placeholder="Vends EduCore" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold mb-1 block" style={{ color: '#475569' }}>Instructions</label>
                        <textarea value={methodForm.instructions} onChange={e => setMethodForm(f => ({ ...f, instructions: e.target.value }))} rows={3} className="w-full px-4 py-3 rounded-xl border-2 text-sm" style={{ borderColor: '#e2e8f0' }} placeholder="How schools should pay" />
                      </div>
                      <label className="flex items-center gap-2 text-sm" style={{ color: '#475569' }}>
                        <input type="checkbox" checked={methodForm.isActive} onChange={e => setMethodForm(f => ({ ...f, isActive: e.target.checked }))} />
                        Active (visible to schools)
                      </label>
                      <div className="flex gap-3">
                        <button type="button" onClick={handleSaveMethod} disabled={methodSaving} className="px-6 py-3 rounded-xl text-white text-sm font-bold" style={{ background: '#4f46e5' }}>
                          {methodSaving ? 'Saving...' : (editingMethodId ? 'Update Method' : 'Add Method')}
                        </button>
                        {editingMethodId && (
                          <button type="button" onClick={resetMethodForm} className="px-6 py-3 rounded-xl text-sm font-semibold" style={{ border: '1.5px solid #e2e8f0', color: '#475569' }}>Cancel</button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#e2e8f0' }}>
                    <h3 className="font-bold text-base mb-4">Configured methods</h3>
                    {paymentMethods.length === 0 ? (
                      <div className="text-sm text-slate-400">No methods yet. Add one on the left.</div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {paymentMethods.map(m => (
                          <div key={m._id} className="p-4 rounded-xl border" style={{ borderColor: '#e2e8f0' }}>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-bold text-sm">{m.label} {!m.isActive && <span className="text-xs font-semibold" style={{ color: '#dc2626' }}>· inactive</span>}</div>
                                <div className="text-sm mt-1" style={{ color: '#475569' }}>{m.accountDetail}</div>
                                {m.accountTitle && <div className="text-xs mt-1" style={{ color: '#94a3b8' }}>{m.accountTitle}</div>}
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => handleEditMethod(m)} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: '#eef2ff', color: '#4f46e5' }}>Edit</button>
                                <button onClick={() => handleDeleteMethod(m._id)} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: '#fef2f2', color: '#dc2626' }}>Delete</button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECURITY / CHANGE PASSWORD */}
              {activePage === 'security' && (
                <div className="max-w-xl">
                  <div
                    className="bg-white rounded-2xl border p-8 mb-6"
                    style={{ borderColor: '#e2e8f0' }}
                  >
                    <h3
                      className="font-bold text-lg mb-2"
                      style={{ fontFamily: 'Syne,sans-serif' }}
                    >
                      Account Email
                    </h3>
                    <p className="text-sm mb-5" style={{ color: '#64748b' }}>
                      Current login email: <strong>{ceoEmail || '—'}</strong>
                    </p>
                    {emailError && (
                      <div className="mb-4 px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                        {emailError}
                      </div>
                    )}
                    <div className="mb-4">
                      <label className="text-xs font-semibold mb-1 block" style={{ color: '#475569' }}>New Email</label>
                      <input
                        type="email"
                        value={newCeoEmail}
                        onChange={(e) => setNewCeoEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none"
                        style={{ borderColor: '#e2e8f0' }}
                        placeholder="ceo@yourdomain.com"
                      />
                    </div>
                    <div className="mb-5">
                      <label className="text-xs font-semibold mb-1 block" style={{ color: '#475569' }}>Current Password (confirm)</label>
                      <input
                        type="password"
                        value={emailPassword}
                        onChange={(e) => setEmailPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none"
                        style={{ borderColor: '#e2e8f0' }}
                        placeholder="Enter current password"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCeoEmailChange}
                      disabled={emailSaving}
                      className="px-8 py-3 rounded-xl text-white font-bold text-sm"
                      style={{ background: emailSaving ? '#f87171' : 'linear-gradient(135deg,#ef4444,#dc2626)', cursor: emailSaving ? 'not-allowed' : 'pointer' }}
                    >
                      {emailSaving ? 'Updating...' : 'Update Email'}
                    </button>
                  </div>

                  <div
                    className="bg-white rounded-2xl border p-8"
                    style={{ borderColor: '#e2e8f0' }}
                  >
                    <h3
                      className="font-bold text-lg mb-2"
                      style={{ fontFamily: 'Syne,sans-serif' }}
                    >
                      Change CEO Password
                    </h3>

                    <p
                      className="text-sm mb-6"
                      style={{ color: '#64748b' }}
                    >
                      Update your CEO account password. Minimum 12 characters.
                      You will stay logged in after changing.
                    </p>

                    {passwordError && (
                      <div
                        className="mb-5 px-4 py-3 rounded-xl text-sm font-semibold"
                        style={{
                          background: '#fef2f2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                        }}
                      >
                        {passwordError}
                      </div>
                    )}

                    <div className="mb-5">
                      <label
                        className="text-xs font-semibold mb-1 block"
                        style={{ color: '#475569' }}
                      >
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                          autoComplete="current-password"
                          className="w-full px-4 py-3 pr-12 rounded-xl border-2 text-sm outline-none focus:border-red-500 transition-all"
                          style={{ borderColor: '#e2e8f0' }}
                        />
                        <button
                          type="button"
                          aria-label={
                            showCurrentPassword
                              ? 'Hide password'
                              : 'Show password'
                          }
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setShowCurrentPassword((p) => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-lg transition-all"
                          style={{
                            color: '#64748b',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          {showCurrentPassword ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 2l20 20" /><path d="M6.7 6.7C4.9 8 3.5 9.8 2.5 12c2.1 4.5 6 7 9.5 7 1.5 0 2.9-.4 4.2-1.1" /><path d="M10.6 5.1C11.1 5 11.5 5 12 5c3.5 0 7.4 2.5 9.5 7-.6 1.3-1.4 2.4-2.3 3.4" /><path d="M9.9 9.9a3 3 0 004.2 4.2" /></svg>
                          ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="mb-5">
                      <label
                        className="text-xs font-semibold mb-1 block"
                        style={{ color: '#475569' }}
                      >
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 12 characters"
                          autoComplete="new-password"
                          className="w-full px-4 py-3 pr-12 rounded-xl border-2 text-sm outline-none focus:border-red-500 transition-all"
                          style={{ borderColor: '#e2e8f0' }}
                        />
                        <button
                          type="button"
                          aria-label={
                            showNewPassword
                              ? 'Hide password'
                              : 'Show password'
                          }
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setShowNewPassword((p) => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-lg transition-all"
                          style={{
                            color: '#64748b',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          {showNewPassword ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 2l20 20" /><path d="M6.7 6.7C4.9 8 3.5 9.8 2.5 12c2.1 4.5 6 7 9.5 7 1.5 0 2.9-.4 4.2-1.1" /><path d="M10.6 5.1C11.1 5 11.5 5 12 5c3.5 0 7.4 2.5 9.5 7-.6 1.3-1.4 2.4-2.3 3.4" /><path d="M9.9 9.9a3 3 0 004.2 4.2" /></svg>
                          ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="mb-6">
                      <label
                        className="text-xs font-semibold mb-1 block"
                        style={{ color: '#475569' }}
                      >
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter new password"
                          autoComplete="new-password"
                          className="w-full px-4 py-3 pr-12 rounded-xl border-2 text-sm outline-none focus:border-red-500 transition-all"
                          style={{ borderColor: '#e2e8f0' }}
                        />
                        <button
                          type="button"
                          aria-label={
                            showConfirmPassword
                              ? 'Hide password'
                              : 'Show password'
                          }
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setShowConfirmPassword((p) => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-lg transition-all"
                          style={{
                            color: '#64748b',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          {showConfirmPassword ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 2l20 20" /><path d="M6.7 6.7C4.9 8 3.5 9.8 2.5 12c2.1 4.5 6 7 9.5 7 1.5 0 2.9-.4 4.2-1.1" /><path d="M10.6 5.1C11.1 5 11.5 5 12 5c3.5 0 7.4 2.5 9.5 7-.6 1.3-1.4 2.4-2.3 3.4" /><path d="M9.9 9.9a3 3 0 004.2 4.2" /></svg>
                          ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCeoPasswordChange}
                      disabled={passwordSaving}
                      className="px-8 py-3 rounded-xl text-white font-bold text-sm transition-all"
                      style={{
                        background: passwordSaving ? '#f87171' : 'linear-gradient(135deg,#ef4444,#dc2626)',
                        cursor: passwordSaving ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {passwordSaving ? 'Updating...' : 'Change Password ✓'}
                    </button>
                  </div>

                  <div
                    className="mt-4 px-4 py-3 rounded-xl text-xs"
                    style={{
                      background: '#fff7ed',
                      color: '#9a3412',
                      border: '1px solid #fed7aa',
                    }}
                  >
                    <strong>Note:</strong> Keep your email and password private. After changing email, use the new email on next login.
                  </div>
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
