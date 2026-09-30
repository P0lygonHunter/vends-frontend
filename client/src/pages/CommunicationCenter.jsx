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
  const [chatCaps, setChatCaps] = useState(null)
  const [selectMode, setSelectMode] = useState(false)
  const [checkedIds, setCheckedIds] = useState([])
  const [bulkText, setBulkText] = useState('')
  const [bulkAlsoNotify, setBulkAlsoNotify] = useState(true)
  const [bulkSending, setBulkSending] = useState(false)
  const [bulkMsg, setBulkMsg] = useState('')
  const [bulkErr, setBulkErr] = useState('')
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

  useEffect(() => {
    const sid = localStorage.getItem('schoolId')
    if (!sid) return
    axios.get(`${API_BASE_URL}/school/check/${sid}`)
      .then(({ data }) => { if (data.chatCaps) setChatCaps(data.chatCaps) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setSelected(null)
    setMessages([])
    setCheckedIds([])
    setSelectMode(false)
    loadContacts()
  }, [loadContacts])

  useEffect(() => {
    const t = setInterval(() => {
      loadContacts()
      if (selectedRef.current?.conversationId) loadMessages(selectedRef.current.conversationId)
    }, 6000)
    return () => clearInterval(t)
  }, [loadContacts, loadMessages])

  const openContact = async (contact) => {
    if (selectMode) {
      const id = String(contact.participantId)
      setCheckedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
      return
    }
    setSelected(contact)
    setMessages([])
    try {
      const { data } = await axios.post(`${API_BASE_URL}/community/conversations/open`, {
        participantType: contact.participantType,
        participantId: contact.participantId,
      })
      const conv = data.conversation
      setSelected({
        ...contact,
        conversationId: conv._id,
        lastSeenAt: contact.lastSeenAt,
      })
      setMessages(Array.isArray(data.messages) ? data.messages : [])
    } catch {
      setSelected(contact)
    }
  }

  const handleSend = async (payload) => {
    if (!selected?.conversationId) return
    setSending(true)
    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/community/conversations/${selected.conversationId}/messages`,
        typeof payload === 'string' ? { text: payload } : payload
      )
      setMessages((m) => [...m, data])
      loadContacts()
    } catch (err) {
      window.alert(err.response?.data?.error || 'Send failed')
    } finally {
      setSending(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return contacts
    return contacts.filter(
      (c) =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q) ||
        (c.lastMessagePreview || '').toLowerCase().includes(q)
    )
  }, [contacts, search])

  const toggleSelectAll = () => {
    if (checkedIds.length === filtered.length) setCheckedIds([])
    else setCheckedIds(filtered.map((c) => String(c.participantId)))
  }

  const sendBulk = async () => {
    setBulkErr('')
    setBulkMsg('')
    const text = bulkText.trim()
    if (!text) {
      setBulkErr('Write a message first.')
      return
    }
    if (checkedIds.length === 0) {
      setBulkErr('Select at least one contact.')
      return
    }
    setBulkSending(true)
    try {
      const { data } = await axios.post(`${API_BASE_URL}/community/bulk-chat`, {
        participantType: contactType === 'teacher' ? 'teacher' : 'parent',
        mode: 'selected',
        ids: checkedIds,
        text,
        alsoNotify: bulkAlsoNotify,
        title: text.slice(0, 80),
      })
      setBulkMsg(`Sent to ${data.sent} chat(s)${data.notified ? ` · ${data.notified} notification(s)` : ''}`)
      setBulkText('')
      setCheckedIds([])
      setSelectMode(false)
      loadContacts()
      if (selected?.conversationId) loadMessages(selected.conversationId)
    } catch (err) {
      setBulkErr(err.response?.data?.error || 'Bulk send failed')
    } finally {
      setBulkSending(false)
    }
  }

  return (
    <div className="flex flex-1 min-h-0">
      <div
        className={`w-full md:w-80 border-r bg-white flex flex-col shrink-0 ${selected && !selectMode ? 'hidden md:flex' : 'flex'}`}
        style={{ borderColor: '#e2e8f0' }}
      >
        <div className="p-3 border-b space-y-2" style={{ borderColor: '#e2e8f0' }}>
          <div className="flex gap-1">
            {['parent', 'teacher'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setContactType(t)}
                className="flex-1 py-1.5 rounded-lg text-xs font-bold capitalize"
                style={{
                  background: contactType === t ? '#eef2ff' : '#f8fafc',
                  color: contactType === t ? '#4f46e5' : '#64748b',
                }}
              >
                {t === 'parent' ? 'Parents' : 'Teachers'}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full pl-8 pr-3 py-2 rounded-xl border text-sm"
              style={{ borderColor: '#e2e8f0' }}
            />
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => {
                setSelectMode((v) => !v)
                setCheckedIds([])
                setBulkMsg('')
                setBulkErr('')
              }}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold"
              style={{
                background: selectMode ? '#4f46e5' : '#f1f5f9',
                color: selectMode ? '#fff' : '#475569',
              }}
            >
              {selectMode ? 'Cancel select' : 'Select'}
            </button>
            {selectMode && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="px-2 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600"
              >
                {checkedIds.length === filtered.length ? 'None' : 'All'}
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-sm text-slate-400">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-sm text-slate-400">No contacts yet</div>
          ) : (
            filtered.map((c) => {
              const id = String(c.participantId)
              const active = !selectMode && selected && String(selected.participantId) === id
              const checked = checkedIds.includes(id)
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => openContact(c)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left border-b hover:bg-slate-50"
                  style={{
                    borderColor: '#f1f5f9',
                    background: active ? '#eef2ff' : checked ? '#f8fafc' : 'transparent',
                  }}
                >
                  {selectMode && (
                    <input type="checkbox" readOnly checked={checked} className="accent-indigo-600" />
                  )}
                  <Avatar name={c.name} photo={c.photo} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2">
                      <span className="font-semibold text-sm truncate">{c.name}</span>
                      {c.unreadByAdmin > 0 && (
                        <span className="text-[10px] font-bold px-1.5 rounded-full bg-indigo-600 text-white shrink-0">
                          {c.unreadByAdmin}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 truncate">{c.lastMessagePreview || c.phone || ''}</div>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {selectMode && (
          <div className="p-3 border-t space-y-2 bg-white" style={{ borderColor: '#e2e8f0' }}>
            <div className="text-xs text-slate-500">{checkedIds.length} selected — message goes into each chat (✓✓ when read)</div>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={3}
              placeholder="Type bulk message…"
              className="w-full px-3 py-2 rounded-xl border text-sm"
              style={{ borderColor: '#e2e8f0' }}
            />
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={bulkAlsoNotify} onChange={(e) => setBulkAlsoNotify(e.target.checked)} />
              Also post to Notifications feed
            </label>
            {bulkErr && <div className="text-xs text-red-600">{bulkErr}</div>}
            {bulkMsg && <div className="text-xs text-emerald-600">{bulkMsg}</div>}
            <button
              type="button"
              disabled={bulkSending}
              onClick={sendBulk}
              className="w-full py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-60"
              style={{ background: '#4f46e5' }}
            >
              {bulkSending ? 'Sending…' : `Send to ${checkedIds.length || 0} chat(s)`}
            </button>
          </div>
        )}
      </div>

      <div className={`flex-1 flex flex-col min-w-0 ${selected && !selectMode ? 'flex' : 'hidden md:flex'}`}>
        {selected && !selectMode ? (
          <>
            <div className="px-3 md:px-4 py-3 border-b bg-white flex items-center gap-3 shrink-0" style={{ borderColor: '#e2e8f0' }}>
              <button type="button" className="md:hidden p-1" onClick={() => setSelected(null)}>
                <ArrowLeft size={18} />
              </button>
              <Avatar name={selected.name} photo={selected.photo} size={36} />
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{selected.name}</div>
                <div className="text-xs text-slate-400 truncate">
                  {formatLastSeen(selected.lastSeenAt) || selected.phone || ''}
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <ChatWindow messages={messages} mySenderType="admin" onSend={handleSend} sending={sending} chatCaps={chatCaps} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm bg-slate-50 p-6 text-center">
            {selectMode
              ? 'Select contacts on the left, write a message, send into each chat.'
              : 'Select a contact to start chatting — or use Select for bulk chat send.'}
          </div>
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
