import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Receipt, LogOut, ChevronRight, Bell, BellOff, MessageCircle, Settings as SettingsIcon, Users, ArrowLeft } from 'lucide-react'
import axios from 'axios'
import API_BASE_URL from '../config/api'
import ChatWindow from '../components/ChatWindow'

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

  const [tab, setTab] = useState('messages') // 'children' | 'notifications' | 'messages' | 'settings'

  const [children, setChildren] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [notifications, setNotifications] = useState([])
  const [notifLoading, setNotifLoading] = useState(true)

  const [chatMessages, setChatMessages] = useState([])
  const [chatCaps, setChatCaps] = useState(null)
  const [chatSending, setChatSending] = useState(false)
  const chatPollRef = useRef(null)

  const [photo, setPhoto] = useState(localStorage.getItem('parentPhoto') || '')
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' })
  const [settingsError, setSettingsError] = useState('')
  const [settingsSuccess, setSettingsSuccess] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)

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

  const loadConversation = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/parent/conversation`)
      setChatMessages(data.messages)
    } catch { /* silent — polling */ }
  }, [])

  useEffect(() => {
    axios.get(`${API_BASE_URL}/parent/chat-capabilities`)
      .then(({ data }) => setChatCaps(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (tab !== 'messages') return
    loadConversation()
    chatPollRef.current = setInterval(loadConversation, 6000)
    return () => clearInterval(chatPollRef.current)
  }, [tab, loadConversation])

  const sendChatMessage = async (payload) => {
    const body = typeof payload === 'string' ? { text: payload } : payload
    setChatSending(true)
    try {
      const { data } = await axios.post(`${API_BASE_URL}/parent/conversation/messages`, {
        text: body.text || '',
        mediaType: body.mediaType || 'none',
        mediaData: body.mediaData || '',
      })
      setChatMessages(m => [...m, data])
    } catch { /* best-effort */ } finally {
      setChatSending(false)
    }
  }

  const onPhotoChange = e => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      setSettingsError('Only JPEG, PNG or WebP images are allowed.'); return
    }
    if (file.size > 500 * 1024) { setSettingsError('Photo must be under 500KB.'); return }
    const reader = new FileReader()
    reader.onload = async () => {
      setSettingsError(''); setSettingsSuccess('')
      try {
        await axios.patch(`${API_BASE_URL}/parent/photo`, { photo: reader.result })
        setPhoto(reader.result)
        localStorage.setItem('parentPhoto', reader.result)
        setSettingsSuccess('Profile photo updated.')
      } catch (err) {
        setSettingsError(err.response?.data?.error || 'Unable to update photo.')
      }
    }
    reader.readAsDataURL(file)
  }

  const submitPasswordChange = async e => {
    e.preventDefault()
    setSettingsError(''); setSettingsSuccess('')
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      setSettingsError('New password must be at least 6 characters.'); return
    }
    setSavingSettings(true)
    try {
      await axios.post(`${API_BASE_URL}/parent/change-password`, passwordForm)
      setSettingsSuccess('Password updated.')
      setPasswordForm({ currentPassword: '', newPassword: '' })
    } catch (err) {
      setSettingsError(err.response?.data?.error || 'Unable to update password.')
    } finally {
      setSavingSettings(false)
    }
  }

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
    const digital = ['Bank Transfer', 'JazzCash', 'EasyPaisa', 'Other'].includes(payForm.method)
    if (digital && !String(payForm.reference || '').trim()) {
      setError('Enter the transaction reference ID from JazzCash / EasyPaisa / bank.')
      return
    }
    // Receipt: attach in Messages chat with school admin (not required here)
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
    localStorage.removeItem('parentPhoto')
    navigate(`/community/${schoolId}/login`)
  }

  return (
    <div
      className="flex flex-col bg-[#f0f2f5] overflow-hidden"
      style={{ height: '100dvh', maxHeight: '100dvh' }}
    >
      {/* ===== Mobile app header (WhatsApp-style) ===== */}
      <header
        className="md:hidden shrink-0 flex items-center gap-2 px-3 bg-white"
        style={{
          height: 56,
          borderBottom: '1px solid #e2e8f0',
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        <button
          type="button"
          onClick={() => setTab('children')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold shrink-0"
          style={{
            background: tab === 'children' ? '#eef2ff' : '#f8fafc',
            color: '#4f46e5',
            border: '1px solid #e0e7ff',
          }}
        >
          <Users size={14} />
          My Children
        </button>
        <div className="flex-1 text-center min-w-0">
          <div className="font-bold text-[15px] truncate" style={{ color: '#4f46e5', fontFamily: 'Syne, sans-serif' }}>
            V-Community
          </div>
        </div>
        <div className="w-[88px] shrink-0" />
      </header>

      {/* ===== Desktop header + tabs ===== */}
      <div className="hidden md:block shrink-0 bg-white border-b" style={{ borderColor: '#e2e8f0' }}>
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-indigo-600">V-Community</div>
            <h1 className="text-xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Hi, {parentName}</h1>
            <p className="text-sm text-slate-500">Your children&apos;s fee status</p>
          </div>
          <button type="button" onClick={logout} className="flex items-center gap-1 text-sm text-slate-500 hover:text-red-600">
            <LogOut size={16} /> Logout
          </button>
        </div>
        <div className="max-w-3xl mx-auto px-4 flex gap-2 pb-3">
          {[
            { id: 'children', label: 'My Children' },
            { id: 'notifications', label: 'Notifications' },
            { id: 'messages', label: 'Messages' },
            { id: 'settings', label: 'Settings' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className="px-4 py-2 rounded-xl text-sm font-bold relative"
              style={{
                background: tab === item.id ? '#4f46e5' : '#fff',
                color: tab === item.id ? '#fff' : '#64748b',
                border: '1px solid #e2e8f0',
              }}
            >
              {item.label}
              {item.id === 'notifications' && unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                  style={{ background: '#dc2626' }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ===== Main content ===== */}
      <main
        className={`flex-1 min-h-0 flex flex-col ${
          tab === 'messages' ? 'overflow-hidden' : 'overflow-y-auto'
        }`}
      >
        {error && (
          <div className="mx-3 mt-3 px-4 py-3 rounded-xl text-sm shrink-0" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}

        {/* Children */}
        {tab === 'children' && (
          <div className="max-w-3xl mx-auto w-full px-3 py-3 md:px-4 md:py-6 pb-24 md:pb-6">
            <h2 className="md:hidden text-lg font-bold mb-3" style={{ fontFamily: 'Syne, sans-serif' }}>
              Hi, {parentName}
            </h2>
            {loading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : children.length === 0 ? (
              <p className="text-sm text-slate-500">No children linked to this account yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {children.map((row) => {
                  const child = row.student || row
                  return (
                  <button
                    key={child._id}
                    type="button"
                    onClick={() => openChild(child)}
                    className="bg-white rounded-2xl p-4 text-left flex items-center gap-3 shadow-sm"
                    style={{ border: '1px solid #e2e8f0' }}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                      style={{ background: '#4f46e5' }}
                    >
                      {(child.name || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate">{child.name}</div>
                      <div className="text-xs text-slate-500">
                        Roll {child.rollNumber || '—'}
                        {child.grade ? ` · ${child.grade}` : ''}
                        {typeof row.outstanding === 'number' ? ` · Due PKR ${Number(row.outstanding).toLocaleString()}` : ''}
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-400 shrink-0" />
                  </button>
                  )
                })}
              </div>
            )}

            {selectedStudent && (
              <div className="mt-4 bg-white rounded-2xl p-4" style={{ border: '1px solid #e2e8f0' }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold">{selectedStudent.name} — Fees</h3>
                  <button type="button" className="text-xs text-slate-500" onClick={() => setSelectedStudent(null)}>
                    Close
                  </button>
                </div>
                {feesLoading ? (
                  <p className="text-sm text-slate-500">Loading fee records…</p>
                ) : fees.length === 0 ? (
                  <p className="text-sm text-slate-500">No fee records.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {fees.map((fee) => (
                      <div key={fee._id} className="flex items-center justify-between gap-2 py-2 border-b last:border-0" style={{ borderColor: '#f1f5f9' }}>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold">{fee.feeType || 'Fee'} {fee.month ? `· ${fee.month}` : ''}</div>
                          <div className="text-xs text-slate-500">
                            Balance: PKR {Number(fee.balance || 0).toLocaleString()} · {fee.status || ''}
                          </div>
                        </div>
                        {Number(fee.balance) > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              openPayment(fee)
                              setPayForm(paymentBlank)
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white shrink-0"
                            style={{ background: '#059669' }}
                          >
                            Pay Fee
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Notifications */}
        {tab === 'notifications' && (
          <div className="max-w-3xl mx-auto w-full px-3 py-3 md:px-4 md:py-6 pb-24 md:pb-6">
            <h2 className="md:hidden font-bold text-base mb-3">Notifications</h2>
            {notifLoading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : notifications.length === 0 ? (
              <div className="text-center text-slate-400 py-16">
                <BellOff className="mx-auto mb-2" size={28} />
                <p className="text-sm">No notifications yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {notifications.map((n) => {
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
            )}
          </div>
        )}

        {/* Messages — full-height chat shell */}
        {tab === 'messages' && (
          <div className="flex-1 min-h-0 flex flex-col bg-[#efeae2]">
            <div
              className="shrink-0 flex items-center gap-3 px-3 bg-[#f0f2f5] md:bg-white border-b"
              style={{ height: 56, borderColor: '#e2e8f0' }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                style={{ background: '#4f46e5' }}
              >
                SA
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm truncate">School Admin</div>
                <div className="text-[11px] text-slate-500">V-Community · school office</div>
              </div>
            </div>
            <div className="flex-1 min-h-0 pb-14 md:pb-0">
              <ChatWindow
                messages={chatMessages}
                mySenderType="parent"
                onSend={sendChatMessage}
                sending={chatSending}
                emptyText="No messages yet. Send the school a message anytime."
                chatCaps={chatCaps}
              />
            </div>
          </div>
        )}

        {/* Settings */}
        {tab === 'settings' && (
          <div className="max-w-md mx-auto w-full px-3 py-3 md:px-4 md:py-6 pb-24 md:pb-6 flex flex-col gap-4">
            <h2 className="md:hidden font-bold text-base">Settings</h2>
            {settingsError && (
              <div className="px-4 py-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                {settingsError}
              </div>
            )}
            {settingsSuccess && (
              <div className="px-4 py-3 rounded-xl text-sm" style={{ background: '#d1fae5', color: '#059669' }}>
                {settingsSuccess}
              </div>
            )}
            <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #e2e8f0' }}>
              <p className="text-xs font-bold text-slate-500 mb-3">PROFILE PHOTO</p>
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-xl shrink-0"
                  style={{ background: '#4f46e5' }}
                >
                  {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : parentName[0]?.toUpperCase()}
                </div>
                <label className="px-4 py-2 rounded-xl text-sm font-bold cursor-pointer" style={{ border: '1px solid #e2e8f0' }}>
                  Change Photo
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhotoChange} className="hidden" />
                </label>
              </div>
              <p className="text-xs text-slate-400 mt-2">Shown next to your messages. Max 500KB.</p>
            </div>
            <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #e2e8f0' }}>
              <p className="text-xs font-bold text-slate-500 mb-3">CHANGE PASSWORD</p>
              <form onSubmit={submitPasswordChange} className="flex flex-col gap-3">
                <input
                  type="password"
                  placeholder="Current password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: '#e2e8f0' }}
                />
                <input
                  type="password"
                  placeholder="New password (min 6 characters)"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: '#e2e8f0' }}
                />
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-60"
                  style={{ background: '#4f46e5' }}
                >
                  {savingSettings ? 'Saving…' : 'Update Password'}
                </button>
              </form>
            </div>
            <button
              type="button"
              onClick={logout}
              className="md:hidden flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-red-600 bg-white"
              style={{ border: '1px solid #fecaca' }}
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        )}
      </main>

      {/* Pay Fee modal */}
      {payTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <form onSubmit={submitPayment} className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-1">Pay Fee</h3>
            <p className="text-sm text-slate-500 mb-4">
              {payTarget.feeType || 'Fee'}
              {payTarget.month ? ` · ${payTarget.month}` : ''} · Balance PKR {Number(payTarget.balance || 0).toLocaleString()}
            </p>
            <div className="flex flex-col gap-3">
              <input
                placeholder="Amount"
                value={payForm.amount}
                onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                className="w-full px-3 py-3 rounded-xl border-2 text-sm outline-none"
                style={{ borderColor: '#e2e8f0' }}
                required
              />
              <select
                value={payForm.method}
                onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}
                className="w-full px-3 py-3 rounded-xl border-2 text-sm outline-none"
                style={{ borderColor: '#e2e8f0' }}
              >
                <option value="Cash">Cash</option>
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
                    onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })}
                    className="w-full px-3 py-3 rounded-xl border-2 text-sm outline-none"
                    style={{ borderColor: '#e2e8f0' }}
                  />
                  <div className="text-xs text-slate-700 bg-indigo-50 border border-indigo-100 px-3 py-2.5 rounded-xl space-y-2">
                    <p className="font-semibold text-indigo-900">Receipt / screenshot</p>
                    <p>
                      Submit payment yahan se karein. Receipt ka photo ya PDF <strong>Messages</strong> tab mein School Admin chat pe bhej dein — wahan se school verify karega (✓✓ se deliver confirm).
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setPayTarget(null)
                        setPayForm(paymentBlank)
                        setTab('messages')
                      }}
                      className="w-full py-2 rounded-lg text-white text-xs font-bold"
                      style={{ background: '#4f46e5' }}
                    >
                      Open Messages to send receipt
                    </button>
                  </div>
                  <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                    The school will verify this payment before it is marked as paid.
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
              <button
                type="button"
                onClick={() => {
                  setPayTarget(null)
                  setPayForm(paymentBlank)
                }}
                className="flex-1 py-3 rounded-xl text-sm"
                style={{ border: '1px solid #e2e8f0' }}
              >
                Cancel
              </button>
              <button
                disabled={payLoading}
                className="flex-1 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-60"
                style={{ background: '#059669' }}
              >
                {payLoading ? 'Saving…' : 'Submit Payment'}
              </button>
            </div>
          </form>
        </div>
      )}

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

      {/* Mobile bottom nav — 3 tabs like mockup (Children via top pill) */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t flex items-stretch justify-around"
        style={{ borderColor: '#e2e8f0', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {[
          { id: 'messages', label: 'Chats', Icon: MessageCircle },
          { id: 'notifications', label: 'Notifications', Icon: Bell },
          { id: 'settings', label: 'Settings', Icon: SettingsIcon },
        ].map((item) => {
          const active = tab === item.id
          const Icon = item.Icon
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-bold relative"
              style={{ color: active ? '#4f46e5' : '#94a3b8' }}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              {item.label}
              {item.id === 'notifications' && unreadCount > 0 && (
                <span
                  className="absolute top-1 right-[28%] min-w-[16px] h-4 px-1 rounded-full text-[9px] text-white flex items-center justify-center"
                  style={{ background: '#dc2626' }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
