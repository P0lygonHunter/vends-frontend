import { useEffect, useRef, useState } from 'react'
import { Send, Paperclip, Mic, Square, X } from 'lucide-react'

const bubbleColors = {
  admin: { bg: '#4f46e5', text: '#fff' },
  parent: { bg: '#dcf8c6', text: '#111b21' },
  teacher: { bg: '#dcf8c6', text: '#111b21' },
}
const MAX_IMAGE_CHARS = 700000
const MAX_AUDIO_CHARS = 1500000

export function formatLastSeen(date) {
  if (!date) return null
  const d = new Date(date)
  const diff = Date.now() - d.getTime()
  if (diff < 60000) return 'Online'
  if (diff < 3600000) return `Last seen ${Math.floor(diff / 60000)} min ago`
  if (diff < 86400000) return `Last seen ${Math.floor(diff / 3600000)} h ago`
  return `Last seen ${d.toLocaleDateString()}`
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

export default function ChatWindow({ messages, mySenderType, onSend, sending, emptyText = 'No messages yet. Say hello!' }) {
  const [text, setText] = useState('')
  const [pendingImage, setPendingImage] = useState(null)
  const [recording, setRecording] = useState(false)
  const [recordError, setRecordError] = useState('')
  const bottomRef = useRef(null)
  const fileRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  const handleSend = (e) => {
    e?.preventDefault()
    if (sending) return
    const trimmed = text.trim()
    if (pendingImage) {
      onSend({ text: trimmed, mediaType: 'image', mediaData: pendingImage })
      setPendingImage(null); setText(''); return
    }
    if (!trimmed) return
    onSend({ text: trimmed, mediaType: 'none', mediaData: '' })
    setText('')
  }

  const onPickImage = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !file.type.startsWith('image/')) { setRecordError('Only images allowed.'); return }
    try {
      const dataUrl = await fileToDataUrl(file)
      if (dataUrl.length > MAX_IMAGE_CHARS) { setRecordError('Image too large (~500KB max).'); return }
      setRecordError(''); setPendingImage(dataUrl)
    } catch { setRecordError('Could not read image.') }
  }

  const startRecording = async () => {
    setRecordError('')
    if (!navigator.mediaDevices?.getUserMedia) { setRecordError('Mic not supported.'); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (ev) => { if (ev.data.size) chunksRef.current.push(ev.data) }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: mime })
        const reader = new FileReader()
        reader.onloadend = () => {
          const dataUrl = reader.result
          if (typeof dataUrl !== 'string' || dataUrl.length > MAX_AUDIO_CHARS) {
            setRecordError('Voice note too long.'); return
          }
          onSend({ text: '', mediaType: 'audio', mediaData: dataUrl })
        }
        reader.readAsDataURL(blob)
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch { setRecordError('Microphone permission denied.') }
  }

  const stopRecording = () => {
    const rec = mediaRecorderRef.current
    if (rec && rec.state !== 'inactive') rec.stop()
    setRecording(false)
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#efeae2' }}>
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1.5">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-slate-400">{emptyText}</div>
        ) : messages.map((m) => {
          const mine = m.senderType === mySenderType
          const colors = mine ? (bubbleColors[mySenderType] || bubbleColors.admin) : { bg: '#fff', text: '#111b21' }
          const time = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          const read = Boolean(m.readAt)
          return (
            <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className="relative max-w-[75%] px-3.5 py-2 text-sm shadow-sm" style={{
                background: colors.bg, color: colors.text,
                borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              }}>
                {m.mediaType === 'image' && m.mediaData && (
                  <img src={m.mediaData} alt="" className="rounded-lg max-w-full mb-1 max-h-48 object-cover" />
                )}
                {m.mediaType === 'audio' && m.mediaData && (
                  <audio controls src={m.mediaData} className="max-w-full mb-1" style={{ height: 32 }} />
                )}
                {m.text && m.mediaType === 'none' && <div className="whitespace-pre-wrap break-words">{m.text}</div>}
                {m.text && m.mediaType !== 'none' && m.text !== '📷 Photo' && m.text !== '🎤 Voice note' && (
                  <div className="whitespace-pre-wrap break-words mt-1">{m.text}</div>
                )}
                <div className={`text-[10px] mt-1 flex items-center gap-1 ${mine ? 'justify-end' : 'justify-start'}`} style={{ opacity: 0.7 }}>
                  <span>{time}</span>
                  {mine && <span style={{ color: read ? '#53bdeb' : 'inherit', letterSpacing: -1 }}>{read ? '✓✓' : '✓'}</span>}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      {recordError && <div className="px-3 py-1 text-xs text-red-600 bg-red-50">{recordError}</div>}
      {pendingImage && (
        <div className="px-3 py-2 bg-white border-t flex items-center gap-2" style={{ borderColor: '#e2e8f0' }}>
          <img src={pendingImage} alt="" className="h-14 w-14 object-cover rounded-lg" />
          <span className="text-xs text-slate-500 flex-1">Photo ready</span>
          <button type="button" onClick={() => setPendingImage(null)} className="p-1"><X size={16} /></button>
        </div>
      )}
      <form onSubmit={handleSend} className="flex items-center gap-1.5 px-2 py-2 bg-white border-t" style={{ borderColor: '#e2e8f0' }}>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPickImage} />
        <button type="button" onClick={() => fileRef.current?.click()} className="p-2 rounded-full hover:bg-slate-100 text-slate-500"><Paperclip size={18} /></button>
        {recording ? (
          <button type="button" onClick={stopRecording} className="p-2 rounded-full text-white" style={{ background: '#ef4444' }}><Square size={16} /></button>
        ) : (
          <button type="button" onClick={startRecording} className="p-2 rounded-full hover:bg-slate-100 text-slate-500"><Mic size={18} /></button>
        )}
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={recording ? 'Recording…' : 'Type a message...'} disabled={recording}
          className="flex-1 px-4 py-2.5 rounded-full border text-sm outline-none" style={{ borderColor: '#e2e8f0', background: '#f8fafc' }} />
        <button type="submit" disabled={sending || recording || (!text.trim() && !pendingImage)}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white disabled:opacity-50" style={{ background: '#4f46e5' }}>
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
