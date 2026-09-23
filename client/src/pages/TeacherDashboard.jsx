import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Bell, BellOff } from 'lucide-react'
import axios from 'axios'
import API_BASE_URL from '../config/api'

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
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  const markRead = async (id) => {
    try {
      await axios.patch(`${API_BASE_URL}/teacher-portal/notifications/${id}/read`)
      setNotifications(list => list.map(n => n._id === id ? { ...n, read: true } : n))
    } catch { /* non-critical */ }
  }

  const logout = () => {
    const schoolId = localStorage.getItem('teacherSchoolId') || ''
    localStorage.removeItem('teacherAuthToken')
    localStorage.removeItem('teacherSchoolId')
    localStorage.removeItem('teacherName')
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

        {error && (
          <div className="px-4 py-3 rounded-xl text-sm mb-4" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}

        {loading ? (
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
        )}
      </div>
    </div>
  )
}
