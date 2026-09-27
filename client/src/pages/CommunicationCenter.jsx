import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { Send, Users, GraduationCap, CheckCircle2, Search, MessageCircle, Megaphone, ArrowLeft } from 'lucide-react'
import axios from 'axios'
import Sidebar from '../components/Sidebar'
import ChatWindow from '../components/ChatWindow'
import TrialBadge from '../components/TrialBadge'
import PromoOfferBar from '../components/PromoOfferBar'
import API_BASE_URL from '../config/api'

const categories = ['Announcement', 'Fee Reminder', 'Attendance', 'Result', 'Exam', 'Event', 'Admission']
const pName = (c) => c.parentId?.name || c.teacherId?.name || 'Unknown'
const pPhoto = (c) => c.parentId?.photo || c.teacherId?.photo || ''
const pPhone = (c) => c.parentId?.phone || c.teacherId?.phone || ''

function Avatar({ conv, size = 40 }) {
  const photo = pPhoto(conv)
  const initial = (pName(conv)[0] || '?').toUpperCase()
  return (
    <div className="rounded-full flex items-center justify-center text-white font-bold shrink-0 overflow-hidden"
      style={{ width: size, height: size, background: '#4f46e5', fontSize: size * 0.4 }}>
      {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : initial}
    </div>
  )
}

