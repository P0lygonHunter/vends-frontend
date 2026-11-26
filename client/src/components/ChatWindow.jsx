import { useEffect, useRef, useState } from 'react'
import { Send, Paperclip, Mic, Square, X, Smile, Reply } from 'lucide-react'

const bubbleColors = {
  admin: { bg: '#0284c7', text: '#fff' },
  parent: { bg: '#dcf8c6', text: '#111b21' },
  teacher: { bg: '#dcf8c6', text: '#111b21' },
}

const EMOJI_SET = [
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰', '😘',
  '👍', '👎', '👏', '🙏', '💪', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
  '🔥', '⭐', '✨', '🎉', '🎊', '✅', '❌', '⚠️', '📌', '📚', '✏️', '💰', '📱', '📷',
]


/** Human-readable last-seen for chat headers */
export function formatLastSeen(lastSeenAt) {
  if (!lastSeenAt) return ''
  const t = new Date(lastSeenAt).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  if (diff < 60 * 1000) return 'Online'
  if (diff < 60 * 60 * 1000) {
    const m = Math.floor(diff / 60000)
    return `Last seen ${m} min ago`
  }
  if (diff < 24 * 60 * 60 * 1000) {
    const h = Math.floor(diff / 3600000)
    return `Last seen ${h}h ago`
  }
  return `Last seen ${new Date(lastSeenAt).toLocaleDateString()}`
}

function previewLabel(m) {
  if (!m) return ''
  if (m.mediaType === 'image') return '📷 Photo'
  if (m.mediaType === 'audio') return '🎤 Voice note'
  return (m.text || '').slice(0, 80)
}

