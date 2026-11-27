import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'
import API_BASE_URL from '../config/api'
import PageLayout from '../components/PageLayout'

const tabs = ['pending', 'sent', 'rejected', 'failed', 'all']

const TYPE_TABS = [
  { key: 'all', label: 'All types' },
  { key: 'fee_reminder', label: 'Fee reminders' },
  { key: 'absence_today', label: 'Absences' },
  { key: 'weekly_summary', label: 'Weekly reports' },
  { key: 'monthly_attendance', label: 'Monthly reports' },
  { key: 'teacher_message', label: 'Teacher messages' },
  { key: 'event_notice', label: 'Events' },
  { key: 'result_card', label: 'Results' },
]

export default function AIActions() {
  const [status, setStatus] = useState('pending')
  const [typeFilter, setTypeFilter] = useState('all')
  const [actions, setActions] = useState([])
  const [usage, setUsage] = useState(null)
  const [settings, setSettings] = useState({})
  const [templates, setTemplates] = useState({ absence: '', fee: '', monthly: '' })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [editId, setEditId] = useState(null)
  const [editBody, setEditBody] = useState('')
  const [selected, setSelected] = useState({})
  const [searchParams] = useSearchParams()
  const focus = searchParams.get('focus') || ''
  const [teachers, setTeachers] = useState([])
  const [teacherDraftId, setTeacherDraftId] = useState('')
  const [teacherDraftText, setTeacherDraftText] = useState('')
  const [classes, setClasses] = useState([])
  const [resultClassId, setResultClassId] = useState('')
  const [resultRoll, setResultRoll] = useState('')
  const [resultTeacherId, setResultTeacherId] = useState('')
  const [resultBusy, setResultBusy] = useState(false)
  const [resultMsg, setResultMsg] = useState('')
  const focusHint =
    focus === 'fee'
      ? 'Opened from Insights: Generate (templates) for fee reminders, then Approve & send.'
      : focus === 'absence'
        ? 'Opened from Insights: Generate (templates) for today absences, then Approve & send.'
        : ''
  const h = () => ({ Authorization: `Bearer ${localStorage.getItem('authToken')}` })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_BASE_URL}/ai/actions`, { params: { status }, headers: h() })
      setActions(res.data.actions || [])
      setUsage(res.data.usage || null)
      setSettings(res.data.settings || {})
      if (res.data.templates) setTemplates({
        absence: res.data.templates.absence || '',
        fee: res.data.templates.fee || '',
        monthly: res.data.templates.monthly || '',
      })
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (focus === 'event' || focus === 'teacher') {
      setTypeFilter(focus === 'teacher' ? 'teacher_message' : 'event_notice')
      setStatus('pending')
    } else if (focus === 'fee') setTypeFilter('fee_reminder')
    else if (focus === 'absence') setTypeFilter('absence_today')
  }, [focus])
  useEffect(() => {
    const sid = localStorage.getItem('schoolId')
    if (!sid) return
    axios.get(`${API_BASE_URL}/teachers/${sid}`).then((r) => {
      setTeachers(Array.isArray(r.data) ? r.data : r.data?.teachers || [])
    }).catch(() => setTeachers([]))
    axios.get(`${API_BASE_URL}/classes/${sid}`).then((r) => {
      setClasses(Array.isArray(r.data) ? r.data : r.data?.classes || [])
    }).catch(() => setClasses([]))
  }, [])

  const sendResultToParentByRoll = async () => {
    const schoolId = localStorage.getItem('schoolId')
    if (!schoolId) return
    if (!resultRoll.trim() && !resultClassId) {
      setResultMsg('Enter a roll number, or select a class / All classes.')
      return
    }
    setResultBusy(true)
    setResultMsg('')
    try {
      const rolls = []
      if (resultRoll.trim()) {
        rolls.push(resultRoll.trim())
      } else if (resultClassId === 'all') {
        const { data } = await axios.get(`${API_BASE_URL}/students/${schoolId}`)
        const list = Array.isArray(data) ? data : data?.students || []
        list.forEach((s) => { if (s.rollNumber) rolls.push(String(s.rollNumber)) })
      } else if (resultClassId) {
        const { data } = await axios.get(`${API_BASE_URL}/students/${schoolId}`)
        const list = Array.isArray(data) ? data : data?.students || []
        list.filter((s) => String(s.classSectionId?._id || s.classSectionId) === resultClassId)
          .forEach((s) => { if (s.rollNumber) rolls.push(String(s.rollNumber)) })
      }
      if (!rolls.length) {
        setResultMsg('No students found for this selection.')
        setResultBusy(false)
        return
      }
      const { data: contactsRes } = await axios.get(`${API_BASE_URL}/community/contacts`, { params: { type: 'parent' } })
      const contacts = Array.isArray(contactsRes) ? contactsRes : (contactsRes?.contacts || [])
      let sent = 0
      let failed = 0
      for (const roll of rolls) {
        try {
          const { data } = await axios.get(`${API_BASE_URL}/exams/${schoolId}/student-report`, { params: { rollNumber: roll } })
          const st = data.student || {}
          const name = st.name || 'student'
          const className = st.className || ''
          const subs = data.subjects || []
          const subjectLines = subs.length
            ? subs.map((s) => `• ${s.subject || 'Subject'}: ${s.obtainedMarks ?? 0}/${s.maximumMarks ?? 100}`)
            : ['• No subject marks found yet.']
          const obtained = subs.reduce((a, s) => a + (Number(s.obtainedMarks) || 0), 0)
          const total = subs.reduce((a, s) => a + (Number(s.maximumMarks) || 0), 0)
          const pct = total > 0 ? ((obtained / total) * 100).toFixed(2) : '0.00'
          const teacherName = teachers.find((t) => t._id === resultTeacherId)?.name
          const lines = [
            'Assalam o alaikum dear parents,',
            '',
            `Result card for ${name} (Roll ${roll}).`,
            className ? `Class: ${className}` : '',
            data.subjects?.[0]?.examName ? `Exam: ${data.subjects[0].examName}` : '',
            data.attendance?.rate != null ? `Attendance: ${data.attendance.rate}%` : '',
            teacherName ? `Class teacher: ${teacherName}` : '',
            '',
            'Marks:',
            ...subjectLines,
            '',
            `Total: ${obtained}/${total} · ${pct}%`,
            '',
            '— School Admin (Synapse EduCore)',
          ].filter(Boolean).join('\n')

          const nameToken = name.toLowerCase().split(/\s+/).filter(Boolean)[0] || ''
          const match = contacts.find((c) => {
            const cName = (c.name || '').toLowerCase()
            const preview = (c.lastMessagePreview || '').toLowerCase()
            if (st._id && (String(c.studentId || '') === String(st._id) || String(c.linkedStudentId || '') === String(st._id))) return true
            if (nameToken && nameToken.length > 2 && (cName.includes(nameToken) || preview.includes(nameToken))) return true
            if (roll && (cName.includes(roll) || preview.includes(roll))) return true
            return false
          })
          if (!match) { failed += 1; continue }
          const openRes = await axios.post(`${API_BASE_URL}/community/conversations/open`, {
            participantType: match.participantType || 'parent',
            participantId: match.participantId,
          })
          const conversationId = openRes.data?.conversation?._id || openRes.data?.conversationId
          if (!conversationId) { failed += 1; continue }
          await axios.post(`${API_BASE_URL}/community/conversations/${conversationId}/messages`, { text: lines })
          sent += 1
        } catch {
          failed += 1
        }
      }
      setResultMsg(`Results sent: ${sent}. Failed / no parent match: ${failed}. (Text only — PDF after R2.)`)
      setTypeFilter('result_card')
      setStatus('all')
    } catch (err) {
      setResultMsg(err.response?.data?.error || 'Result send failed')
    } finally {
      setResultBusy(false)
    }
  }

  const generateFees = async (useAi = false) => {
    setBusy(true); setMsg('')
    try {
      const res = await axios.post(`${API_BASE_URL}/ai/actions/generate`, { types: ['fee_reminder'], useAi }, { headers: h() })
      setMsg(`Fee drafts created: ${res.data.created}. Skipped ${res.data.skipped || 0} (no parent linked).`)
      setTypeFilter('fee_reminder'); setStatus('pending'); setSelected({}); await load()
    } catch (err) { setMsg(err.response?.data?.error || 'Fee generate failed') }
    finally { setBusy(false) }
  }

  const generateAbsences = async (useAi = false) => {
    setBusy(true); setMsg('')
    try {
      const res = await axios.post(`${API_BASE_URL}/ai/actions/generate`, { types: ['absence_today'], useAi }, { headers: h() })
      setMsg(`Absence drafts created: ${res.data.created}. Skipped ${res.data.skipped || 0} (no parent linked).`)
      setTypeFilter('absence_today'); setStatus('pending'); setSelected({}); await load()
    } catch (err) { setMsg(err.response?.data?.error || 'Absence generate failed') }
    finally { setBusy(false) }
  }

  const monthly = async () => {
    setBusy(true); setMsg('')
    try {
      const res = await axios.post(`${API_BASE_URL}/ai/actions/monthly`, {}, { headers: h() })
      const n = res.data.created ?? 0
      setMsg(n ? `Monthly attendance drafts: ${n} (open Monthly reports tab)` : (res.data.message || 'No monthly drafts — need students with attendance + linked parents.'))
      setTypeFilter('monthly_attendance'); setStatus('pending'); setSelected({}); await load()
    } catch (err) { setMsg(err.response?.data?.error || 'Monthly failed') }
    finally { setBusy(false) }
  }

  const weekly = async () => {
    setBusy(true); setMsg('')
    try {
      const res = await axios.post(`${API_BASE_URL}/ai/actions/weekly`, {}, { headers: h() })
      const n = res.data.created ?? 0
      setMsg(n ? `Weekly summary drafts: ${n} (open Weekly reports tab)` : (res.data.message || 'No weekly drafts — need absences in last 7 days + linked parents.'))
      setTypeFilter('weekly_summary'); setStatus('pending'); setSelected({}); await load()
    } catch (err) { setMsg(err.response?.data?.error || 'Weekly failed') }
    finally { setBusy(false) }
  }

  const approve = async (id) => {
    setBusy(true)
    try {
      const body = {}
      const cls = eventClassById[id]
      if (cls) body.classSectionId = cls
      const res = await axios.post(`${API_BASE_URL}/ai/actions/${id}/approve`, body, { headers: h() })
      setMsg(res.data?.message || 'Sent via SE Community'); await load()
    } catch (err) { setMsg(err.response?.data?.error || 'Approve failed') }
    finally { setBusy(false) }
  }

  const reject = async (id) => {
    setBusy(true)
    try { await axios.post(`${API_BASE_URL}/ai/actions/${id}/reject`, {}, { headers: h() }); await load() }
    catch (err) { setMsg(err.response?.data?.error || 'Reject failed') }
    finally { setBusy(false) }
  }

  const saveEdit = async (id) => {
    setBusy(true)
    try {
      await axios.patch(`${API_BASE_URL}/ai/actions/${id}`, { body: editBody }, { headers: h() })
      setEditId(null); await load()
    } catch (err) { setMsg(err.response?.data?.error || 'Save failed') }
    finally { setBusy(false) }
  }

  const visibleActions = actions.filter((a) => typeFilter === 'all' || a.type === typeFilter)
  const pendingIds = () => visibleActions.filter((a) => a.status === 'pending').map((a) => a._id)
  const selectAllPending = () => {
    const next = { ...selected }
    pendingIds().forEach((id) => { next[id] = true })
    setSelected(next)
  }
  const clearSelection = () => setSelected({})

  const bulkApprove = async () => {
    const ids = Object.keys(selected).filter((k) => selected[k])
    if (!ids.length) return
    setBusy(true)
    try {
      const res = await axios.post(`${API_BASE_URL}/ai/actions/approve-bulk`, { ids }, { headers: h() })
      setMsg(`Sent ${res.data.sent}, failed ${res.data.failed}`); setSelected({}); await load()
    } catch (err) { setMsg(err.response?.data?.error || 'Bulk failed') }
    finally { setBusy(false) }
  }


  const draftTeacher = async () => {
    if (!teacherDraftId) { setMsg('Select a teacher'); return }
    setBusy(true)
    try {
      const res = await axios.post(`${API_BASE_URL}/ai/ask/action`, {
        action: 'draft_teacher_message',
        teacherId: teacherDraftId,
        text: teacherDraftText || undefined,
      }, { headers: h() })
      setMsg(res.data.message || 'Teacher draft created')
      setStatus('pending')
      await load()
    } catch (err) {
      setMsg(err.response?.data?.error || 'Teacher draft failed')
    } finally {
      setBusy(false)
    }
  }

  const saveTemplates = async () => {
    setBusy(true)
    try {
      const res = await axios.patch(`${API_BASE_URL}/ai/actions/templates`, templates, { headers: h() })
      setTemplates({
        absence: res.data.templates?.absence || '',
        fee: res.data.templates?.fee || '',
        monthly: res.data.templates?.monthly || '',
      })
      setMsg('School message templates saved — next Generate will use them.')
    } catch (err) {
      setMsg(err.response?.data?.error || 'Template save failed')
    } finally {
      setBusy(false)
    }
  }

  const saveSettings = async (patch) => {
    try {
      const res = await axios.patch(`${API_BASE_URL}/ai/actions/settings`, patch, { headers: h() })
      setSettings(res.data.settings || {})
      if (res.data.templates) setTemplates({
        absence: res.data.templates.absence || '',
        fee: res.data.templates.fee || '',
        monthly: res.data.templates.monthly || '',
      }); setMsg('Settings saved')
    } catch (err) { setMsg(err.response?.data?.error || 'Settings failed') }
  }

  const typeLabel = (t) => ({ fee_reminder: 'Fee', absence_today: 'Absence', weekly_summary: 'Weekly', monthly_attendance: 'Monthly', teacher_message: 'Teacher', event_notice: 'Event' }[t] || t)

  return (
    <PageLayout title="AI Actions">
      <div className="max-w-6xl mx-auto">
        <p className="text-sm mb-4" style={{ color: '#64748b' }}>
          Drafts from attendance and fees stay <strong>Pending</strong> until you approve them. Approved items are sent through SE Community chat. Scheduled jobs only create drafts — they never auto-send to parents.
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          <button type="button" disabled={busy} onClick={() => generateFees(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: '#0284c7' }}>Generate fee drafts</button>
          <button type="button" disabled={busy} onClick={() => generateAbsences(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: '#0ea5e9' }}>Generate absence drafts</button>
          <button type="button" disabled={busy} onClick={weekly} className="px-4 py-2 rounded-xl text-sm font-bold" style={{ background: '#f1f5f9' }}>Weekly summaries</button>
          <button type="button" disabled={busy} onClick={monthly} className="px-4 py-2 rounded-xl text-sm font-bold" style={{ background: '#f1f5f9' }}>Monthly attendance reports</button>
        </div>
        {usage && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="rounded-xl p-3 bg-white border text-sm"><div className="text-xs text-slate-500">Generates today</div><div className="font-bold">{usage.generates}/{usage.generateLimit}</div></div>
            <div className="rounded-xl p-3 bg-white border text-sm"><div className="text-xs text-slate-500">Token budget (est.)</div><div className="font-bold">{usage.tokensUsed}/{usage.tokenBudget}</div></div>
            <div className="rounded-xl p-3 bg-white border md:col-span-2 text-sm space-y-2">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={!!settings.autoApproveTemplates} onChange={(e) => saveSettings({ autoApproveTemplates: e.target.checked })} /> Auto-approve templates only (no AI)</label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={!!settings.dailyAbsenceEnabled} onChange={(e) => saveSettings({ dailyAbsenceEnabled: e.target.checked })} /> Daily absence drafts enabled (schedule hour)</label>
              <div className="flex items-center gap-2 text-xs">Hour (0–23): <input type="number" min={0} max={23} value={settings.dailyAbsenceHour ?? 9} onChange={(e) => saveSettings({ dailyAbsenceHour: Number(e.target.value) })} className="w-16 border rounded px-1" /></div>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={!!settings.monthlyReportEnabled} onChange={(e) => saveSettings({ monthlyReportEnabled: e.target.checked })} /> Monthly attendance reports enabled</label>
              <div className="flex flex-wrap gap-2 text-xs">Day of month: <input type="number" min={1} max={28} value={settings.monthlyReportDay ?? 1} onChange={(e) => saveSettings({ monthlyReportDay: Number(e.target.value) })} className="w-16 border rounded px-1" /> Hour: <input type="number" min={0} max={23} value={settings.monthlyReportHour ?? 10} onChange={(e) => saveSettings({ monthlyReportHour: Number(e.target.value) })} className="w-16 border rounded px-1" /></div>
            </div>
          </div>
        )}
        {focusHint && <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: '#ecfdf5', color: '#065f46' }}>{focusHint}</div>}

        <div className="bg-white rounded-2xl border p-4 mb-4" style={{ borderColor: '#e2e8f0' }}>
          <h2 className="font-bold text-sm mb-2">Teacher message draft</h2>
          <div className="flex flex-wrap gap-2 items-start">
            <select value={teacherDraftId} onChange={(e) => setTeacherDraftId(e.target.value)} className="text-sm px-2 py-2 rounded-xl border min-w-[200px]" style={{ borderColor: '#e2e8f0' }}>
              <option value="">Select teacher…</option>
              {teachers.map((t) => (
                <option key={t._id} value={t._id}>{t.name || 'Teacher'}{t.phone ? ` (${t.phone})` : ''}</option>
              ))}
            </select>
            <textarea value={teacherDraftText} onChange={(e) => setTeacherDraftText(e.target.value)} rows={2} placeholder="Message text (optional)" className="flex-1 min-w-[200px] text-sm p-2 rounded-xl border" style={{ borderColor: '#e2e8f0' }} />
            <button type="button" disabled={busy || !teacherDraftId} onClick={draftTeacher} className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: '#059669' }}>Draft for teacher</button>
          </div>
          <p className="text-xs mt-2 text-slate-500">Pending → Approve &amp; send → that teacher&apos;s SE Community chat.</p>
        </div>

        <div className="bg-white rounded-2xl border p-4 mb-4" style={{ borderColor: '#e2e8f0' }}>
          <h2 className="font-bold text-sm mb-2">Results → send to parents (SE)</h2>
          <p className="text-xs text-slate-500 mb-3">Load by roll, or select a class / All classes. Principal signature is from Settings; pick class teacher optionally. Text auto-send for now (PDF after Cloudflare R2).</p>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              value={resultRoll}
              onChange={(e) => setResultRoll(e.target.value)}
              placeholder="Roll number (optional)"
              className="text-sm px-3 py-2 rounded-xl border min-w-[140px]"
              style={{ borderColor: '#e2e8f0' }}
            />
            <select value={resultClassId} onChange={(e) => setResultClassId(e.target.value)} className="text-sm px-2 py-2 rounded-xl border min-w-[180px]" style={{ borderColor: '#e2e8f0' }}>
              <option value="">Select class…</option>
              <option value="all">All classes</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>{c.name || 'Class'}</option>
              ))}
            </select>
            <select value={resultTeacherId} onChange={(e) => setResultTeacherId(e.target.value)} className="text-sm px-2 py-2 rounded-xl border min-w-[180px]" style={{ borderColor: '#e2e8f0' }}>
              <option value="">Class teacher (optional)</option>
              {teachers.map((t) => (
                <option key={t._id} value={t._id}>{t.name || 'Teacher'}</option>
              ))}
            </select>
            <button type="button" disabled={resultBusy} onClick={sendResultToParentByRoll} className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: '#0284c7' }}>
              {resultBusy ? 'Sending…' : 'Auto-send result text'}
            </button>
          </div>
          {resultMsg && <p className="text-xs mt-2 font-semibold" style={{ color: '#0c4a6e' }}>{resultMsg}</p>}
        </div>

        {msg && <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: '#f0f9ff', color: '#0c4a6e' }}>{msg}</div>}
        <div className="flex flex-wrap gap-2 mb-3">
          {TYPE_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => { setTypeFilter(t.key); setSelected({}) }}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold"
              style={{
                background: typeFilter === t.key ? '#0f172a' : '#fff',
                color: typeFilter === t.key ? '#fff' : '#475569',
                border: '1px solid #e2e8f0',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {tabs.map((t) => (
            <button key={t} type="button" onClick={() => setStatus(t)} className="px-3 py-1.5 rounded-lg text-sm font-semibold capitalize" style={{ background: status === t ? '#0284c7' : '#fff', color: status === t ? '#fff' : '#475569', border: '1px solid #e2e8f0' }}>{t}</button>
          ))}
          {status === 'pending' && (
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button type="button" onClick={selectAllPending} className="px-3 py-1.5 rounded-lg text-sm font-semibold" style={{ background: '#f1f5f9', color: '#334155' }}>
                Select all
              </button>
              <button type="button" onClick={clearSelection} className="px-3 py-1.5 rounded-lg text-sm font-semibold" style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}>
                Clear
              </button>
              <button type="button" disabled={busy} onClick={bulkApprove} className="px-3 py-1.5 rounded-lg text-sm font-bold text-white" style={{ background: '#059669' }}>
                Approve selected
              </button>
            </div>
          )}
        </div>
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
          {loading ? <div className="p-8 text-center text-slate-500">Loading…</div>
            : visibleActions.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                {actions.length === 0
                  ? 'No drafts yet. Use the buttons above: Fee, Absence, Weekly, or Monthly.'
                  : `No ${TYPE_TABS.find((x) => x.key === typeFilter)?.label || 'items'} in this filter. Switch type tab or generate that report.`}
              </div>
            ) : (
              <ul className="divide-y">
                {visibleActions.map((a) => (
                  <li key={a._id} className="p-4 flex flex-wrap gap-3">
                    {a.status === 'pending' && <input type="checkbox" className="mt-1" checked={!!selected[a._id]} onChange={(e) => setSelected({ ...selected, [a._id]: e.target.checked })} />}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold mb-1"><span className="px-2 py-0.5 rounded-full mr-2" style={{ background: '#e0f2fe', color: '#0369a1' }}>{typeLabel(a.type)}</span>{a.status}</div>
                      <div className="text-sm font-semibold">{a.type === 'teacher_message' ? (a.teacherName || 'Teacher') : a.type === 'event_notice' ? (a.studentName || 'Event / announcement') : (a.studentName || '—')}{a.grade ? ` · Class ${a.grade}` : ''}{a.type === 'teacher_message' ? '' : (a.parentName ? ` → ${a.parentName}` : (a.type === 'event_notice' ? '' : ' → No parent'))}{a.parentPhone ? ` (${a.parentPhone})` : ''}</div>
                      {editId === a._id ? <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={3} className="w-full mt-2 p-2 rounded-xl border text-sm" /> : <p className="text-sm mt-1 whitespace-pre-wrap" style={{ color: '#334155' }}>{a.body}</p>}
                      {a.error && <p className="text-xs text-red-600 mt-1">{a.error}</p>}
                      {a.type === 'event_notice' && a.status === 'pending' && (
                        <div className="mt-2">
                          <label className="text-xs text-slate-500 block mb-1">Send event to parents of:</label>
                          <select
                            className="w-full max-w-xs px-3 py-2 rounded-xl border text-sm"
                            value={eventClassById[a._id] || ''}
                            onChange={(e) => setEventClassById((m) => ({ ...m, [a._id]: e.target.value }))}
                          >
                            <option value="">Entire school (all parents with linked students)</option>
                            {classes.map((c) => (
                              <option key={c._id} value={c._id}>{c.name || c.grade || c._id}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                    {a.status === 'pending' && (
                      <div className="flex flex-col gap-2">
                        {editId === a._id ? <button type="button" onClick={() => saveEdit(a._id)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: '#0284c7' }}>Save</button>
                          : <button type="button" onClick={() => { setEditId(a._id); setEditBody(a.body) }} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: '#f1f5f9' }}>Edit</button>}
                        <button type="button" disabled={busy} onClick={() => approve(a._id)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: '#059669' }}>Approve & send</button>
                        <button type="button" disabled={busy} onClick={() => reject(a._id)} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: '#fef2f2', color: '#b91c1c' }}>Reject</button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
        </div>
      </div>
    </PageLayout>
  )
}
