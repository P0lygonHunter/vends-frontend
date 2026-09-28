import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { Send, CheckCircle2, Search, MessageCircle, Megaphone, ArrowLeft } from 'lucide-react'
import axios from 'axios'
import Sidebar from '../components/Sidebar'
import ChatWindow, { formatLastSeen } from '../components/ChatWindow'
import TrialBadge from '../components/TrialBadge'
import PromoOfferBar from '../components/PromoOfferBar'
import API_BASE_URL from '../config/api'

const categories = ['Announcement', 'Fee Reminder', 'Attendance', 'Result', 'Exam', 'Event', 'Admission']

function Avatar({ name, photo, size = 40 }) {
  const initial = (name?.[0] || '?').toUpperCase()
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

function MessagesPanel() {
  const [contactType, setContactType] = useState('parent')
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const selectedRef = useRef(null)
  selectedRef.current = selected

  const loadContacts = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/community/contacts`, { params: { type: contactType } })
      setContacts(Array.isArray(data) ? data : [])
    } catch { /* */ } finally { setLoading(false) }
  }, [contactType])

  const loadMessages = useCallback(async (id) => {
    if (!id) return
    try {
      const { data } = await axios.get(`${API_BASE_URL}/community/conversations/${id}/messages`)
      if (selectedRef.current?.conversationId === id) setMessages(Array.isArray(data?.messages) ? data.messages : [])
    } catch { /* */ }
  }, [])

  useEffect(() => { setLoading(true); setSelected(null); setMessages([]); loadContacts() }, [loadContacts])
  useEffect(() => {
    const t = setInterval(() => {
      loadContacts()
      if (selectedRef.current?.conversationId) loadMessages(selectedRef.current.conversationId)
    }, 6000)
    return () => clearInterval(t)
  }, [loadContacts, loadMessages])

  const openContact = async (contact) => {
    setSelected(contact); setMessages([])
    try {
      const { data } = await axios.post(`${API_BASE_URL}/community/conversations/open`, {
        participantType: contact.participantType, participantId: contact.participantId,
      })
      const conv = data.conversation
      setSelected({
        ...contact, conversationId: conv._id,
        lastSeenAt: conv.parentId?.lastSeenAt || conv.teacherId?.lastSeenAt || contact.lastSeenAt,
      })
      setMessages(data.messages || []); loadContacts()
    } catch { /* */ }
  }

  const handleSend = async (payload) => {
    if (!selected?.conversationId) return
    const body = typeof payload === 'string' ? { text: payload } : payload
    setSending(true)
    try {
      const { data } = await axios.post(`${API_BASE_URL}/community/conversations/${selected.conversationId}/messages`, {
        text: body.text || '', mediaType: body.mediaType || 'none', mediaData: body.mediaData || '',
      })
      setMessages(m => [...m, data]); loadContacts()
    } catch { /* */ } finally { setSending(false) }
  }

  const filtered = contacts.filter(c =>
    (c.name || '').toLowerCase().includes(search.toLowerCase()) || (c.phone || '').includes(search)
  )

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden" style={{ height: 'calc(100vh - 120px)' }}>
      <div className={`shrink-0 border-r bg-white flex flex-col ${selected ? 'hidden md:flex' : 'flex'} w-full md:w-80`} style={{ borderColor: '#e2e8f0' }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: '#e2e8f0' }}>
          <div className="font-bold text-base mb-2" style={{ fontFamily: 'Syne, sans-serif', color: '#4f46e5' }}>V Community</div>
          <div className="flex gap-1 mb-2">
            <button type="button" onClick={() => setContactType('parent')} className="flex-1 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: contactType === 'parent' ? '#eef2ff' : '#f8fafc', color: contactType === 'parent' ? '#4f46e5' : '#64748b' }}>Parents</button>
            <button type="button" onClick={() => setContactType('teacher')} className="flex-1 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: contactType === 'teacher' ? '#eef2ff' : '#f8fafc', color: contactType === 'teacher' ? '#4f46e5' : '#64748b' }}>Teachers</button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm outline-none" style={{ borderColor: '#e2e8f0' }} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? <p className="text-sm text-slate-400 p-4">Loading…</p>
            : filtered.length === 0 ? <p className="text-sm text-slate-400 p-4">No {contactType}s registered yet.</p>
            : filtered.map(c => (
              <button key={String(c.participantId)} type="button" onClick={() => openContact(c)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                style={{ background: selected?.participantId === c.participantId ? '#eef2ff' : 'transparent', borderBottom: '1px solid #f1f5f9' }}>
                <Avatar name={c.name} photo={c.photo} />
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-sm truncate block">{c.name}</span>
                  <div className="text-xs text-slate-500 truncate">{c.lastMessagePreview || c.phone || 'No messages yet'}</div>
                </div>
                {c.unreadByAdmin > 0 && (
                  <span className="text-xs font-bold text-white rounded-full w-5 h-5 flex items-center justify-center" style={{ background: '#4f46e5' }}>{c.unreadByAdmin}</span>
                )}
              </button>
            ))}
        </div>
      </div>
      <div className={`flex-1 flex flex-col min-w-0 ${selected ? 'flex' : 'hidden md:flex'}`}>
        {selected ? (
          <>
            <div className="px-3 md:px-4 py-3 border-b bg-white flex items-center gap-3 shrink-0" style={{ borderColor: '#e2e8f0' }}>
              <button type="button" className="md:hidden p-1" onClick={() => setSelected(null)}><ArrowLeft size={18} /></button>
              <Avatar name={selected.name} photo={selected.photo} size={36} />
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{selected.name}</div>
                <div className="text-xs text-slate-400 truncate">{formatLastSeen(selected.lastSeenAt) || selected.phone || ''}</div>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <ChatWindow messages={messages} mySenderType="admin" onSend={handleSend} sending={sending} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm bg-slate-50">Select a contact to start chatting</div>
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
          <h1 className="flex-1 font-bold text-lg md:text-xl truncate" style={{ fontFamily: 'Syne,sans-serif' }}>Communication Center</h1>
          <div className="flex items-center gap-2"><PromoOfferBar /><TrialBadge /></div>
        </header>
        <div className="flex gap-1 px-4 md:px-6 pt-3 bg-white shrink-0" style={{ borderBottom: '1px solid #e2e8f0' }}>
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
