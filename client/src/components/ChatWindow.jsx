import { useEffect, useRef, useState } from 'react'
import { Send, Paperclip, Mic, Square, X, Smile, Reply } from 'lucide-react'

const bubbleColors = {
  admin: { bg: '#4f46e5', text: '#fff' },
  parent: { bg: '#dcf8c6', text: '#111b21' },
  teacher: { bg: '#dcf8c6', text: '#111b21' },
}

const EMOJI_SET = [
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰', '😘',
  '👍', '👎', '👏', '🙏', '💪', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
  '🔥', '⭐', '✨', '🎉', '🎊', '✅', '❌', '⚠️', '📌', '📚', '✏️', '💰', '📱', '📷',
]

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

  const myRole = mySenderType || me
  const featureCaps = chatCaps || capabilities || {}
  const caps = {
    image: featureCaps.image !== false && featureCaps.chatEnabled !== false,
    audio: featureCaps.audio !== false && featureCaps.chatEnabled !== false,
    emoji: featureCaps.emoji !== false,
  }

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
    try {
      mediaRecorderRef.current?.stop()
    } catch (_) {}
    setRecording(false)
  }

  const onTouchStart = (e) => {
    const pt = e.touches?.[0]
    if (!pt) return
    touchStartX.current = pt.clientX
    touchStartY.current = pt.clientY
  }

  const onTouchEnd = (e, m) => {
    const pt = e.changedTouches?.[0]
    if (!pt) return
    const dx = pt.clientX - touchStartX.current
    const dy = Math.abs(pt.clientY - touchStartY.current)
    // swipe right → reply (WhatsApp-style)
    if (dx > 56 && dy < 40) setReplyTo(m)
  }

  const onPointerDown = (e) => {
    if (e.pointerType === 'touch') return
    touchStartX.current = e.clientX
    touchStartY.current = e.clientY
  }

  const onPointerUp = (e, m) => {
    if (e.pointerType === 'touch') return
    const dx = e.clientX - touchStartX.current
    const dy = Math.abs(e.clientY - touchStartY.current)
    if (dx > 56 && dy < 40) setReplyTo(m)
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#efeae2]">
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-slate-500 mt-8">{emptyText}</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderType === myRole
            const colors = bubbleColors[m.senderType] || bubbleColors.parent
            const time = m.createdAt
              ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : ''
            const read = !!m.readAt
            const quote = m.replyTo && (m.replyTo.text || m.replyTo.mediaType !== 'none') ? m.replyTo : null
            return (
              <div
                key={m._id || `${m.createdAt}-${m.text}`}
                className={`flex group ${mine ? 'justify-end' : 'justify-start'}`}
                onTouchStart={onTouchStart}
                onTouchEnd={(e) => onTouchEnd(e, m)}
                onPointerDown={onPointerDown}
                onPointerUp={(e) => onPointerUp(e, m)}
              >
                {!mine && (
                  <button
                    type="button"
                    title="Reply"
                    onClick={() => setReplyTo(m)}
                    className="opacity-0 group-hover:opacity-100 self-center p-1 text-slate-400 hover:text-indigo-600 mr-0.5"
                  >
                    <Reply size={14} />
                  </button>
                )}
                <div
                  className="max-w-[78%] px-3 py-2 shadow-sm relative"
                  style={{
                    background: colors.bg,
                    color: colors.text,
                    borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  }}
                >
                  {quote && (
                    <div
                      className="mb-1.5 px-2 py-1 rounded-lg text-xs border-l-4"
                      style={{
                        background: mine ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.06)',
                        borderColor: '#4f46e5',
                        color: mine ? 'rgba(255,255,255,0.9)' : '#334155',
                      }}
                    >
                      <div className="font-semibold opacity-80 capitalize">{quote.senderType || 'Reply'}</div>
                      <div className="truncate">{quote.text || (quote.mediaType === 'image' ? '📷 Photo' : '')}</div>
                    </div>
                  )}
                  {m.mediaType === 'image' && m.mediaData && (
                    <button type="button" className="block w-full text-left" onClick={() => setLightbox(m.mediaData)}>
                      <img
                        src={m.mediaData}
                        alt="Attachment"
                        className="rounded-lg max-w-full mb-1 max-h-48 object-cover cursor-pointer hover:opacity-95"
                      />
                    </button>
                  )}
                  {m.mediaType === 'audio' && m.mediaData && (
                    <audio controls src={m.mediaData} className="max-w-full my-1" style={{ height: 36 }} />
                  )}
                  {m.text && m.text !== '📷 Photo' && m.text !== '🎤 Voice note' && (
                    <div className="whitespace-pre-wrap break-words mt-1">{m.text}</div>
                  )}
                  <div
                    className={`text-[10px] mt-1 flex items-center gap-1 ${mine ? 'justify-end' : 'justify-start'}`}
                    style={{ opacity: 0.7 }}
                  >
                    <span>{time}</span>
                    {mine && (
                      <span style={{ color: read ? '#53bdeb' : 'inherit', letterSpacing: -1 }}>
                        {read ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>
                {mine && (
                  <button
                    type="button"
                    title="Reply"
                    onClick={() => setReplyTo(m)}
                    className="opacity-0 group-hover:opacity-100 self-center p-1 text-slate-400 hover:text-indigo-600 ml-0.5"
                  >
                    <Reply size={14} />
                  </button>
                )}
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {recordError && (
        <div className="px-3 py-1 text-xs text-red-600 bg-red-50 flex justify-between">
          <span>{recordError}</span>
          <button type="button" onClick={() => setRecordError('')}>
            ×
          </button>
        </div>
      )}

      {pendingImage && (
        <div className="px-3 py-2 bg-white border-t flex items-center gap-2" style={{ borderColor: '#e2e8f0' }}>
          <img src={pendingImage} alt="" className="h-14 w-14 object-cover rounded-lg" />
          <span className="text-xs text-slate-500 flex-1">Photo ready to send</span>
          <button type="button" onClick={() => setPendingImage(null)} className="p-1 text-slate-400">
            <X size={16} />
          </button>
        </div>
      )}

      {replyTo && (
        <div className="px-3 py-2 bg-white border-t flex items-center gap-2" style={{ borderColor: '#e2e8f0', borderLeft: '4px solid #4f46e5' }}>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-indigo-600">Replying to {replyTo.senderType || 'message'}</div>
            <div className="text-xs text-slate-500 truncate">{previewLabel(replyTo)}</div>
          </div>
          <button type="button" onClick={() => setReplyTo(null)} className="p-1 text-slate-400">
            <X size={16} />
          </button>
        </div>
      )}

      {showEmoji && (
        <div className="px-2 py-2 bg-white border-t grid grid-cols-8 gap-1 max-h-32 overflow-y-auto" style={{ borderColor: '#e2e8f0' }}>
          {EMOJI_SET.map((em) => (
            <button key={em} type="button" className="text-xl leading-none p-1 hover:bg-slate-100 rounded" onClick={() => insertEmoji(em)}>
              {em}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSend} className="flex items-center gap-1.5 px-2 py-2 bg-white border-t" style={{ borderColor: '#e2e8f0' }}>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPickImage} />
        <button
          type="button"
          title={caps.image ? 'Attach photo' : 'Photos require Standard+'}
          onClick={() => {
            if (!caps.image) setRecordError('Photo attachments require Standard plan or higher.')
            else fileRef.current?.click()
          }}
          className="p-2 rounded-full hover:bg-slate-100 text-slate-500 disabled:opacity-40"
          style={{ opacity: caps.image ? 1 : 0.4 }}
        >
          <Paperclip size={18} />
        </button>
        {recording ? (
          <button type="button" onClick={stopRecording} className="p-2 rounded-full text-white" style={{ background: '#ef4444' }}>
            <Square size={16} />
          </button>
        ) : (
          <button
            type="button"
            title={caps.audio ? 'Voice note' : 'Voice requires Standard+'}
            onClick={startRecording}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
            style={{ opacity: caps.audio ? 1 : 0.4 }}
          >
            <Mic size={18} />
          </button>
        )}
        <button
          type="button"
          title="Emoji"
          onClick={() => setShowEmoji((v) => !v)}
          className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
        >
          <Smile size={18} />
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={recording ? 'Recording…' : replyTo ? 'Type a reply...' : 'Type a message...'}
          disabled={recording}
          className="flex-1 px-4 py-2.5 rounded-full border text-sm outline-none"
          style={{ borderColor: '#e2e8f0', background: '#f8fafc' }}
        />
        <button
          type="submit"
          disabled={sending || recording || (!text.trim() && !pendingImage)}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white disabled:opacity-50"
          style={{ background: '#4f46e5' }}
        >
          <Send size={16} />
        </button>
      </form>

      {/* Full-screen image lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white text-2xl leading-none p-2"
            onClick={() => setLightbox(null)}
            aria-label="Close"
          >
            ×
          </button>
          <img
            src={lightbox}
            alt="Full size"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
