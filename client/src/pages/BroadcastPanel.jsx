import { useEffect, useState, useMemo } from 'react'
import { CheckCircle2 } from 'lucide-react'
import axios from 'axios'
import API_BASE_URL from '../config/api'

const categories = ['Announcement', 'Fee Reminder', 'Attendance', 'Result', 'Exam', 'Event', 'Admission']

export function BroadcastPanel() {
  const schoolId = localStorage.getItem('schoolId')
  const [audience, setAudience] = useState('student')
  const [mode, setMode] = useState('all')
  const [classSectionId, setClassSectionId] = useState('')
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
    ]).then(([c, s, t]) => { setClasses(c.data); setStudents(s.data); setTeachers(t.data) })
      .catch(() => setError('Unable to load data.'))
      .finally(() => setLoading(false))
  }, [schoolId])

  useEffect(() => { setMode('all'); setSelectedIds([]); setClassSectionId('') }, [audience])

  const pickerList = useMemo(() => {
    let list = audience === 'student' ? students : teachers
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(item => item.name?.toLowerCase().includes(q) ||
        (audience === 'student' && String(item.rollNumber || '').toLowerCase().includes(q)))
    }
    return list
  }, [audience, students, teachers, search])

  const toggleSelect = (id) => setSelectedIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])
  const recipientCount = () => {
    if (mode === 'all') return audience === 'student' ? students.length : teachers.length
    if (mode === 'class') return students.filter(s => String(s.classSectionId?._id || s.classSectionId) === classSectionId).length
    return selectedIds.length
  }

  const handleSend = async () => {
    setError(''); setSuccess('')
    if (!title.trim() || !message.trim()) { setError('Title and message required.'); return }
    if (mode === 'class' && !classSectionId) { setError('Select a class.'); return }
    if (mode === 'selected' && !selectedIds.length) { setError('Select recipients.'); return }
    setSending(true)
    try {
      const { data } = await axios.post(`${API_BASE_URL}/community/broadcast`, {
        schoolId, audience, mode,
        classSectionId: mode === 'class' ? classSectionId : undefined,
        ids: mode === 'selected' ? selectedIds : undefined,
        category, title, message
      })
      setSuccess(`Sent to ${data.sent}.`); setTitle(''); setMessage(''); setSelectedIds([])
    } catch (err) { setError(err.response?.data?.error || 'Send failed.') }
    finally { setSending(false) }
  }

  if (loading) return <p className="text-sm text-slate-500 p-4">Loading…</p>
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 md:p-6">
      <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #e2e8f0' }}>
        <div className="flex gap-2 mb-4">
          <button type="button" onClick={() => setAudience('student')} className="flex-1 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: audience === 'student' ? '#4f46e5' : '#f8fafc', color: audience === 'student' ? '#fff' : '#64748b' }}>Students</button>
          <button type="button" onClick={() => setAudience('teacher')} className="flex-1 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: audience === 'teacher' ? '#4f46e5' : '#f8fafc', color: audience === 'teacher' ? '#fff' : '#64748b' }}>Teachers</button>
        </div>
        <div className="flex gap-2 mb-3 flex-wrap">
          {['all', ...(audience === 'student' ? ['class'] : []), 'selected'].map(m => (
            <button key={m} type="button" onClick={() => setMode(m)} className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: mode === m ? '#eef2ff' : '#f8fafc', color: mode === m ? '#4f46e5' : '#64748b' }}>
              {m === 'all' ? 'All' : m === 'class' ? 'Class-wise' : 'Choose'}
            </button>
          ))}
        </div>
        {mode === 'class' && (
          <select value={classSectionId} onChange={e => setClassSectionId(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border text-sm mb-3" style={{ borderColor: '#e2e8f0' }}>
            <option value="">Select class…</option>
            {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        )}
        {mode === 'selected' && (
          <div className="max-h-64 overflow-y-auto rounded-xl border divide-y" style={{ borderColor: '#e2e8f0' }}>
            <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} className="w-full px-3 py-2 text-sm border-b" style={{ borderColor: '#e2e8f0' }} />
            {pickerList.map(item => (
              <div key={item._id} onClick={() => toggleSelect(item._id)} className="flex justify-between px-3 py-2 cursor-pointer text-sm hover:bg-slate-50">
                <span>{item.name}</span>
                {selectedIds.includes(item._id) && <CheckCircle2 size={16} style={{ color: '#4f46e5' }} />}
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-slate-500 mt-2">{recipientCount()} recipient(s)</p>
      </div>
      <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #e2e8f0' }}>
        {error && <div className="text-xs text-red-600 mb-2">{error}</div>}
        {success && <div className="text-xs text-green-600 mb-2">{success}</div>}
        <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border text-sm mb-3" style={{ borderColor: '#e2e8f0' }}>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border text-sm mb-3" style={{ borderColor: '#e2e8f0' }} />
        <textarea placeholder="Message" value={message} onChange={e => setMessage(e.target.value)} rows={5} className="w-full px-3 py-2.5 rounded-xl border text-sm mb-4" style={{ borderColor: '#e2e8f0' }} />
        <button type="button" onClick={handleSend} disabled={sending} className="w-full py-3 rounded-xl text-white text-sm font-bold" style={{ background: '#4f46e5' }}>
          {sending ? 'Sending…' : `Send to ${recipientCount()}`}
        </button>
      </div>
    </div>
  )
}