export default function ChatWindow({
  messages = [],
  me = 'admin',
  mySenderType,
  onSend,
  sending = false,
  emptyText = 'No messages yet. Say hello!',
  capabilities = {},
  chatCaps,
  initialText = '',
}) {
  const [text, setText] = useState('')
  const [pendingImage, setPendingImage] = useState(null)
  const [recording, setRecording] = useState(false)
  const [recordError, setRecordError] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const [replyTo, setReplyTo] = useState(null)
  const bottomRef = useRef(null)
  const fileRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const initialApplied = useRef(false)

  const myRole = mySenderType || me
  const featureCaps = chatCaps || capabilities || {}
  const caps = {
    image: featureCaps.image !== false && featureCaps.chatEnabled !== false,
    audio: featureCaps.audio !== false && featureCaps.chatEnabled !== false,
    emoji: featureCaps.emoji !== false,
  }

  useEffect(() => {
    if (initialText && !initialApplied.current) {
      setText(initialText)
      initialApplied.current = true
    }
  }, [initialText])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, sending])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setLightbox(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const insertEmoji = (em) => {
    setText((t) => t + em)
    setShowEmoji(false)
  }

  const handleSend = (e) => {
    e?.preventDefault?.()
    const trimmed = text.trim()
    if (!trimmed && !pendingImage) return
    const payload = {
      text: trimmed,
      mediaType: pendingImage ? 'image' : 'none',
      mediaData: pendingImage || '',
    }
    if (replyTo) {
      payload.replyTo = {
        messageId: replyTo._id,
        text: previewLabel(replyTo),
        mediaType: replyTo.mediaType || 'none',
        senderType: replyTo.senderType || '',
      }
    }
    onSend(payload)
    setText('')
    setPendingImage(null)
    setReplyTo(null)
    setShowEmoji(false)
  }

  const onPickImage = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !file.type.startsWith('image/')) {
      setRecordError('Please choose a JPEG, PNG or WebP image.')
      return
    }
    if (file.size > 900 * 1024) {
      setRecordError('Image is too large. Keep under ~900KB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setPendingImage(String(reader.result || ''))
    reader.readAsDataURL(file)
  }

  const startRecording = async () => {
    setRecordError('')
    if (!caps.audio) {
      setRecordError('Voice notes require Standard plan or higher.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = (ev) => {
        if (ev.data.size) chunksRef.current.push(ev.data)
      }
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.onload = () => {
          const dataUrl = String(reader.result || '')
          const payload = { text: '', mediaType: 'audio', mediaData: dataUrl }
          if (replyTo) {
            payload.replyTo = {
              messageId: replyTo._id,
              text: previewLabel(replyTo),
              mediaType: replyTo.mediaType || 'none',
              senderType: replyTo.senderType || '',
            }
          }
          onSend(payload)
          setReplyTo(null)
        }
        reader.readAsDataURL(blob)
      }
      mediaRecorderRef.current = mr
      mr.start()
      setRecording(true)
    } catch {
      setRecordError('Microphone permission denied or unavailable.')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  return (
    <div className="flex flex-col h-full bg-[#efeae2]">
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {messages.length === 0 && (
          <p className="text-center text-sm text-slate-500 mt-8">{emptyText}</p>
        )}
        {messages.map((m) => {
          const mine = (m.senderType || '') === myRole || m.senderType === me
          const colors = bubbleColors[m.senderType] || bubbleColors.admin
          const quote = m.replyTo && (m.replyTo.text || m.replyTo.mediaType !== 'none') ? m.replyTo : null
          return (
            <div
              key={m._id || `${m.createdAt}-${m.text}`}
              className={`flex ${mine ? 'justify-end' : 'justify-start'} group`}
            >
              <div
                className="max-w-[80%] rounded-2xl px-3 py-2 shadow-sm"
                style={{
                  background: colors.bg,
                  color: colors.text,
                }}
              >
                {quote && (
                  <div className="mb-1.5 px-2 py-1 rounded-lg text-xs border-l-4" style={{ borderColor: '#0284c7', background: 'rgba(0,0,0,0.06)' }}>
                    <div className="truncate">{quote.text || (quote.mediaType === 'image' ? '📷 Photo' : '')}</div>
                  </div>
                )}
                {m.mediaType === 'image' && m.mediaData && (
                  <button type="button" className="block w-full text-left" onClick={() => setLightbox(m.mediaData)}>
                    <img src={m.mediaData} alt="" className="rounded-lg max-h-48 object-cover" />
                  </button>
                )}
                {m.mediaType === 'audio' && m.mediaData && (
                  <audio controls src={m.mediaData} className="max-w-full mt-1" />
                )}
                {m.text && m.text !== '📷 Photo' && m.text !== '🎤 Voice note' && (
                  <div className="whitespace-pre-wrap break-words mt-1">{m.text}</div>
                )}
                <div className={`text-[10px] mt-1 flex items-center gap-1 ${mine ? 'justify-end' : 'justify-start'}`} style={{ opacity: 0.7 }}>
                  {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
              </div>
              <button
                type="button"
                className="opacity-0 group-hover:opacity-100 self-center p-1 text-slate-400 hover:text-sky-600 ml-0.5"
                onClick={() => setReplyTo(m)}
                title="Reply"
              >
                <Reply size={14} />
              </button>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {recordError && (
        <div className="px-3 py-1 text-xs text-red-600 bg-red-50 flex justify-between">
          <span>{recordError}</span>
          <button type="button" onClick={() => setRecordError('')}>×</button>
        </div>
      )}

      {pendingImage && (
        <div className="px-3 py-2 bg-white border-t flex items-center gap-2">
          <img src={pendingImage} alt="" className="h-12 w-12 object-cover rounded" />
          <span className="text-xs text-slate-500 flex-1">Photo ready to send</span>
          <button type="button" onClick={() => setPendingImage(null)} className="p-1 text-slate-400"><X size={16} /></button>
        </div>
      )}

      {replyTo && (
        <div className="px-3 py-2 bg-sky-50 border-t flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-sky-600">Replying to {replyTo.senderType || 'message'}</div>
            <div className="text-xs text-slate-500 truncate">{previewLabel(replyTo)}</div>
          </div>
          <button type="button" onClick={() => setReplyTo(null)} className="p-1 text-slate-400"><X size={16} /></button>
        </div>
      )}

      {showEmoji && (
        <div className="px-2 py-2 bg-white border-t flex flex-wrap gap-1 max-h-28 overflow-y-auto">
          {EMOJI_SET.map((em) => (
            <button key={em} type="button" className="text-xl leading-none p-1 hover:bg-slate-100 rounded" onClick={() => insertEmoji(em)}>
              {em}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSend} className="flex items-end gap-1 p-2 bg-white border-t">
        <button type="button" onClick={() => setShowEmoji((v) => !v)} className="p-2 text-slate-500 hover:text-sky-600" title="Emoji">
          <Smile size={20} />
        </button>
        {caps.image && (
          <>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
            <button type="button" onClick={() => fileRef.current?.click()} className="p-2 text-slate-500 hover:text-sky-600" title="Photo">
              <Paperclip size={20} />
            </button>
          </>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={1}
          placeholder="Type a message…"
          className="flex-1 resize-none px-3 py-2 rounded-2xl border text-sm outline-none focus:border-sky-400"
          style={{ borderColor: '#e2e8f0', maxHeight: 120 }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend(e)
            }
          }}
        />
        {caps.audio && (
          recording ? (
            <button type="button" onClick={stopRecording} className="p-2 text-red-600" title="Stop">
              <Square size={20} />
            </button>
          ) : (
            <button type="button" onClick={startRecording} className="p-2 text-slate-500 hover:text-sky-600" title="Voice">
              <Mic size={20} />
            </button>
          )
        )}
        <button type="submit" disabled={sending} className="p-2 rounded-full text-white disabled:opacity-50" style={{ background: '#0284c7' }} title="Send">
          <Send size={18} />
        </button>
      </form>

      {lightbox && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-h-full max-w-full rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}
