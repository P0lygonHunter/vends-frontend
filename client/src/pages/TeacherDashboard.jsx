import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Bell, BellOff, MessageCircle, Settings as SettingsIcon } from 'lucide-react'
import axios from 'axios'
import API_BASE_URL from '../config/api'
import ChatWindow from '../components/ChatWindow'

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

  const [tab, setTab] = useState('notifications') // 'notifications' | 'messages' | 'settings'

  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [chatMessages, setChatMessages] = useState([])
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
    <div className="min-h-screen" style={{ background: '#f8fafc' }}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Hi, {teacherName}</h1>
            <p className="text-sm text-slate-500">School announcements and updates</p>
          </div>
          <button onClick={logout} className="flex items-center gap-1 text-sm text-slate-500 hover:text-red-600">
            <LogOut size={16} /> Logout
          </button>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
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
          <button
            onClick={() => setTab('messages')}
            className="px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
            style={{ background: tab === 'messages' ? '#4f46e5' : '#fff', color: tab === 'messages' ? '#fff' : '#64748b', border: '1px solid #e2e8f0' }}
          >
            <MessageCircle size={14} /> Messages
          </button>
          <button
            onClick={() => setTab('settings')}
            className="px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
            style={{ background: tab === 'settings' ? '#4f46e5' : '#fff', color: tab === 'settings' ? '#fff' : '#64748b', border: '1px solid #e2e8f0' }}
          >
            <SettingsIcon size={14} /> Settings
          </button>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl text-sm mb-4" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}

        {tab === 'notifications' && (
          loading ? (
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
          )
        )}

        {tab === 'messages' && (
          <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #e2e8f0', height: '65vh' }}>
            <ChatWindow
              messages={chatMessages}
              mySenderType="teacher"
              onSend={sendChatMessage}
              sending={chatSending}
              emptyText="No messages yet. Send the school a message anytime."
            />
          </div>
        )}

        {tab === 'settings' && (
          <div className="flex flex-col gap-6 max-w-md">
            {settingsError && (
              <div className="px-4 py-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>{settingsError}</div>
            )}
            {settingsSuccess && (
              <div className="px-4 py-3 rounded-xl text-sm" style={{ background: '#d1fae5', color: '#059669' }}>{settingsSuccess}</div>
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
                  onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: '#e2e8f0' }}
                />
                <input
                  type="password"
                  placeholder="New password (min 6 characters)"
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: '#e2e8f0' }}
                />
                <button type="submit" disabled={savingSettings} className="py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-60" style={{ background: '#4f46e5' }}>
                  {savingSettings ? 'Saving…' : 'Update Password'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
