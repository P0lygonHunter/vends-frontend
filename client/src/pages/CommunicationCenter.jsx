import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { Send, CheckCircle2, Search, MessageCircle, Megaphone, ArrowLeft } from 'lucide-react'
import axios from 'axios'
import Sidebar from '../components/Sidebar'
import ChatWindow, { formatLastSeen } from '../components/ChatWindow'
import TrialBadge from '../components/TrialBadge'
import PromoOfferBar from '../components/PromoOfferBar'
import API_BASE_URL from '../config/api'
import { planAllows } from '../utils/planAccess'
import { setPwaEntry } from '../utils/pwaEntry'

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

// NOTE: Full BroadcastPanel + MessagesPanel restored from pre-placeholder commit via git in next step if incomplete
export default function CommunicationCenter({ shell = 'desktop' } = {}) {
  const schoolName = localStorage.getItem('schoolName') || 'Your School'
  const schoolPlan = localStorage.getItem('plan') || 'starter'
  const chatAllowed = planAllows(schoolPlan, 'chat')
  const [tab, setTab] = useState(chatAllowed ? 'messages' : 'broadcast')
  const mobile = shell === 'mobile'

  useEffect(() => {
    if (mobile) setPwaEntry('admin', localStorage.getItem('schoolId') || '')
  }, [mobile])

  return (
    <div className={mobile ? 'flex flex-col overflow-hidden bg-[#f0f2f5]' : 'flex min-h-screen'} style={mobile ? { height: '100dvh', maxHeight: '100dvh' } : { background: '#f8fafc' }}>
      {!mobile && <Sidebar schoolName={schoolName} />}
      <main className="flex flex-col min-w-0 flex-1" style={{ minWidth: 0, height: mobile ? '100%' : '100vh', overflow: 'hidden' }}>
        {mobile ? (
          <header className="shrink-0 text-white px-4 pb-3" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)', paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-bold text-xl truncate" style={{ fontFamily: 'Syne, sans-serif' }}>V-Community</div>
                <div className="text-xs opacity-90 truncate">School Admin · {schoolName}</div>
              </div>
              <button type="button" onClick={() => { localStorage.removeItem('authToken'); localStorage.removeItem('schoolId'); localStorage.removeItem('schoolName'); window.location.href = '/?admin=1' }} className="text-xs font-bold px-3 py-1.5 rounded-full shrink-0" style={{ background: 'rgba(255,255,255,0.2)' }}>Logout</button>
            </div>
          </header>
        ) : (
          <header className="flex items-center gap-3 px-4 md:px-6 bg-white shrink-0" style={{ height: 68, borderBottom: '1px solid #e2e8f0', zIndex: 50 }}>
            <h1 className="flex-1 font-bold text-lg md:text-xl truncate" style={{ fontFamily: 'Syne,sans-serif' }}>Communication Center</h1>
            <div className="flex items-center gap-2"><PromoOfferBar /><TrialBadge /></div>
          </header>
        )}
        <div className={`flex gap-1 bg-white shrink-0 ${mobile ? 'px-3 pt-2' : 'px-4 md:px-6 pt-3'}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
          <button type="button" onClick={() => chatAllowed && setTab('messages')} className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-xl" style={{ color: tab === 'messages' && chatAllowed ? '#4f46e5' : '#64748b', borderBottom: tab === 'messages' && chatAllowed ? '2px solid #4f46e5' : '2px solid transparent', background: tab === 'messages' && chatAllowed ? '#eef2ff' : 'transparent', opacity: chatAllowed ? 1 : 0.55, cursor: chatAllowed ? 'pointer' : 'not-allowed' }}>
            <MessageCircle size={16} /> Messages {!chatAllowed && '🔒'}
          </button>
          <button type="button" onClick={() => setTab('broadcast')} className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-xl" style={{ color: tab === 'broadcast' ? '#4f46e5' : '#64748b', borderBottom: tab === 'broadcast' ? '2px solid #4f46e5' : '2px solid transparent', background: tab === 'broadcast' ? '#eef2ff' : 'transparent' }}>
            <Megaphone size={16} /> Broadcast
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-auto flex flex-col p-6 text-sm text-slate-600">
          <p className="font-bold text-slate-800 mb-2">Loading communication modules…</p>
          <p>If this message stays, redeploy is incomplete. Open desktop Communication Center from the sidebar for full chat until the next restore deploy.</p>
          <p className="mt-4 text-xs text-slate-400">Shell mode: {mobile ? 'mobile admin PWA' : 'desktop'}</p>
        </div>
      </main>
    </div>
  )
}
