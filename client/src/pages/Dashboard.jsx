import { useState, useEffect } from 'react'
import { schedulePushPrompt } from '../services/pushNotifications'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TrialBadge from '../components/TrialBadge'
import PromoOfferBar from '../components/PromoOfferBar'
import axios from 'axios'
import API_BASE_URL from '../config/api'

export default function Dashboard() {
  useEffect(() => { schedulePushPrompt('school') }, [])
  const navigate = useNavigate()
  const schoolName = localStorage.getItem('schoolName') || 'Your School'
  const principal = localStorage.getItem('principalName') || 'Admin'
  const schoolId = localStorage.getItem('schoolId')

  const [stats, setStats] = useState({ students: 0, teachers: 0, attendanceRate: 0, present: 0, absent: 0, onLeave: 0 })
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [vService, setVService] = useState([])
  const [aiCards, setAiCards] = useState([])
  const [aiMeta, setAiMeta] = useState({ loading: true, locked: false, error: '', quota: null, source: null, gateway: false })
  const [askOpen, setAskOpen] = useState(false)
  const [askQ, setAskQ] = useState('')
  const [askA, setAskA] = useState('')
  const [askBusy, setAskBusy] = useState(false)

  useEffect(() => {
    fetchData()
    fetchInsights()
  }, [])

  const fetchInsights = async (refresh = false) => {
    setAiMeta((m) => ({ ...m, loading: true, error: '' }))
    try {
      const res = await axios.get(`${API_BASE_URL}/ai/insights${refresh ? '?refresh=1' : ''}`)
      setAiCards(Array.isArray(res.data.cards) ? res.data.cards : [])
      setAiMeta({
        loading: false,
        locked: false,
        error: '',
        quota: res.data.quota || null,
        source: res.data.source || null,
        gateway: Boolean(res.data.gateway),
      })
    } catch (err) {
      const code = err.response?.data?.code
      const locked = code === 'AI_PLAN' || err.response?.status === 403 && err.response?.data?.locked
      setAiCards([])
      setAiMeta({
        loading: false,
        locked: Boolean(locked || code === 'AI_PLAN'),
        error: err.response?.data?.error || 'Could not load AI insights',
        quota: err.response?.data?.limit != null
          ? { limit: err.response.data.limit, used: err.response.data.used }
          : null,
        source: null,
        gateway: false,
      })
    }
  }

  const handleAskAi = async () => {
    if (!askQ.trim()) return
    setAskBusy(true)
    setAskA('')
    try {
      const res = await axios.post(`${API_BASE_URL}/ai/ask`, { question: askQ.trim() })
      setAskA(res.data.answer || '')
      if (res.data.quota) setAiMeta((m) => ({ ...m, quota: res.data.quota }))
    } catch (err) {
      setAskA(err.response?.data?.error || 'Ask AI failed')
    }
    setAskBusy(false)
  }

  const fetchData = async () => {

    try {
      const [studentsRes, teachersRes, attRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/students/${schoolId}`),
        axios.get(`${API_BASE_URL}/teachers/${schoolId}`),
        axios.get(`${API_BASE_URL}/attendance/stats/${schoolId}`)
      ])
      setStats({
        students: studentsRes.data.length,
        teachers: teachersRes.data.length,
        attendanceRate: attRes.data.rate || 0,
        present: attRes.data.present || 0,
        absent: attRes.data.absent || 0,
        onLeave: attRes.data.onLeave || 0,
      })
      setActivity(studentsRes.data.slice(-5).reverse())
      try {
        const vs = await axios.get(`${API_BASE_URL}/v-service`)
        setVService(Array.isArray(vs.data) ? vs.data.slice(0, 5) : [])
      } catch {
        setVService([])
      }
    } catch (err) {
      console.log(err)
    }
    setLoading(false)
  }

  const statCards = [
    { num: stats.students, label: 'Total Students', icon: '👨‍🎓', color: '#e0f2fe', change: `${stats.students} registered`, up: true },
    { num: stats.teachers, label: 'Total Teachers', icon: '👩‍🏫', color: '#ecfdf5', change: `${stats.teachers} registered`, up: true },
    { num: stats.present, label: 'Present Today', icon: '✅', color: '#f0fdf4', change: `${stats.absent} absent today`, up: true },
    { num: `${stats.attendanceRate}%`, label: 'Attendance Rate', icon: '📈', color: '#fffbeb', change: 'Based on today', up: true },
  ]

  const colors = ['#0284c7','#ef4444','#10b981','#f59e0b','#7c3aed']

  const statusStyle = (status) => {
    if (status === 'On Leave') return { background: '#fffbeb', color: '#d97706' }
    if (status === 'Suspended' || status === 'Absent') {
      return { background: '#fef2f2', color: '#dc2626' }
    }
    return { background: '#ecfdf5', color: '#059669' }
  }

  return (
    <div className="flex min-h-screen" style={{background:'#f8fafc'}}>
      <Sidebar schoolName={schoolName} />

      <div className="app-main" style={{flex:1}}>
        {/* Topbar */}
        <div className="flex items-center gap-4 px-4 sm:px-8 bg-white sticky-topbar" style={{height:'68px', borderBottom:'1px solid #e2e8f0', position:'sticky', top:0, zIndex:50}}>
          <h2 className="flex-1 font-bold text-xl" style={{fontFamily:'Syne,sans-serif'}}>Dashboard</h2>
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl"
            style={{background:'#f1f5f9', border:'1.5px solid #e2e8f0'}}>
            <span>🔍</span>
            <input placeholder="Search students, teachers..."
              className="bg-transparent outline-none text-sm w-48"/>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end"><PromoOfferBar /><TrialBadge /></div>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm cursor-pointer"
            style={{background:'#0284c7'}}>
            {principal.slice(0,2).toUpperCase()}
          </div>
        </div>

        <div className="p-8">
          {/* AI Insights — matches product mock; cyan brand #0284c7 */}
          <div className="mb-7">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <h3 className="font-bold text-lg flex items-center gap-2" style={{ fontFamily: 'Syne,sans-serif', color: '#0f172a' }}>
                <span style={{ color: '#0284c7' }}>✦</span> AI Insights
              </h3>
              <button
                type="button"
                onClick={() => setAskOpen((v) => !v)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border bg-white hover:bg-sky-50 transition"
                style={{ borderColor: '#bae6fd', color: '#0369a1' }}
              >
                ✦ Ask AI
              </button>
            </div>

            <div
              className="rounded-2xl px-6 py-5 mb-4 text-white relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg,#0369a1 0%,#0284c7 45%,#0ea5e9 100%)' }}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                    style={{ background: 'rgba(255,255,255,0.2)' }}>✦</div>
                  <div>
                    <div className="font-bold text-xl" style={{ fontFamily: 'Syne,sans-serif' }}>AI Insights</div>
                    <div className="text-sm opacity-90">Smart analysis. Better decisions. Stronger outcomes.</div>
                  </div>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.25)' }}>
                  {aiMeta.locked ? 'Standard+' : 'AI'}
                </span>
              </div>
              {aiMeta.quota && (
                <div className="text-xs mt-3 opacity-90">
                  Daily AI: {aiMeta.quota.used ?? aiMeta.quota.ai?.used ?? 0}/
                  {aiMeta.quota.limit ?? aiMeta.quota.ai?.limit ?? '—'}
                  {aiMeta.quota.search != null && (
                    <span> · Search: {aiMeta.quota.search.used}/{aiMeta.quota.search.limit}</span>
                  )}
                  {aiMeta.quota.ai && aiMeta.quota.used == null && (
                    <span> · Daily AI: {aiMeta.quota.ai.used}/{aiMeta.quota.ai.limit}</span>
                  )}
                </div>
              )}
            </div>

            {aiMeta.locked && (
              <div className="mb-4 px-4 py-3 rounded-xl text-sm border"
                style={{ background: '#f0f9ff', borderColor: '#bae6fd', color: '#0c4a6e' }}>
                {aiMeta.error || 'AI Insights is on Standard and Premium plans.'}
                <button type="button" className="ml-2 font-bold underline" onClick={() => navigate('/subscription')}>
                  View plans
                </button>
              </div>
            )}

            {aiMeta.error && !aiMeta.locked && (
              <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#b91c1c' }}>
                {aiMeta.error}
                <button type="button" className="ml-2 underline font-semibold" onClick={() => fetchInsights(true)}>Retry</button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
              {(aiMeta.loading ? [1, 2, 3] : (aiCards.length ? aiCards : [null, null, null])).map((c, i) => (
                <div key={c?.id || i} className="bg-white rounded-2xl border p-5 shadow-sm"
                  style={{ borderColor: '#e2e8f0' }}>
                  {aiMeta.loading ? (
                    <div className="animate-pulse h-24 rounded-xl bg-slate-100" />
                  ) : c ? (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{c.type === 'fees' ? '💵' : c.type === 'exams' ? '📚' : '📅'}</span>
                        <span className="font-bold text-slate-800">{c.title}</span>
                        {c.badge && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: '#e0f2fe', color: '#0369a1' }}>{c.badge}</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mb-4 leading-relaxed">{c.body}</p>
                      <button
                        type="button"
                        onClick={() => c.href && navigate(c.href)}
                        className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
                        style={{ background: '#0284c7' }}
                      >
                        {c.cta || 'Open'} →
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-slate-400">No insight yet. Add school data or refresh.</p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end mb-4">
              <button
                type="button"
                disabled={aiMeta.loading || aiMeta.locked}
                onClick={() => fetchInsights(true)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border"
                style={{ borderColor: '#e2e8f0', color: '#64748b' }}
              >
                Refresh insights
              </button>
            </div>

            {askOpen && (
              <div className="mb-6 p-5 rounded-2xl border bg-white" style={{ borderColor: '#bae6fd' }}>
                <div className="font-bold text-sm mb-2" style={{ color: '#0369a1' }}>Ask AI (Premium · suggestion only)</div>
                <textarea
                  value={askQ}
                  onChange={(e) => setAskQ(e.target.value)}
                  rows={2}
                  placeholder="e.g. Which class needs attendance follow-up this week?"
                  className="w-full px-3 py-2 rounded-xl border text-sm mb-2 outline-none"
                  style={{ borderColor: '#e2e8f0' }}
                />
                <div className="flex gap-2 items-center">
                  <button
                    type="button"
                    disabled={askBusy}
                    onClick={handleAskAi}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
                    style={{ background: askBusy ? '#7dd3fc' : '#0284c7' }}
                  >
                    {askBusy ? 'Thinking…' : 'Get suggestion'}
                  </button>
                  <span className="text-xs text-slate-500">AI does not send messages or change data automatically.</span>
                </div>
                {askA && (
                  <div className="mt-3 p-3 rounded-xl text-sm" style={{ background: '#f0f9ff', color: '#0c4a6e' }}>
                    {askA}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-5 mb-7">
            {statCards.map((s,i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border"
                style={{borderColor:'#e2e8f0', boxShadow:'0 4px 24px rgba(79,70,229,0.08)'}}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-bold text-3xl" style={{fontFamily:'Syne,sans-serif'}}>
                      {loading ? '...' : s.num}
                    </div>
                    <div className="text-sm mt-1" style={{color:'#475569'}}>{s.label}</div>
                  </div>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                    style={{background:s.color}}>{s.icon}</div>
                </div>
                <div className="text-xs font-semibold" style={{color:'#10b981'}}>
                  {loading ? '...' : s.change}
                </div>
              </div>
            ))}
          </div>

          {vService.length > 0 && (
            <div className="bg-white rounded-2xl border mb-7 p-6" style={{ borderColor: '#e2e8f0' }}>
              <h3 className="font-bold text-base mb-3">V-Service · From Synapse</h3>
              <div className="flex flex-col gap-3">
                {vService.map((m) => (
                  <div key={m._id} className="rounded-xl px-4 py-3 text-sm" style={{ background: '#e0f2fe', border: '1px solid #bae6fd' }}>
                    <div className="font-semibold text-sky-900">{m.title}</div>
                    <div className="text-slate-600 mt-1 whitespace-pre-wrap">{m.body}</div>
                    <div className="text-xs text-slate-400 mt-2">{m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Grid */}
          <div className="grid gap-5" style={{gridTemplateColumns:'1.5fr 1fr'}}>
            <div className="bg-white rounded-2xl border" style={{borderColor:'#e2e8f0'}}>
              <div className="flex items-center justify-between px-6 py-5"
                style={{borderBottom:'1px solid #e2e8f0'}}>
                <h3 className="font-bold text-base">Recently Added Students</h3>
                <span className="text-xs" style={{color:'#94a3b8'}}>Last 5 students</span>
              </div>
              {loading ? (
                <div className="text-center py-10 text-slate-400">Loading...</div>
              ) : activity.length === 0 ? (
                <div className="text-center py-10 text-slate-400">No students yet!</div>
              ) : (
                activity.map((s,i) => (
                  <div key={s._id} className="flex items-center gap-4 px-6 py-4"
                    style={{borderBottom: i < activity.length-1 ? '1px solid #f1f5f9' : 'none'}}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{background: colors[i % colors.length]}}>
                      {s.name.split(' ').map(x=>x[0]).join('').slice(0,2)}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{s.name}</div>
                      <div className="text-xs" style={{color:'#94a3b8'}}>{s.grade} · {s.email}</div>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 rounded-full"
                      style={statusStyle(s.status)}>
                      {s.status}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="bg-white rounded-2xl border" style={{borderColor:'#e2e8f0'}}>
              <div className="px-6 py-5" style={{borderBottom:'1px solid #e2e8f0'}}>
                <h3 className="font-bold text-base">Attendance Overview</h3>
              </div>
              <div className="flex flex-col items-center p-6">
                <div className="relative flex items-center justify-center mb-6"
                  style={{width:'140px', height:'140px'}}>
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3"/>
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" strokeWidth="3"
                      strokeDasharray={`${stats.attendanceRate} ${100-stats.attendanceRate}`}
                      strokeLinecap="round"/>
                  </svg>
                  <div className="absolute font-bold text-2xl" style={{fontFamily:'Syne,sans-serif'}}>
                    {loading ? '...' : `${stats.attendanceRate}%`}
                  </div>
                </div>
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{background:'#10b981'}}></div>
                    <span>Present — {stats.present}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{background:'#ef4444'}}></div>
                    <span>Absent — {stats.absent}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{background:'#f59e0b'}}></div>
                    <span>On Leave — {stats.onLeave}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{background:'#94a3b8'}}></div>
                    <span>Total Students — {stats.students}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}