function BroadcastPanel() {
  const schoolId = localStorage.getItem('schoolId')
  const [audience, setAudience] = useState('student')
  const [mode, setMode] = useState('all')
  const [classSectionId, setClassSectionId] = useState('')
  const [sortBy, setSortBy] = useState('recent')
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
      .catch(() => setError('Unable to load students/teachers/classes.'))
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
    if (audience === 'student') {
      list = [...list].sort((a, b) => {
        if (sortBy === 'recent') return new Date(b.createdAt) - new Date(a.createdAt)
        if (sortBy === 'roll') return String(a.rollNumber).localeCompare(String(b.rollNumber), undefined, { numeric: true })
        return String(a.name).localeCompare(String(b.name))
      })
    }
    return list
  }, [audience, students, teachers, search, sortBy])

  const toggleSelect = (id) => setSelectedIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])
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
    } finally { setSending(false) }
  }

  if (loading) return <p className="text-sm text-slate-500 p-4">Loading…</p>
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 md:p-6">
      <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #e2e8f0' }}>
        <p className="text-xs font-bold text-slate-500 mb-3">RECIPIENTS</p>
        <div className="flex gap-2 mb-4">
          <button type="button" onClick={() => setAudience('student')} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: audience === 'student' ? '#4f46e5' : '#f8fafc', color: audience === 'student' ? '#fff' : '#64748b' }}>
            <GraduationCap size={16} /> Students
          </button>
          <button type="button" onClick={() => setAudience('teacher')} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: audience === 'teacher' ? '#4f46e5' : '#f8fafc', color: audience === 'teacher' ? '#fff' : '#64748b' }}>
            <Users size={16} /> Teachers
          </button>
        </div>
        <div className="flex gap-2 mb-3 flex-wrap">
          {['all', ...(audience === 'student' ? ['class'] : []), 'selected'].map(m => (
            <button key={m} type="button" onClick={() => setMode(m)} className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: mode === m ? '#eef2ff' : '#f8fafc', color: mode === m ? '#4f46e5' : '#64748b', border: mode === m ? '1px solid #c7d2fe' : '1px solid transparent' }}>
              {m === 'all' ? `All ${audience === 'student' ? 'Students' : 'Teachers'}` : m === 'class' ? 'Class-wise' : 'Choose Individually'}
            </button>
          ))}
        </div>
        {mode === 'class' && (
          <select value={classSectionId} onChange={e => setClassSectionId(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border text-sm mb-3" style={{ borderColor: '#e2e8f0' }}>
            <option value="">Select a class…</option>
            {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        )}
        {mode === 'selected' && (
          <>
            <div className="flex gap-2 mb-2">
              <input placeholder={audience === 'student' ? 'Search name or roll…' : 'Search name…'} value={search} onChange={e => setSearch(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border text-sm" style={{ borderColor: '#e2e8f0' }} />
              {audience === 'student' && (
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="px-2 py-2 rounded-xl border text-xs" style={{ borderColor: '#e2e8f0' }}>
                  <option value="recent">Recent</option><option value="roll">Roll</option><option value="name">Name</option>
                </select>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto rounded-xl border divide-y" style={{ borderColor: '#e2e8f0' }}>
              {pickerList.length === 0 ? <p className="text-xs text-slate-400 p-3">No matches.</p> : pickerList.map(item => (
                <div key={item._id} onClick={() => toggleSelect(item._id)} className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-50">
                  <div>
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className="text-xs text-slate-400">{audience === 'student' ? `Roll ${item.rollNumber}` : (item.subject || 'Teacher')}</div>
                  </div>
                  {selectedIds.includes(item._id) && <CheckCircle2 size={16} style={{ color: '#4f46e5' }} />}
                </div>
              ))}
            </div>
          </>
        )}
        <p className="text-xs text-slate-500 mt-3">{recipientCount()} recipient(s) will get this notification.</p>
      </div>
      <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #e2e8f0' }}>
        <p className="text-xs font-bold text-slate-500 mb-3">MESSAGE</p>
        {error && <div className="px-3 py-2 rounded-lg text-xs mb-3" style={{ background: '#fef2f2', color: '#dc2626' }}>{error}</div>}
        {success && <div className="px-3 py-2 rounded-lg text-xs mb-3" style={{ background: '#d1fae5', color: '#059669' }}>{success}</div>}
        <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border text-sm mb-3" style={{ borderColor: '#e2e8f0' }}>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input placeholder="Title (e.g. October Fee Due Reminder)" value={title} onChange={e => setTitle(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border text-sm mb-3" style={{ borderColor: '#e2e8f0' }} />
        <textarea placeholder="Write your message…" value={message} onChange={e => setMessage(e.target.value)} rows={6}
          className="w-full px-3 py-2.5 rounded-xl border text-sm mb-4 resize-none" style={{ borderColor: '#e2e8f0' }} />
        <button type="button" onClick={handleSend} disabled={sending}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-60" style={{ background: '#4f46e5' }}>
          <Send size={16} /> {sending ? 'Sending…' : `Send to ${recipientCount()} recipient(s)`}
        </button>
      </div>
    </div>
  )
}

function MessagesPanel() {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const selectedRef = useRef(null)
  selectedRef.current = selected

  const loadConversations = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/community/conversations`)
      setConversations(Array.isArray(data) ? data : [])
    } catch { /* poll */ } finally { setLoading(false) }
  }, [])

  const loadMessages = useCallback(async (id) => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/community/conversations/${id}/messages`)
      if (selectedRef.current?._id === id) {
        setMessages(Array.isArray(data?.messages) ? data.messages : (Array.isArray(data) ? data : []))
      }
    } catch { /* poll */ }
  }, [])

  useEffect(() => { loadConversations() }, [loadConversations])
  useEffect(() => {
    const t = setInterval(() => {
      loadConversations()
      if (selectedRef.current) loadMessages(selectedRef.current._id)
    }, 6000)
    return () => clearInterval(t)
  }, [loadConversations, loadMessages])

  const openConversation = async (conv) => {
    setSelected(conv)
    setMessages([])
    await loadMessages(conv._id)
    setConversations(list => list.map(c => c._id === conv._id ? { ...c, unreadByAdmin: 0 } : c))
  }

  const handleSend = async (text) => {
    if (!selected) return
    setSending(true)
    try {
      const { data } = await axios.post(`${API_BASE_URL}/community/conversations/${selected._id}/messages`, { text })
      setMessages(m => [...m, data])
      loadConversations()
    } catch { /* */ } finally { setSending(false) }
  }

  const filtered = conversations.filter(c => pName(c).toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden" style={{ height: 'calc(100vh - 120px)' }}>
      <div className={`shrink-0 border-r bg-white flex flex-col ${selected ? 'hidden md:flex' : 'flex'} w-full md:w-80`} style={{ borderColor: '#e2e8f0' }}>
        <div className="px-4 py-3 border-b shrink-0" style={{ borderColor: '#e2e8f0' }}>
          <div className="font-bold text-base mb-2" style={{ fontFamily: 'Syne, sans-serif', color: '#4f46e5' }}>V Community</div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm outline-none" style={{ borderColor: '#e2e8f0' }} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? <p className="text-sm text-slate-400 p-4">Loading…</p>
            : filtered.length === 0 ? <p className="text-sm text-slate-400 p-4">No conversations yet. They appear when a parent or teacher messages you.</p>
            : filtered.map(c => (
              <button key={c._id} type="button" onClick={() => openConversation(c)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                style={{ background: selected?._id === c._id ? '#eef2ff' : 'transparent', borderBottom: '1px solid #f1f5f9' }}>
                <Avatar conv={c} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">{pName(c)}</span>
                    {c.participantType === 'teacher' && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: '#f1f5f9', color: '#64748b' }}>Teacher</span>}
                  </div>
                  <div className="text-xs text-slate-500 truncate">{c.lastMessagePreview || 'No messages yet'}</div>
                </div>
                {c.unreadByAdmin > 0 && (
                  <span className="text-xs font-bold text-white rounded-full w-5 h-5 flex items-center justify-center shrink-0" style={{ background: '#4f46e5' }}>{c.unreadByAdmin}</span>
                )}
              </button>
            ))}
        </div>
      </div>
      <div className={`flex-1 flex flex-col min-w-0 ${selected ? 'flex' : 'hidden md:flex'}`}>
        {selected ? (
          <>
            <div className="px-3 md:px-4 py-3 border-b bg-white flex items-center gap-3 shrink-0" style={{ borderColor: '#e2e8f0' }}>
              <button type="button" className="md:hidden p-1 rounded-lg hover:bg-slate-100" onClick={() => setSelected(null)}><ArrowLeft size={18} /></button>
              <Avatar conv={selected} size={36} />
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{pName(selected)}</div>
                <div className="text-xs text-slate-400 truncate">{pPhone(selected)}</div>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <ChatWindow messages={messages} mySenderType="admin" onSend={handleSend} sending={sending} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm bg-slate-50">Select a conversation to start chatting</div>
        )}
      </div>
    </div>
  )
}

