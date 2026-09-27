import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'

const bubbleColors = {
  admin: { bg: '#4f46e5', text: '#fff' },
  parent: { bg: '#dcf8c6', text: '#111b21' },
  teacher: { bg: '#dcf8c6', text: '#111b21' },
}

// mySenderType: which side is viewing this window ('admin' | 'parent' | 'teacher').
// Messages sent BY that side render on the right in the brand indigo; the other
// side's messages render on the left in a neutral bubble — same visual language
// as any chat app, without reusing anyone else's exact styling.
export default function ChatWindow({ messages, mySenderType, onSend, sending, emptyText = 'No messages yet. Say hello!' }) {
  const [text, setText] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = (e) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || sending) return
    onSend(trimmed)
    setText('')
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#efeae2' }}>
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-slate-400">{emptyText}</div>
        ) : (
          messages.map(m => {
            const mine = m.senderType === mySenderType
            const colors = mine ? bubbleColors[mySenderType] : { bg: '#fff', text: '#111b21' }
            return (
              <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm"
                  style={{ background: colors.bg, color: colors.text, borderBottomRightRadius: mine ? 4 : 16, borderBottomLeftRadius: mine ? 16 : 4 }}
                >
                  <div className="whitespace-pre-wrap break-words">{m.text}</div>
                  <div className={`text-[10px] mt-1 ${mine ? 'text-right' : 'text-left'}`} style={{ opacity: 0.6 }}>
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2 px-3 py-3 bg-white border-t" style={{ borderColor: '#e2e8f0' }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2.5 rounded-full border text-sm outline-none"
          style={{ borderColor: '#e2e8f0', background: '#f8fafc' }}
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white disabled:opacity-50 shrink-0"
          style={{ background: '#4f46e5' }}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
