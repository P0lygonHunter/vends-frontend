import { useEffect, useState, useCallback, useRef } from 'react'
import { Search } from 'lucide-react'
import axios from 'axios'
import Sidebar from '../components/Sidebar'
import ChatWindow from '../components/ChatWindow'
import API_BASE_URL from '../config/api'

const participantName = (c) => c.parentId?.name || c.teacherId?.name || 'Unknown'
const participantPhoto = (c) => c.parentId?.photo || c.teacherId?.photo || ''
const participantPhone = (c) => c.parentId?.phone || c.teacherId?.phone || ''

function Avatar({ conv, size = 40 }) {
  const photo = participantPhoto(conv)
  const initial = (participantName(conv)[0] || '?').toUpperCase()
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold shrink-0 overflow-hidden"
      style={{ width: size, height: size, background: '#4f46e5', fontSize: size * 0.4 }}
    >
      {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : initial}
    </div>
  )
}

export default function CommunicationChat() {
  const schoolName = localStorage.getItem('schoolName') || 'Your School'

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
      setConversations(data)
    } catch { /* silent — polling */ } finally {
      setLoading(false)
    }
  }, [])

  const loadMessages = useCallback(async (conversationId) => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/community/conversations/${conversationId}/messages`)
      if (selectedRef.current?._id === conversationId) setMessages(data.messages)
    } catch { /* silent — polling */ }
  }, [])

  useEffect(() => { loadConversations() }, [loadConversations])

  // Poll the conversation list every 6s so new incoming messages / unread counts show up
  // without the admin needing to refresh. Also re-fetch the open thread if one is selected.
  useEffect(() => {
    const interval = setInterval(() => {
      loadConversations()
      if (selectedRef.current) loadMessages(selectedRef.current._id)
    }, 6000)
    return () => clearInterval(interval)
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
    } catch { /* best-effort */ } finally {
      setSending(false)
    }
  }

  const filtered = conversations.filter(c => participantName(c).toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8fafc' }}>
      <Sidebar schoolName={schoolName} />

      <div className="flex-1 flex min-w-0">
        {/* Conversation list */}
        <div className="w-80 shrink-0 border-r bg-white flex flex-col" style={{ borderColor: '#e2e8f0' }}>
          <div className="px-4 py-4 border-b" style={{ borderColor: '#e2e8f0' }}>
            <div className="font-bold text-lg mb-3" style={{ fontFamily: 'Syne, sans-serif', color: '#4f46e5' }}>V Community</div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm outline-none"
                style={{ borderColor: '#e2e8f0' }}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-slate-400 p-4">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-slate-400 p-4">No conversations yet. They'll appear here once a parent or teacher messages you.</p>
            ) : (
              filtered.map(c => (
                <button
                  key={c._id}
                  onClick={() => openConversation(c)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                  style={{ background: selected?._id === c._id ? '#eef2ff' : 'transparent', borderBottom: '1px solid #f1f5f9' }}
                >
                  <Avatar conv={c} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{participantName(c)}</span>
                      {c.participantType === 'teacher' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0" style={{ background: '#f1f5f9', color: '#64748b' }}>Teacher</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{c.lastMessagePreview || 'No messages yet'}</div>
                  </div>
                  {c.unreadByAdmin > 0 && (
                    <span className="text-xs font-bold text-white rounded-full w-5 h-5 flex items-center justify-center shrink-0" style={{ background: '#4f46e5' }}>
                      {c.unreadByAdmin}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat window */}
        <div className="flex-1 flex flex-col min-w-0">
          {selected ? (
            <>
              <div className="px-4 py-3 border-b bg-white flex items-center gap-3 shrink-0" style={{ borderColor: '#e2e8f0' }}>
                <Avatar conv={selected} size={36} />
                <div>
                  <div className="font-semibold text-sm">{participantName(selected)}</div>
                  <div className="text-xs text-slate-400">{participantPhone(selected)}</div>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <ChatWindow messages={messages} mySenderType="admin" onSend={handleSend} sending={sending} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              Select a conversation to start chatting
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