export default function CommunicationCenter() {
  const schoolName = localStorage.getItem('schoolName') || 'Your School'
  const [tab, setTab] = useState('messages')
  return (
    <div className="flex min-h-screen" style={{ background: '#f8fafc' }}>
      <Sidebar schoolName={schoolName} />
      <main className="app-main flex flex-col min-w-0" style={{ flex: 1, minWidth: 0, height: '100vh', overflow: 'hidden' }}>
        <header className="flex items-center gap-3 px-4 md:px-6 bg-white shrink-0" style={{ height: 68, borderBottom: '1px solid #e2e8f0', zIndex: 50 }}>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg md:text-xl truncate" style={{ fontFamily: 'Syne,sans-serif' }}>Communication Center</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end"><PromoOfferBar /><TrialBadge /></div>
        </header>
        <div className="flex gap-1 px-4 md:px-6 pt-3 pb-0 bg-white shrink-0" style={{ borderBottom: '1px solid #e2e8f0' }}>
          <button type="button" onClick={() => setTab('messages')} className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-xl"
            style={{ color: tab === 'messages' ? '#4f46e5' : '#64748b', borderBottom: tab === 'messages' ? '2px solid #4f46e5' : '2px solid transparent', background: tab === 'messages' ? '#eef2ff' : 'transparent' }}>
            <MessageCircle size={16} /> Messages
          </button>
          <button type="button" onClick={() => setTab('broadcast')} className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-xl"
            style={{ color: tab === 'broadcast' ? '#4f46e5' : '#64748b', borderBottom: tab === 'broadcast' ? '2px solid #4f46e5' : '2px solid transparent', background: tab === 'broadcast' ? '#eef2ff' : 'transparent' }}>
            <Megaphone size={16} /> Broadcast
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-auto flex flex-col">
          {tab === 'messages' ? <MessagesPanel /> : <BroadcastPanel />}
        </div>
      </main>
    </div>
  )
}
