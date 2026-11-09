import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import API_BASE_URL from '../config/api'
import PageLayout from '../components/PageLayout'

const tabs = ['pending', 'sent', 'rejected', 'failed', 'all']

export default function AIActions() {
  const [status, setStatus] = useState('pending')
  const [actions, setActions] = useState([])
  const [usage, setUsage] = useState(null)
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [editId, setEditId] = useState(null)
  const [editBody, setEditBody] = useState('')
  const [selected, setSelected] = useState({})
  const h = () => ({ Authorization: `Bearer ${localStorage.getItem('authToken')}` })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_BASE_URL}/ai/actions`, { params: { status }, headers: h() })
      setActions(res.data.actions || [])
      setUsage(res.data.usage || null)
      setSettings(res.data.settings || {})
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => { load() }, [load])

  const generate = async (useAi) => {
    setBusy(true); setMsg('')
    try {
      const res = await axios.post(`${API_BASE_URL}/ai/actions/generate`, { types: ['absence_today', 'fee_reminder'], useAi }, { headers: h() })
      setMsg(`Created ${res.data.created}. Skipped ${res.data.skipped} (no parent).`)
      setStatus('pending'); await load()
    } catch (err) { setMsg(err.response?.data?.error || 'Generate failed') }
    finally { setBusy(false) }
  }

  const monthly = async () => {
    setBusy(true); setMsg('')
    try {
      const res = await axios.post(`${API_BASE_URL}/ai/actions/monthly`, {}, { headers: h() })
      setMsg(res.data.message || `Monthly drafts: ${res.data.created}`)
      setStatus('pending'); await load()
    } catch (err) { setMsg(err.response?.data?.error || 'Monthly failed') }
    finally { setBusy(false) }
  }

  const weekly = async () => {
    setBusy(true); setMsg('')
    try {
      const res = await axios.post(`${API_BASE_URL}/ai/actions/weekly`, {}, { headers: h() })
      setMsg(res.data.message || `Weekly: ${res.data.created}`)
      setStatus('pending'); await load()
    } catch (err) { setMsg(err.response?.data?.error || 'Weekly failed') }
    finally { setBusy(false) }
  }

  const approve = async (id) => {
    setBusy(true)
    try {
      await axios.post(`${API_BASE_URL}/ai/actions/${id}/approve`, {}, { headers: h() })
      setMsg('Sent via SE Community'); await load()
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

  const saveSettings = async (patch) => {
    try {
      const res = await axios.patch(`${API_BASE_URL}/ai/actions/settings`, patch, { headers: h() })
      setSettings(res.data.settings || {}); setMsg('Settings saved')
    } catch (err) { setMsg(err.response?.data?.error || 'Settings failed') }
  }

  const typeLabel = (t) => ({ fee_reminder: 'Fee', absence_today: 'Absence', weekly_summary: 'Weekly', monthly_attendance: 'Monthly' }[t] || t)

  return (
    <PageLayout title="AI Actions">
      <div className="max-w-6xl mx-auto">
        <p className="text-sm mb-4" style={{ color: '#64748b' }}>
          Drafts from attendance & fees stay <strong>Pending</strong> until you Approve → then SE Community send. Scheduled runs (when cron is on) also create Pending only — not silent auto-send to parents.
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          <button type="button" disabled={busy} onClick={() => generate(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: '#0284c7' }}>Generate (templates)</button>
          <button type="button" disabled={busy} onClick={() => generate(true)} className="px-4 py-2 rounded-xl text-sm font-bold" style={{ background: '#e0f2fe', color: '#0369a1' }}>Generate + AI polish</button>
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
        {msg && <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: '#f0f9ff', color: '#0c4a6e' }}>{msg}</div>}
        <div className="flex flex-wrap gap-2 mb-4">
          {tabs.map((t) => (
            <button key={t} type="button" onClick={() => setStatus(t)} className="px-3 py-1.5 rounded-lg text-sm font-semibold capitalize" style={{ background: status === t ? '#0284c7' : '#fff', color: status === t ? '#fff' : '#475569', border: '1px solid #e2e8f0' }}>{t}</button>
          ))}
          {status === 'pending' && <button type="button" disabled={busy} onClick={bulkApprove} className="ml-auto px-3 py-1.5 rounded-lg text-sm font-bold text-white" style={{ background: '#059669' }}>Approve selected</button>}
        </div>
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
          {loading ? <div className="p-8 text-center text-slate-500">Loading…</div>
            : actions.length === 0 ? <div className="p-8 text-center text-slate-500">No drafts. Mark absences or pending fees, then Generate.</div>
            : (
              <ul className="divide-y">
                {actions.map((a) => (
                  <li key={a._id} className="p-4 flex flex-wrap gap-3">
                    {a.status === 'pending' && <input type="checkbox" className="mt-1" checked={!!selected[a._id]} onChange={(e) => setSelected({ ...selected, [a._id]: e.target.checked })} />}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold mb-1"><span className="px-2 py-0.5 rounded-full mr-2" style={{ background: '#e0f2fe', color: '#0369a1' }}>{typeLabel(a.type)}</span>{a.status}</div>
                      <div className="text-sm font-semibold">{a.studentName || '—'}{a.grade ? ` · Class ${a.grade}` : ''}{a.parentName ? ` → ${a.parentName}` : ' → No parent'}{a.parentPhone ? ` (${a.parentPhone})` : ''}</div>
                      {editId === a._id ? <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={3} className="w-full mt-2 p-2 rounded-xl border text-sm" /> : <p className="text-sm mt-1 whitespace-pre-wrap" style={{ color: '#334155' }}>{a.body}</p>}
                      {a.error && <p className="text-xs text-red-600 mt-1">{a.error}</p>}
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
