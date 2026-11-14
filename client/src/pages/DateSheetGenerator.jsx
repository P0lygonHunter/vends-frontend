import { useEffect, useMemo, useState } from 'react'
import Sidebar from '../components/Sidebar'
import { fetchSubscriptionLifecycle } from '../utils/subscriptionLock'

const SESSIONS = ['Morning', 'Evening']

function emptyRow() {
  return {
    id: Date.now() + Math.random(),
    date: '',
    day: '',
    session: 'Morning',
    subject: '',
    className: '',
    time: '',
    teacher: '',
    marks: '',
  }
}

export default function DateSheetGenerator() {
  const [readOnly, setReadOnly] = useState(false)
  const [meta, setMeta] = useState({
    schoolName: localStorage.getItem('schoolName') || 'Synapse EduCore School',
    examSeries: 'Midterm 2026',
    subtitle: 'Date Sheet',
  })
  const [rows, setRows] = useState([emptyRow()])
  const [checkTeacher, setCheckTeacher] = useState(true)
  const [checkClass, setCheckClass] = useState(true)

  useEffect(() => {
    fetchSubscriptionLifecycle().then((life) => {
      if (life.softLock || life.expired || life.pastGrace || life.blocked) setReadOnly(true)
    })
    try {
      const saved = localStorage.getItem('se_datesheet_draft')
      if (saved) {
        const p = JSON.parse(saved)
        if (p.meta) setMeta(p.meta)
        if (Array.isArray(p.rows) && p.rows.length) setRows(p.rows)
      }
    } catch (_) {}
  }, [])

  useEffect(() => {
    if (readOnly) return
    localStorage.setItem('se_datesheet_draft', JSON.stringify({ meta, rows }))
  }, [meta, rows, readOnly])

  const conflicts = useMemo(() => {
    const list = []
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        const a = rows[i]
        const b = rows[j]
        if (!a.date || !b.date) continue
        if (a.date !== b.date) continue
        if ((a.session || '') !== (b.session || '')) continue
        if (checkClass && a.className && b.className && a.className.trim().toLowerCase() === b.className.trim().toLowerCase()) {
          list.push({
            type: 'class',
            text: `Class clash: ${a.className} — ${a.subject || 'Paper'} & ${b.subject || 'Paper'} on ${a.date} (${a.session})`,
          })
        }
        if (checkTeacher && a.teacher && b.teacher && a.teacher.trim().toLowerCase() === b.teacher.trim().toLowerCase()) {
          list.push({
            type: 'teacher',
            text: `Teacher clash: ${a.teacher} — ${a.subject || 'A'} & ${b.subject || 'B'} on ${a.date} (${a.session})`,
          })
        }
      }
    }
    return list
  }, [rows, checkClass, checkTeacher])

  const updateRow = (id, field, value) => {
    if (readOnly) return
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        const next = { ...r, [field]: value }
        if (field === 'date' && value) {
          try {
            const d = new Date(value + 'T12:00:00')
            next.day = d.toLocaleDateString('en-GB', { weekday: 'long' })
          } catch (_) {}
        }
        return next
      })
    )
  }

  const addRow = () => {
    if (readOnly) return
    setRows((r) => [...r, emptyRow()])
  }

  const removeRow = (id) => {
    if (readOnly) return
    setRows((r) => (r.length <= 1 ? r : r.filter((x) => x.id !== id)))
  }

  const printSheet = () => window.print()

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.session).localeCompare(String(b.session)))
  }, [rows])

  return (
    <div className="flex min-h-screen" style={{ background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="no-print">
        <Sidebar />
      </div>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .sheet-print { box-shadow: none !important; border: none !important; max-width: 100% !important; margin: 0 !important; }
          .app-main { margin-left: 0 !important; }
        }
      `}</style>

      <div className="app-main" style={{ flex: 1, minWidth: 0, padding: '24px', boxSizing: 'border-box', overflowX: 'hidden', overflowY: 'auto' }}>
        <div className="no-print mb-6">
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Syne, sans-serif' }}>
            Date Sheet Generator
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Standard / Premium only. Build midterm or annual date sheets, check clashes, print PDF-style.
          </p>
          {readOnly && (
            <div className="mt-3 px-4 py-2 rounded-xl text-sm bg-amber-50 text-amber-900 border border-amber-200">
              Plan grace / expired — edit locked; you can still print a saved draft.
            </div>
          )}
        </div>

        <div className="no-print grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6 max-w-full">
          <div className="bg-white rounded-2xl border p-4" style={{ borderColor: '#e2e8f0' }}>
            <h2 className="font-bold text-sm mb-3">Configuration</h2>
            {['schoolName', 'examSeries', 'subtitle'].map((k) => (
              <label key={k} className="block text-xs font-semibold text-slate-500 mb-2">
                {k === 'schoolName' ? 'School name' : k === 'examSeries' ? 'Exam series' : 'Subtitle'}
                <input
                  disabled={readOnly}
                  value={meta[k]}
                  onChange={(e) => setMeta({ ...meta, [k]: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-xl border text-sm"
                  style={{ borderColor: '#e2e8f0' }}
                />
              </label>
            ))}
            <div className="flex flex-wrap gap-4 mt-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={checkClass} onChange={(e) => setCheckClass(e.target.checked)} />
                Class same-slot clash
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={checkTeacher} onChange={(e) => setCheckTeacher(e.target.checked)} />
                Teacher same-slot clash
              </label>
            </div>
          </div>

          <div className="bg-white rounded-2xl border p-4" style={{ borderColor: '#e2e8f0' }}>
            <h2 className="font-bold text-sm mb-2">Live conflicts</h2>
            <div className="flex gap-2 mb-3">
              <span className="px-3 py-1 rounded-lg text-sm font-bold bg-emerald-50 text-emerald-800">
                {Math.max(0, rows.length - conflicts.length)} ok rows
              </span>
              <span className="px-3 py-1 rounded-lg text-sm font-bold bg-rose-50 text-rose-800">
                {conflicts.length} clash(es)
              </span>
            </div>
            {conflicts.length === 0 ? (
              <p className="text-sm text-slate-500">No clashes detected with current toggles.</p>
            ) : (
              <ul className="space-y-2 max-h-40 overflow-y-auto">
                {conflicts.map((c, i) => (
                  <li key={i} className="text-xs p-2 rounded-lg bg-rose-50 text-rose-900 border border-rose-100">
                    {c.text}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2 mt-4">
              <button type="button" disabled={readOnly} onClick={addRow} className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: '#0284c7' }}>
                + Add exam entry
              </button>
              <button type="button" onClick={printSheet} className="px-4 py-2 rounded-xl text-sm font-bold border" style={{ borderColor: '#bae6fd', color: '#0369a1' }}>
                Print / PDF
              </button>
            </div>
          </div>
        </div>

        <div className="no-print bg-white rounded-2xl border p-4 mb-6 overflow-x-auto max-w-full" style={{ borderColor: '#e2e8f0' }}>
          <h2 className="font-bold text-sm mb-3">Exam entries</h2>
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b">
                <th className="py-2">Date</th>
                <th>Day</th>
                <th>Session</th>
                <th>Subject</th>
                <th>Class</th>
                <th>Time</th>
                <th>Teacher</th>
                <th>Marks</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="py-2 pr-1">
                    <input type="date" disabled={readOnly} value={r.date} onChange={(e) => updateRow(r.id, 'date', e.target.value)} className="border rounded-lg px-2 py-1 w-[140px]" />
                  </td>
                  <td className="pr-1">
                    <input disabled value={r.day} className="border rounded-lg px-2 py-1 w-[100px] bg-slate-50" />
                  </td>
                  <td className="pr-1">
                    <select disabled={readOnly} value={r.session} onChange={(e) => updateRow(r.id, 'session', e.target.value)} className="border rounded-lg px-2 py-1">
                      {SESSIONS.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="pr-1">
                    <input disabled={readOnly} value={r.subject} onChange={(e) => updateRow(r.id, 'subject', e.target.value)} placeholder="Physics" className="border rounded-lg px-2 py-1 w-[120px]" />
                  </td>
                  <td className="pr-1">
                    <input disabled={readOnly} value={r.className} onChange={(e) => updateRow(r.id, 'className', e.target.value)} placeholder="10-Blue" className="border rounded-lg px-2 py-1 w-[90px]" />
                  </td>
                  <td className="pr-1">
                    <input disabled={readOnly} value={r.time} onChange={(e) => updateRow(r.id, 'time', e.target.value)} placeholder="9:00 AM" className="border rounded-lg px-2 py-1 w-[90px]" />
                  </td>
                  <td className="pr-1">
                    <input disabled={readOnly} value={r.teacher} onChange={(e) => updateRow(r.id, 'teacher', e.target.value)} placeholder="Optional" className="border rounded-lg px-2 py-1 w-[100px]" />
                  </td>
                  <td className="pr-1">
                    <input disabled={readOnly} value={r.marks} onChange={(e) => updateRow(r.id, 'marks', e.target.value)} placeholder="100" className="border rounded-lg px-2 py-1 w-[60px]" />
                  </td>
                  <td>
                    <button type="button" disabled={readOnly} onClick={() => removeRow(r.id)} className="text-rose-600 text-xs font-bold">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Printable preview */}
        <div className="sheet-print bg-white rounded-2xl border p-6 max-w-4xl mx-auto" style={{ borderColor: '#e2e8f0' }}>
          <div className="text-center border-b-2 border-slate-800 pb-3 mb-4">
            <div className="text-lg font-bold tracking-wide">{meta.schoolName}</div>
            <div className="text-base font-semibold mt-1">{meta.examSeries}</div>
            <div className="text-sm text-slate-600">{meta.subtitle}</div>
          </div>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="border border-slate-700 p-2 text-left">Sr.</th>
                <th className="border border-slate-700 p-2 text-left">Subject</th>
                <th className="border border-slate-700 p-2 text-left">Class</th>
                <th className="border border-slate-700 p-2 text-left">Session</th>
                <th className="border border-slate-700 p-2 text-left">Time</th>
                <th className="border border-slate-700 p-2 text-left">Date</th>
                <th className="border border-slate-700 p-2 text-left">Day</th>
              </tr>
            </thead>
            <tbody>
              {sorted.filter((r) => r.subject || r.date).map((r, i) => (
                <tr key={r.id}>
                  <td className="border border-slate-300 p-2">{i + 1}</td>
                  <td className="border border-slate-300 p-2 font-medium">{r.subject || '—'}</td>
                  <td className="border border-slate-300 p-2">{r.className || '—'}</td>
                  <td className="border border-slate-300 p-2">{r.session}</td>
                  <td className="border border-slate-300 p-2">{r.time || '—'}</td>
                  <td className="border border-slate-300 p-2">
                    {r.date ? new Date(r.date + 'T12:00:00').toLocaleDateString('en-GB') : '—'}
                  </td>
                  <td className="border border-slate-300 p-2">{r.day || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-slate-500 mt-4 text-center">Students must reach the centre 30 minutes before the paper. Mobile phones are not allowed.</p>
        </div>
      </div>
    </div>
  )
}
