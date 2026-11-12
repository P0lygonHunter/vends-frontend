import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import API_BASE_URL from '../config/api'

const CHIPS = [
  { q: 'How many students are absent today?', label: 'Absents today' },
  { q: 'Which fees are pending?', label: 'Pending fees' },
  { q: 'Create fee reminder drafts for pending balances', label: 'Fee drafts' },
  { q: 'Create absence notice drafts for today', label: 'Absence drafts' },
  { q: 'Draft an event announcement for parents and teachers', label: 'Event draft' },
]

export default function AskAiDrawer({ open, onClose }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState([])
  const [actions, setActions] = useState([])
  const [actionBusy, setActionBusy] = useState(false)

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

  const runAction = async (actionId) => {
    setActionBusy(true)
    try {
      const lastUser = [...messages].reverse().find((x) => x.role === 'user')
      const res = await axios.post(`${API_BASE_URL}/ai/ask/action`, {
        action: actionId,
        text: lastUser?.text || '',
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
            <div className="text-sky-100 text-xs">School data · drafts · web (when needed)</div>
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

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-slate-500">
              Ask about absents, fees, or request reminder drafts. Messages are never sent until you Approve in AI Actions.
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
              <div className="text-xs font-bold text-slate-500">Suggested actions (creates Pending drafts only)</div>
              {actions.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  disabled={actionBusy}
                  onClick={() => runAction(a.id)}
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
