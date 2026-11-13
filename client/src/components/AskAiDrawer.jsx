import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import API_BASE_URL from '../config/api'

const CHIPS = [
  { q: 'How many students are absent today?', label: 'Absents today' },
  { q: 'Which fees are pending?', label: 'Pending fees' },
  { q: 'Create fee reminder drafts for pending balances', label: 'Fee drafts' },
  { q: 'Create absence notice drafts for today', label: 'Absence drafts' },
  { q: 'Draft an event announcement for the school', label: 'Event draft' },
]

export default function AskAiDrawer({ open, onClose }) {
  const navigate = useNavigate()
  const schoolId = localStorage.getItem('schoolId')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState([])
  const [actions, setActions] = useState([])
  const [actionBusy, setActionBusy] = useState(false)
  const [teachers, setTeachers] = useState([])
  const [teacherId, setTeacherId] = useState('')
  const [draftText, setDraftText] = useState('')

  useEffect(() => {
    if (!open || !schoolId) return
    axios
      .get(`${API_BASE_URL}/teachers/${schoolId}`)
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.teachers || []
        setTeachers(list)
      })
      .catch(() => setTeachers([]))
  }, [open, schoolId])

  if (!open) return null

  const ask = async (text) => {
    const question = (text || q).trim()
    if (!question) return
    setBusy(true)
    setActions([])
    setMessages((m) => [...m, { role: 'user', text: question }])
    setQ('')
    try {
      const res = await axios.post(`${API_BASE_URL}/ai/ask`, { question, webSearch: true })
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: res.data.answer || 'No answer',
          meta: res.data.usedSearch ? 'Used web search' : null,
        },
      ])
      setActions(Array.isArray(res.data.suggestedActions) ? res.data.suggestedActions : [])
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: err.response?.data?.error || 'Ask AI failed' },
      ])
    } finally {
      setBusy(false)
    }
  }

  const runAction = async (actionId, extra = {}) => {
    setActionBusy(true)
    try {
      const lastUser = [...messages].reverse().find((x) => x.role === 'user')
      const res = await axios.post(`${API_BASE_URL}/ai/ask/action`, {
        action: actionId,
        text: extra.text || draftText || lastUser?.text || '',
        teacherId: extra.teacherId || teacherId || undefined,
      })
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: res.data.message || `Created ${res.data.created || 0} draft(s). Review in AI Actions — nothing was sent yet.`,
        },
      ])
      setActions([])
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: err.response?.data?.error || 'Action failed' },
      ])
    } finally {
      setActionBusy(false)
    }
  }

  const draftForTeacher = async () => {
    if (!teacherId) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: 'Select a teacher from the list first, then draft.' },
      ])
      return
    }
    const text =
      draftText.trim() ||
      'Assalam o alaikum. Please check the school notice / timetable update and confirm with the office if needed. — School Admin'
    await runAction('draft_teacher_message', { teacherId, text })
  }

  const draftEvent = async () => {
    const text =
      draftText.trim() ||
      'School event / announcement — please see details with the office. — School Admin'
    await runAction('draft_event_notice', { text })
  }

  return (
    <div className="fixed inset-0 z-[80] flex justify-end" style={{ background: 'rgba(15,23,42,0.35)' }}>
      <button type="button" className="flex-1 cursor-default" aria-label="Close" onClick={onClose} />
      <div
        className="h-full w-full max-w-md flex flex-col bg-white shadow-2xl"
        style={{ borderLeft: '1px solid #e2e8f0' }}
      >
        <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#0284c7' }}>
          <div>
            <div className="text-white font-bold text-sm">Ask AI</div>
            <div className="text-sky-100 text-xs">School data · parent drafts · teacher · event</div>
          </div>
          <button type="button" onClick={onClose} className="text-white text-xl leading-none px-2">
            ×
          </button>
        </div>

        <div className="px-3 py-2 flex flex-wrap gap-2 border-b" style={{ borderColor: '#e2e8f0' }}>
          {CHIPS.map((c) => (
            <button
              key={c.label}
              type="button"
              disabled={busy}
              onClick={() => ask(c.q)}
              className="text-xs px-2.5 py-1 rounded-full border font-semibold"
              style={{ borderColor: '#bae6fd', color: '#0369a1', background: '#f0f9ff' }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Teacher / event draft box */}
        <div className="px-3 py-3 border-b space-y-2" style={{ borderColor: '#e2e8f0', background: '#f8fafc' }}>
          <div className="text-xs font-bold text-slate-600">Teacher / event draft (Pending only)</div>
          <select
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            className="w-full text-sm px-2 py-2 rounded-xl border bg-white"
            style={{ borderColor: '#e2e8f0' }}
          >
            <option value="">Select teacher…</option>
            {teachers.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name || t.fullName || 'Teacher'}
                {t.phone ? ` (${t.phone})` : ''}
              </option>
            ))}
          </select>
          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            rows={2}
            placeholder="Optional message text (English / Roman Urdu). Empty = default template."
            className="w-full text-sm px-2 py-2 rounded-xl border"
            style={{ borderColor: '#e2e8f0' }}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={actionBusy || !teacherId}
              onClick={draftForTeacher}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
              style={{ background: teacherId ? '#059669' : '#94a3b8' }}
            >
              Draft for teacher
            </button>
            <button
              type="button"
              disabled={actionBusy}
              onClick={draftEvent}
              className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: '#e0f2fe', color: '#0369a1' }}
            >
              Draft event notice
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Creates AI Actions Pending. Approve & send → teacher SE Community chat. Event does not mass-broadcast.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-slate-500">
              Ask about absents or fees, or use the teacher box above. Nothing is sent until you Approve in AI Actions.
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`text-sm p-3 rounded-2xl max-w-[95%] ${m.role === 'user' ? 'ml-auto' : ''}`}
              style={{
                background: m.role === 'user' ? '#0284c7' : '#f8fafc',
                color: m.role === 'user' ? '#fff' : '#0f172a',
                border: m.role === 'user' ? 'none' : '1px solid #e2e8f0',
              }}
            >
              {m.text}
              {m.meta && <div className="text-xs mt-1 opacity-70">{m.meta}</div>}
            </div>
          ))}
          {actions.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="text-xs font-bold text-slate-500">Suggested actions (Pending drafts only)</div>
              {actions.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  disabled={actionBusy}
                  onClick={() => {
                    if (a.id === 'draft_teacher_or_event') {
                      if (teacherId) runAction('draft_teacher_message', { teacherId })
                      else runAction('draft_event_notice')
                    } else runAction(a.id)
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold border"
                  style={{ borderColor: '#bbf7d0', background: '#ecfdf5', color: '#065f46' }}
                >
                  {a.label}
                  {a.description && <div className="text-xs font-normal opacity-80">{a.description}</div>}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  onClose()
                  navigate('/ai-actions')
                }}
                className="w-full text-sm font-bold py-2 rounded-xl text-white"
                style={{ background: '#0284c7' }}
              >
                Open AI Actions →
              </button>
            </div>
          )}
        </div>

        <div className="p-3 border-t" style={{ borderColor: '#e2e8f0' }}>
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && ask()}
              placeholder="English or Roman Urdu..."
              className="flex-1 px-3 py-2 rounded-xl border text-sm outline-none"
              style={{ borderColor: '#e2e8f0' }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => ask()}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: busy ? '#7dd3fc' : '#0284c7' }}
            >
              {busy ? '…' : 'Ask'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
