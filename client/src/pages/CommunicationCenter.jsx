import { useEffect, useState, useMemo } from 'react'
import { Send, Users, GraduationCap, CheckCircle2 } from 'lucide-react'
import axios from 'axios'
import PageLayout from '../components/PageLayout'
import API_BASE_URL from '../config/api'

const categories = ['Announcement', 'Fee Reminder', 'Attendance', 'Result', 'Exam', 'Event', 'Admission']

export default function CommunicationCenter() {
  const schoolId = localStorage.getItem('schoolId')

  const [audience, setAudience] = useState('student') // 'student' | 'teacher'
  const [mode, setMode] = useState('all') // 'all' | 'class' | 'selected'
  const [classSectionId, setClassSectionId] = useState('')
  const [sortBy, setSortBy] = useState('recent') // 'recent' | 'roll' | 'name'
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState([])

  const [classes, setClasses] = useState([])
  const [students, setStudents] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)

  const [category, setCategory] = useState('Announcement')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!schoolId) return
    Promise.all([
      axios.get(`${API_BASE_URL}/classes/${schoolId}`),
      axios.get(`${API_BASE_URL}/students/${schoolId}`),
      axios.get(`${API_BASE_URL}/teachers/${schoolId}`),
    ]).then(([c, s, t]) => {
      setClasses(c.data)
      setStudents(s.data)
      setTeachers(t.data)
    }).catch(() => setError('Unable to load students/teachers/classes.'))
      .finally(() => setLoading(false))
  }, [schoolId])

  useEffect(() => { setMode('all'); setSelectedIds([]); setClassSectionId('') }, [audience])

  const pickerList = useMemo(() => {
    let list = audience === 'student' ? students : teachers
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(item =>
        item.name?.toLowerCase().includes(q) ||
        (audience === 'student' && String(item.rollNumber || '').toLowerCase().includes(q))
      )
    }
    if (audience === 'student') {
      list = [...list].sort((a, b) => {
        if (sortBy === 'recent') return new Date(b.createdAt) - new Date(a.createdAt)
        if (sortBy === 'roll') return String(a.rollNumber).localeCompare(String(b.rollNumber), undefined, { numeric: true })
        return String(a.name).localeCompare(String(b.name))
      })
    }
    return list
  }, [audience, students, teachers, search, sortBy])

  const toggleSelect = (id) => {
    setSelectedIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])
  }

  const recipientCount = () => {
    if (mode === 'all') return audience === 'student' ? students.length : teachers.length
    if (mode === 'class') return students.filter(s => s.classSectionId === classSectionId).length
    return selectedIds.length
  }

  const handleSend = async () => {
    setError(''); setSuccess('')
    if (!title.trim() || !message.trim()) { setError('Title and message are required.'); return }
    if (mode === 'class' && !classSectionId) { setError('Select a class.'); return }
    if (mode === 'selected' && selectedIds.length === 0) { setError('Select at least one recipient.'); return }

    setSending(true)
    try {
      const { data } = await axios.post(`${API_BASE_URL}/community/broadcast`, {
        schoolId, audience, mode,
        classSectionId: mode === 'class' ? classSectionId : undefined,
        ids: mode === 'selected' ? selectedIds : undefined,
        category, title, message
      })
      setSuccess(`Sent to ${data.sent} ${audience === 'student' ? 'student(s)' : 'teacher(s)'}.`)
      setTitle(''); setMessage(''); setSelectedIds([])
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to send broadcast.')
    } finally {
      setSending(false)
    }
  }

  return (
    <PageLayout title="Communication Center" subtitle="Send announcements, fee reminders, and updates to students' parents or teachers via V Community.">
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Audience picker */}
          <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #e2e8f0' }}>
            <p className="text-xs font-bold text-slate-500 mb-3">RECIPIENTS</p>
            <div className="flex gap-2 mb-4">
              <button onClick={() => setAudience('student')} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: audience === 'student' ? '#4f46e5' : '#f8fafc', color: audience === 'student' ? '#fff' : '#64748b' }}>
                <GraduationCap size={16} /> Students
              </button>
              <button onClick={() => setAudience('teacher')} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: audience === 'teacher' ? '#4f46e5' : '#f8fafc', color: audience === 'teacher' ? '#fff' : '#64748b' }}>
                <Users size={16} /> Teachers
              </button>
            </div>

            <div className="flex gap-2 mb-3 flex-wrap">
              <button onClick={() => setMode('all')} className="px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: mode === 'all' ? '#eef2ff' : '#f8fafc', color: mode === 'all' ? '#4f46e5' : '#64748b', border: mode === 'all' ? '1px solid #c7d2fe' : '1px solid transparent' }}>
                All {audience === 'student' ? 'Students' : 'Teachers'}
              </button>
              {audience === 'student' && (
                <button onClick={() => setMode('class')} className="px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: mode === 'class' ? '#eef2ff' : '#f8fafc', color: mode === 'class' ? '#4f46e5' : '#64748b', border: mode === 'class' ? '1px solid #c7d2fe' : '1px solid transparent' }}>
                  Class-wise
                </button>
              )}
              <button onClick={() => setMode('selected')} className="px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: mode === 'selected' ? '#eef2ff' : '#f8fafc', color: mode === 'selected' ? '#4f46e5' : '#64748b', border: mode === 'selected' ? '1px solid #c7d2fe' : '1px solid transparent' }}>
                Choose Individually
              </button>
            </div>

            {mode === 'class' && (
              <select value={classSectionId} onChange={e => setClassSectionId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border text-sm mb-3" style={{ borderColor: '#e2e8f0' }}>
                <option value="">Select a class…</option>
                {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            )}

            {mode === 'selected' && (
              <>
                <div className="flex gap-2 mb-2">
                  <input
                    placeholder={audience === 'student' ? 'Search name or roll number…' : 'Search name…'}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border text-sm" style={{ borderColor: '#e2e8f0' }}
                  />
                  {audience === 'student' && (
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="px-2 py-2 rounded-xl border text-xs" style={{ borderColor: '#e2e8f0' }}>
                      <option value="recent">Recently Added</option>
                      <option value="roll">Roll Number</option>
                      <option value="name">Name</option>
                    </select>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto rounded-xl border divide-y" style={{ borderColor: '#e2e8f0' }}>
                  {pickerList.length === 0 ? (
                    <p className="text-xs text-slate-400 p-3">No matches.</p>
                  ) : pickerList.map(item => (
                    <div
                      key={item._id}
                      onClick={() => toggleSelect(item._id)}
                      className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-50"
                    >
                      <div>
                        <div className="text-sm font-medium">{item.name}</div>
                        {audience === 'student' && <div className="text-xs text-slate-400">Roll {item.rollNumber}</div>}
                        {audience === 'teacher' && <div className="text-xs text-slate-400">{item.subject || 'Teacher'}</div>}
                      </div>
                      {selectedIds.includes(item._id) && <CheckCircle2 size={16} style={{ color: '#4f46e5' }} />}
                    </div>
                  ))}
                </div>
              </>
            )}

            <p className="text-xs text-slate-500 mt-3">
              {recipientCount()} recipient(s) will get this notification.
            </p>
          </div>

          {/* Compose */}
          <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #e2e8f0' }}>
            <p className="text-xs font-bold text-slate-500 mb-3">MESSAGE</p>
            {error && <div className="px-3 py-2 rounded-lg text-xs mb-3" style={{ background: '#fef2f2', color: '#dc2626' }}>{error}</div>}
            {success && <div className="px-3 py-2 rounded-lg text-xs mb-3" style={{ background: '#d1fae5', color: '#059669' }}>{success}</div>}
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border text-sm mb-3" style={{ borderColor: '#e2e8f0' }}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              placeholder="Title (e.g. October Fee Due Reminder)"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border text-sm mb-3" style={{ borderColor: '#e2e8f0' }}
            />
            <textarea
              placeholder="Write your message…"
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={6}
              className="w-full px-3 py-2.5 rounded-xl border text-sm mb-4 resize-none" style={{ borderColor: '#e2e8f0' }}
            />
            <button
              onClick={handleSend}
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-60"
              style={{ background: '#4f46e5' }}
            >
              <Send size={16} /> {sending ? 'Sending…' : `Send to ${recipientCount()} recipient(s)`}
            </button>
          </div>
        </div>
      )}
    </PageLayout>
  )
}
