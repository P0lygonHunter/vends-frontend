import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Bell, BellOff, MessageCircle, Settings as SettingsIcon } from 'lucide-react'
import axios from 'axios'
import API_BASE_URL from '../config/api'
import ChatWindow from '../components/ChatWindow'
import { schedulePushPrompt } from '../services/pushNotifications'

const categoryColors = {
  Announcement: { bg: '#e0e7ff', text: '#4338ca' },
  'Fee Reminder': { bg: '#fef3c7', text: '#b45309' },
  Attendance: { bg: '#d1fae5', text: '#059669' },
  Result: { bg: '#fce7f3', text: '#be185d' },
  Exam: { bg: '#fee2e2', text: '#dc2626' },
  Event: { bg: '#dbeafe', text: '#2563eb' },
  Admission: { bg: '#ecfccb', text: '#65a30d' },
}

export default function TeacherDashboard() {
  const navigate = useNavigate()
  const teacherName = localStorage.getItem('teacherName') || 'Teacher'

  const [tab, setTab] = useState('messages') // 'notifications' | 'messages' | 'settings'

  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [chatMessages, setChatMessages] = useState([])
  const [chatCaps, setChatCaps] = useState(null)
  const [chatSending, setChatSending] = useState(false)
  const chatPollRef = useRef(null)

  const [photo, setPhoto] = useState(localStorage.getItem('teacherPhoto') || '')
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' })
  const [settingsError, setSettingsError] = useState('')
  const [settingsSuccess, setSettingsSuccess] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/teacher-portal/notifications`)
      setNotifications(data)
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load notifications.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { schedulePushPrompt('teacher') }, [])

  useEffect(() => {
    axios.get(`${API_BASE_URL}/teacher-portal/chat-capabilities`)
      .then(({ data }) => {
        setChatCaps(data)
        if (data && data.chatEnabled === false) {
          setTab((prev) => (prev === 'messages' ? 'notifications' : prev))
        }
      })
      .catch(() => {})
  }, [])
  const unreadCount = notifications.filter(n => !n.read).length

  const markRead = async (id) => {
    try {
      await axios.patch(`${API_BASE_URL}/teacher-portal/notifications/${id}/read`)
      setNotifications(list => list.map(n => n._id === id ? { ...n, read: true } : n))
    } catch { /* non-critical */ }
  }

  const loadConversation = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/teacher-portal/conversation`)
      setChatMessages(data.messages)
    } catch { /* silent — polling */ }
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
      const { data } = await axios.post(`${API_BASE_URL}/teacher-portal/conversation/messages`, {
        text: body.text || '',
        mediaType: body.mediaType || 'none',
        mediaData: body.mediaData || '',
        replyTo: body.replyTo || undefined,
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
        await axios.patch(`${API_BASE_URL}/teacher-portal/photo`, { photo: reader.result })
        setPhoto(reader.result)
        localStorage.setItem('teacherPhoto', reader.result)
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
      await axios.post(`${API_BASE_URL}/teacher-portal/change-password`, passwordForm)
      setSettingsSuccess('Password updated.')
      setPasswordForm({ currentPassword: '', newPassword: '' })
    } catch (err) {
      setSettingsError(err.response?.data?.error || 'Unable to update password.')
    } finally {
      setSavingSettings(false)
    }
  }

  const logout = () => {
    const schoolId = localStorage.getItem('teacherSchoolId') || ''
    localStorage.removeItem('teacherAuthToken')
    localStorage.removeItem('teacherSchoolId')
    localStorage.removeItem('teacherName')
    localStorage.removeItem('teacherPhoto')
    navigate(`/community/${schoolId}/login`)
  }

  return (
    <div className="flex flex-col bg-[#f0f2f5] overflow-hidden" style={{ height: '100dvh', maxHeight: '100dvh' }}>
      <header
        className="md:hidden shrink-0 flex items-center justify-center px-3 bg-white"
        style={{ height: 56, borderBottom: '1px solid #e2e8f0', paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="font-bold text-[15px]" style={{ color: '#4f46e5', fontFamily: 'Syne, sans-serif' }}>
          V-Community
        </div>
      </header>

      <div className="hidden md:block shrink-0 bg-white border-b" style={{ borderColor: '#e2e8f0' }}>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-indigo-600">V-Community</div>
            <h1 className="text-xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Hi, {teacherName}</h1>
            <p className="text-sm text-slate-500">School announcements and updates</p>
          </div>
          <button type="button" onClick={logout} className="flex items-center gap-1 text-sm text-slate-500 hover:text-red-600">
            <LogOut size={16} /> Logout
          </button>
        </div>
        <div className="max-w-2xl mx-auto px-4 flex gap-2 pb-3">
          {[
            { id: 'messages', label: 'Messages' },
            { id: 'notifications', label: 'Notifications' },
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
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center" style={{ background: '#dc2626' }}>
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <main className={`flex-1 min-h-0 flex flex-col ${tab === 'messages' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {error && (
          <div className="mx-3 mt-3 px-4 py-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}

        {tab === 'notifications' && (
          <div className="max-w-2xl mx-auto w-full px-3 py-3 md:px-4 md:py-6 pb-24 md:pb-6">
            <h2 className="md:hidden font-bold text-base mb-3">Notifications</h2>
            {loading ? (
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
                      onClick={() => !n.read && markRead(n._id)}
                      className="bg-white rounded-xl p-4 cursor-pointer"
                      style={{ border: n.read ? '1px solid #e2e8f0' : '1px solid #4f46e5' }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: colors.bg, color: colors.text }}>
                          {n.category}
                        </span>
                        <div className="flex items-center gap-2">
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

        {tab === 'messages' && (
          <div className="flex-1 min-h-0 flex flex-col bg-[#efeae2]">
            <div className="shrink-0 flex items-center gap-3 px-3 bg-[#f0f2f5] md:bg-white border-b" style={{ height: 56, borderColor: '#e2e8f0' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: '#4f46e5' }}>
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
                mySenderType="teacher"
                onSend={sendChatMessage}
                sending={chatSending}
                emptyText="No messages yet. Message the school office anytime."
                chatCaps={chatCaps}
              />
            </div>
          </div>
        )}

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
                <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-xl shrink-0" style={{ background: '#4f46e5' }}>
                  {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : teacherName[0]?.toUpperCase()}
                </div>
                <label className="px-4 py-2 rounded-xl text-sm font-bold cursor-pointer" style={{ border: '1px solid #e2e8f0' }}>
                  Change Photo
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhotoChange} className="hidden" />
                </label>
              </div>
              <p className="text-xs text-slate-400 mt-2">This is what the school sees next to your messages. Max 500KB.</p>
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
                <button type="submit" disabled={savingSettings} className="py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-60" style={{ background: '#4f46e5' }}>
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

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t flex items-stretch justify-around"
        style={{ borderColor: '#e2e8f0', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {[
          { id: 'messages', label: 'Chats', Icon: MessageCircle, needsChat: true },
          { id: 'notifications', label: 'Notifications', Icon: Bell },
          { id: 'settings', label: 'Settings', Icon: SettingsIcon },
        ].filter((item) => !item.needsChat || chatCaps?.chatEnabled !== false).map((item) => {
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
                <span className="absolute top-1 right-[28%] min-w-[16px] h-4 px-1 rounded-full text-[9px] text-white flex items-center justify-center" style={{ background: '#dc2626' }}>
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
