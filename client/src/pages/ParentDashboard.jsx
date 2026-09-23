import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Receipt, LogOut, ChevronRight, Bell, BellOff } from 'lucide-react'
import axios from 'axios'
import API_BASE_URL from '../config/api'

const paymentBlank = { amount: '', method: 'Cash', reference: '', screenshot: '' }

const categoryColors = {
  Announcement: { bg: '#e0e7ff', text: '#4338ca' },
  'Fee Reminder': { bg: '#fef3c7', text: '#b45309' },
  Attendance: { bg: '#d1fae5', text: '#059669' },
  Result: { bg: '#fce7f3', text: '#be185d' },
  Exam: { bg: '#fee2e2', text: '#dc2626' },
  Event: { bg: '#dbeafe', text: '#2563eb' },
  Admission: { bg: '#ecfccb', text: '#65a30d' },
}

export default function ParentDashboard() {
  const navigate = useNavigate()
  const parentName = localStorage.getItem('parentName') || 'Parent'

  const [tab, setTab] = useState('children') // 'children' | 'notifications'

  const [children, setChildren] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [notifications, setNotifications] = useState([])
  const [notifLoading, setNotifLoading] = useState(true)

  const [selectedStudent, setSelectedStudent] = useState(null)
  const [fees, setFees] = useState([])
  const [feesLoading, setFeesLoading] = useState(false)

  const [payTarget, setPayTarget] = useState(null)
  const [payForm, setPayForm] = useState(paymentBlank)
  const [payLoading, setPayLoading] = useState(false)
  const [receipt, setReceipt] = useState(null)

  const loadChildren = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/parent/me/children`)
      setChildren(data)
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load your children.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadNotifications = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/parent/notifications`)
      setNotifications(data)
    } catch { /* non-critical */ }
    finally { setNotifLoading(false) }
  }, [])

  const markNotificationRead = async (id) => {
    try {
      await axios.patch(`${API_BASE_URL}/parent/notifications/${id}/read`)
      setNotifications(list => list.map(n => n._id === id ? { ...n, read: true } : n))
    } catch { /* non-critical */ }
  }

  useEffect(() => { loadChildren(); loadNotifications() }, [loadChildren, loadNotifications])
  const unreadCount = notifications.filter(n => !n.read).length

  const openChild = async (student) => {
    setSelectedStudent(student)
    setFeesLoading(true)
    setError('')
    try {
      const { data } = await axios.get(`${API_BASE_URL}/parent/students/${student._id}/fees`)
      setFees(data)
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load fee records.')
    } finally {
      setFeesLoading(false)
    }
  }

  const openPayment = fee => {
    setPayTarget(fee)
    setPayForm({ ...paymentBlank, amount: fee.balance || '' })
    setError('')
  }

  const onScreenshotChange = e => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Only JPEG, PNG or WebP images are allowed.')
      return
    }
    if (file.size > 500 * 1024) {
      setError('Screenshot must be under 500KB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setPayForm(f => ({ ...f, screenshot: reader.result }))
    reader.readAsDataURL(file)
  }

  const submitPayment = async event => {
    event.preventDefault()
    if (!payTarget) return
    setPayLoading(true)
    setError('')
    try {
      const { data } = await axios.post(`${API_BASE_URL}/parent/fees/${payTarget._id}/payments`, payForm)
      if (selectedStudent) await openChild(selectedStudent)
      await loadChildren()
      if (data.status === 'Completed') setReceipt(data)
      setPayTarget(null)
      setPayForm(paymentBlank)
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to record payment.')
    } finally {
      setPayLoading(false)
    }
  }

  const logout = () => {
    const schoolId = localStorage.getItem('parentSchoolId') || ''
    localStorage.removeItem('parentAuthToken')
    localStorage.removeItem('parentSchoolId')
    localStorage.removeItem('parentName')
    navigate(`/community/${schoolId}/login`)
  }

  return (
    <div className="min-h-screen" style={{ background: '#f8fafc' }}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Hi, {parentName}</h1>
            <p className="text-sm text-slate-500">Your children's fee status</p>
          </div>
          <button onClick={logout} className="flex items-center gap-1 text-sm text-slate-500 hover:text-red-600">
            <LogOut size={16} /> Logout
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('children')}
            className="px-4 py-2 rounded-xl text-sm font-bold"
            style={{ background: tab === 'children' ? '#4f46e5' : '#fff', color: tab === 'children' ? '#fff' : '#64748b', border: '1px solid #e2e8f0' }}
          >
            My Children
          </button>
          <button
            onClick={() => setTab('notifications')}
            className="relative px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
            style={{ background: tab === 'notifications' ? '#4f46e5' : '#fff', color: tab === 'notifications' ? '#fff' : '#64748b', border: '1px solid #e2e8f0' }}
          >
            <Bell size={14} /> Notifications
            {unreadCount > 0 && (
              <span className="text-xs font-bold rounded-full px-1.5" style={{ background: tab === 'notifications' ? 'rgba(255,255,255,0.25)' : '#fef2f2', color: tab === 'notifications' ? '#fff' : '#dc2626' }}>
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl text-sm mb-4" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}

        {tab === 'children' && (
        <>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : children.length === 0 ? (
          <p className="text-sm text-slate-500">No children linked to this account yet.</p>
        ) : (
          <div className="flex flex-col gap-3 mb-8">
            {children.map(({ student, outstanding }) => (
              <button
                key={student._id}
                onClick={() => openChild(student)}
                className="flex items-center justify-between bg-white rounded-2xl p-4 text-left transition-all hover:shadow-md"
                style={{ border: selectedStudent?._id === student._id ? '2px solid #4f46e5' : '1px solid #e2e8f0' }}
              >
                <div>
                  <div className="font-bold text-sm">{student.name}</div>
                  <div className="text-xs text-slate-500">Roll {student.rollNumber} {student.grade ? `· ${student.grade}` : ''}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`text-sm font-bold ${outstanding > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {outstanding > 0 ? `PKR ${outstanding.toLocaleString()} due` : 'Fully paid'}
                  </div>
                  <ChevronRight size={18} className="text-slate-400" />
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedStudent && (
          <div>
            <h2 className="font-bold text-sm mb-3">{selectedStudent.name}'s Fee Records</h2>
            {feesLoading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : fees.length === 0 ? (
              <p className="text-sm text-slate-500">No fee records yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {fees.map(fee => (
                  <div key={fee._id} className="flex items-center justify-between bg-white rounded-xl p-4" style={{ border: '1px solid #e2e8f0' }}>
                    <div>
                      <div className="text-sm font-semibold">{fee.feeType} · {fee.month}</div>
                      <div className="text-xs text-slate-500">
                        PKR {Number(fee.amount).toLocaleString()} total · PKR {Number(fee.paid).toLocaleString()} paid
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className="text-xs font-bold px-3 py-1 rounded-full"
                        style={{
                          background: fee.status === 'Paid' ? '#d1fae5' : fee.status === 'Overdue' ? '#fee2e2' : '#fef3c7',
                          color: fee.status === 'Paid' ? '#059669' : fee.status === 'Overdue' ? '#dc2626' : '#b45309'
                        }}
                      >
                        {fee.status}
                      </span>
                      {fee.balance > 0 && (
                        <button
                          onClick={() => openPayment(fee)}
                          className="text-xs font-bold px-3 py-2 rounded-lg text-white"
                          style={{ background: '#4f46e5' }}
                        >
                          Pay PKR {Number(fee.balance).toLocaleString()}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </>
        )}

        {tab === 'notifications' && (
          notifLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : notifications.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <BellOff className="mx-auto mb-2" size={28} />
              <p className="text-sm">No notifications yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {notifications.map(n => {
                const colors = categoryColors[n.category] || categoryColors.Announcement
                return (
                  <div
                    key={n._id}
                    onClick={() => !n.read && markNotificationRead(n._id)}
                    className="bg-white rounded-xl p-4 cursor-pointer"
                    style={{ border: n.read ? '1px solid #e2e8f0' : '1px solid #4f46e5' }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: colors.bg, color: colors.text }}>
                        {n.category}
                      </span>
                      <div className="flex items-center gap-2">
                        {n.studentId?.name && <span className="text-xs text-slate-400">{n.studentId.name}</span>}
                        {!n.read && <span className="w-2 h-2 rounded-full" style={{ background: '#4f46e5' }} />}
                        <span className="text-xs text-slate-400">{new Date(n.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="font-semibold text-sm">{n.title}</div>
                    <div className="text-sm text-slate-600 mt-0.5">{n.message}</div>
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>

      {/* Payment modal — same fields/behavior as the school's own payment form */}
      {payTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <form onSubmit={submitPayment} className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-1">Pay Fee</h3>
            <p className="text-sm text-slate-500 mb-4">
              {payTarget.feeType} · {payTarget.month} — Balance: PKR {Number(payTarget.balance).toLocaleString()}
            </p>
            <div className="space-y-3">
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                max={payTarget.balance}
                placeholder="Amount"
                value={payForm.amount}
                onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                className="w-full px-3 py-3 rounded-xl border-2 text-sm outline-none"
                style={{ borderColor: '#e2e8f0' }}
              />
              <select
                required
                value={payForm.method}
                onChange={e => setPayForm({ ...payForm, method: e.target.value })}
                className="w-full px-3 py-3 rounded-xl border-2 text-sm outline-none"
                style={{ borderColor: '#e2e8f0' }}
              >
                <option value="Cash">Cash (paid in person at school)</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="JazzCash">JazzCash</option>
                <option value="EasyPaisa">EasyPaisa</option>
                <option value="Other">Other</option>
              </select>
              {payForm.method !== 'Cash' && (
                <>
                  <input
                    placeholder="Transaction / Reference ID"
                    value={payForm.reference}
                    onChange={e => setPayForm({ ...payForm, reference: e.target.value })}
                    className="w-full px-3 py-3 rounded-xl border-2 text-sm outline-none"
                    style={{ borderColor: '#e2e8f0' }}
                  />
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Screenshot (optional, max 500KB)</label>
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onScreenshotChange} className="w-full text-sm" />
                    {payForm.screenshot && (
                      <img src={payForm.screenshot} alt="Preview" className="mt-2 max-h-32 rounded-lg border" />
                    )}
                  </div>
                  <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                    The school will verify this payment before it's marked as paid.
                  </p>
                </>
              )}
              {payForm.method === 'Cash' && (
                <p className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">
                  Only select Cash if you are paying this in person at the school office right now.
                </p>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => { setPayTarget(null); setPayForm(paymentBlank) }} className="flex-1 py-3 rounded-xl text-sm" style={{ border: '1px solid #e2e8f0' }}>Cancel</button>
              <button disabled={payLoading} className="flex-1 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-60" style={{ background: '#059669' }}>
                {payLoading ? 'Saving…' : 'Submit Payment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Receipt (only shown for immediately-completed payments) */}
      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl text-center">
            <Receipt className="mx-auto text-emerald-600 mb-2" size={32} />
            <h3 className="text-lg font-bold mb-1">Payment Recorded</h3>
            <p className="text-sm text-slate-500 mb-4">Receipt: {receipt.receiptNumber}</p>
            <p className="text-2xl font-bold text-emerald-700 mb-1">PKR {Number(receipt.amount).toLocaleString()}</p>
            <button
              type="button"
              onClick={() => setReceipt(null)}
              className="w-full py-2.5 rounded-xl text-white text-sm font-semibold mt-2"
              style={{ background: '#4f46e5' }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
