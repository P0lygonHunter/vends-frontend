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
    time: '9:00 AM',
    teacher: '',
    marks: '100',
  }
}

function dayName(iso) {
  if (!iso) return ''
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long' })
  } catch {
    return ''
  }
}

/** Next calendar day; skip Sunday (0) so weekly papers land on working days */
function nextExamDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return ''
  d.setDate(d.getDate() + 1)
  while (d.getDay() === 0) d.setDate(d.getDate() + 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(file)
  })
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
  const [logoUrl, setLogoUrl] = useState('')
  const [wmMode, setWmMode] = useState('text') // text | logo | off
  const [wmLogoUrl, setWmLogoUrl] = useState('')
  const [skipSunday, setSkipSunday] = useState(true)

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
        if (p.logoUrl) setLogoUrl(p.logoUrl)
        if (p.wmMode) setWmMode(p.wmMode)
        if (p.wmLogoUrl) setWmLogoUrl(p.wmLogoUrl)
        if (typeof p.skipSunday === 'boolean') setSkipSunday(p.skipSunday)
      }
    } catch (_) {}
  }, [])

  useEffect(() => {
    if (readOnly) return
    localStorage.setItem(
      'se_datesheet_draft',
      JSON.stringify({ meta, rows, logoUrl, wmMode, wmLogoUrl, skipSunday })
    )
  }, [meta, rows, logoUrl, wmMode, wmLogoUrl, skipSunday, readOnly])

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
        if (field === 'date') next.day = dayName(value)
        return next
      })
    )
  }

  const addRow = () => {
    if (readOnly) return
    setRows((r) => [...r, emptyRow()])
  }

  const copyRow = (id) => {
    if (readOnly) return
    setRows((prev) => {
      const idx = prev.findIndex((x) => x.id === id)
      if (idx < 0) return prev
      const src = prev[idx]
      let nextDate = src.date ? nextExamDate(src.date) : ''
      if (!skipSunday && src.date) {
        const d = new Date(src.date + 'T12:00:00')
        d.setDate(d.getDate() + 1)
        nextDate = d.toISOString().slice(0, 10)
      }
      const copy = {
        ...src,
        id: Date.now() + Math.random(),
        date: nextDate,
        day: dayName(nextDate),
        subject: src.subject || '',
      }
      const out = [...prev]
      out.splice(idx + 1, 0, copy)
      return out
    })
  }

  const removeRow = (id) => {
    if (readOnly) return
    setRows((r) => (r.length <= 1 ? r : r.filter((x) => x.id !== id)))
  }

  const newSheet = () => {
    if (readOnly) return
    if (!window.confirm('Start a new blank date sheet? Current draft stays in browser until you overwrite.')) return
    setRows([emptyRow()])
    setMeta((m) => ({ ...m, examSeries: 'New exam series', subtitle: 'Date Sheet' }))
  }

  const onLogo = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const url = await fileToDataUrl(f)
    setLogoUrl(url)
  }

  const onWmLogo = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const url = await fileToDataUrl(f)
    setWmLogoUrl(url)
    setWmMode('logo')
  }

  const printSheet = () => window.print()

  const sorted = useMemo(() => {
    return [...rows].sort(
      (a, b) => String(a.date).localeCompare(String(b.date)) || String(a.session).localeCompare(String(b.session))
    )
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
          .app-main { margin-left: 0 !important; padding: 12px !important; }
        }
        .ds-watermark {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }
        .ds-watermark span {
          font-size: 42px;
          font-weight: 800;
          color: rgba(15, 23, 42, 0.06);
          transform: rotate(-28deg);
          white-space: nowrap;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .ds-watermark img {
          max-width: 55%;
          max-height: 55%;
          opacity: 0.08;
          transform: rotate(-20deg);
          object-fit: contain;
        }
        .sheet-print-inner { position: relative; z-index: 1; }
      `}</style>

      <div
        className="app-main"
        style={{ flex: 1, minWidth: 0, padding: '24px', boxSizing: 'border-box', overflowX: 'hidden', overflowY: 'auto' }}
      >
        <div className="no-print mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Syne, sans-serif' }}>
              Date Sheet Generator
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Standard / Premium. Copy row = next day (Sunday skipped). Optional logo + watermark.
            </p>
          </div>
          <button
            type="button"
            disabled={readOnly}
            onClick={newSheet}
            className="px-4 py-2 rounded-xl text-sm font-bold border"
            style={{ borderColor: '#e2e8f0', background: '#fff', color: '#0f172a' }}
          >
            + Create new date sheet
          </button>
        </div>

        {readOnly && (
          <div className="no-print mb-4 px-4 py-2 rounded-xl text-sm bg-amber-50 text-amber-900 border border-amber-200">
            Plan grace / expired — edit locked; print still works.
          </div>
        )}

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
            <label className="block text-xs font-semibold text-slate-500 mb-2">
              School logo (optional — header)
              <input type="file" accept="image/*,.svg" disabled={readOnly} onChange={onLogo} className="mt-1 block w-full text-sm" />
            </label>
            {logoUrl && (
              <button type="button" className="text-xs text-rose-600 font-semibold mb-2" onClick={() => setLogoUrl('')}>
                Remove logo
              </button>
            )}
            <div className="text-xs font-semibold text-slate-500 mb-1">Watermark</div>
            <div className="flex flex-wrap gap-3 text-sm mb-2">
              {[
                { id: 'text', label: 'School name text' },
                { id: 'logo', label: 'Logo file' },
                { id: 'off', label: 'Off' },
              ].map((o) => (
                <label key={o.id} className="flex items-center gap-1.5">
                  <input type="radio" name="wm" checked={wmMode === o.id} onChange={() => setWmMode(o.id)} disabled={readOnly} />
                  {o.label}
                </label>
              ))}
            </div>
            {wmMode === 'logo' && (
              <input type="file" accept="image/*,.svg" disabled={readOnly} onChange={onWmLogo} className="block w-full text-sm mb-2" />
            )}
            <div className="flex flex-wrap gap-4 mt-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={checkClass} onChange={(e) => setCheckClass(e.target.checked)} />
                Class same-slot clash
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={checkTeacher} onChange={(e) => setCheckTeacher(e.target.checked)} />
                Teacher same-slot clash
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={skipSunday} onChange={(e) => setSkipSunday(e.target.checked)} />
                Copy row skips Sunday
              </label>
            </div>
          </div>

          <div className="bg-white rounded-2xl border p-4" style={{ borderColor: '#e2e8f0' }}>
            <h2 className="font-bold text-sm mb-2">Live conflicts</h2>
            <div className="flex gap-2 mb-3">
              <span className="px-3 py-1 rounded-lg text-sm font-bold bg-emerald-50 text-emerald-800">{rows.length} row(s)</span>
              <span className="px-3 py-1 rounded-lg text-sm font-bold bg-rose-50 text-rose-800">{conflicts.length} clash(es)</span>
            </div>
            {conflicts.length === 0 ? (
              <p className="text-sm text-slate-500">No clashes with current toggles.</p>
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
                + Add blank entry
              </button>
              <button type="button" onClick={printSheet} className="px-4 py-2 rounded-xl text-sm font-bold border" style={{ borderColor: '#bae6fd', color: '#0369a1' }}>
                Print / PDF
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-3">Tip: use <strong>Copy</strong> on a row for the next subject — date jumps to next day (Sunday skipped if enabled).</p>
          </div>
        </div>

        <div className="no-print bg-white rounded-2xl border p-4 mb-6 overflow-x-auto max-w-full" style={{ borderColor: '#e2e8f0' }}>
          <h2 className="font-bold text-sm mb-3">Exam entries</h2>
          <table className="w-full text-sm min-w-[920px]">
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
                <th>Actions</th>
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
                    <input disabled={readOnly} value={r.className} onChange={(e) => updateRow(r.id, 'className', e.target.value)} placeholder="10-Blue" className="border rounded-lg px-2 py-1 w-[100px]" />
                  </td>
                  <td className="pr-1">
                    <input disabled={readOnly} value={r.time} onChange={(e) => updateRow(r.id, 'time', e.target.value)} placeholder="9:00 AM" className="border rounded-lg px-2 py-1 w-[100px]" />
                  </td>
                  <td className="pr-1">
                    <input disabled={readOnly} value={r.teacher} onChange={(e) => updateRow(r.id, 'teacher', e.target.value)} placeholder="Optional" className="border rounded-lg px-2 py-1 w-[100px]" />
                  </td>
                  <td className="pr-1">
                    <input disabled={readOnly} value={r.marks} onChange={(e) => updateRow(r.id, 'marks', e.target.value)} placeholder="100" className="border rounded-lg px-2 py-1 w-[60px]" />
                  </td>
                  <td className="whitespace-nowrap">
                    <button type="button" disabled={readOnly} onClick={() => copyRow(r.id)} className="text-sky-700 text-xs font-bold mr-2">
                      Copy
                    </button>
                    <button type="button" disabled={readOnly} onClick={() => removeRow(r.id)} className="text-rose-600 text-xs font-bold">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="sheet-print bg-white rounded-2xl border p-6 max-w-4xl mx-auto relative overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
          {wmMode === 'text' && meta.schoolName && (
            <div className="ds-watermark" aria-hidden>
              <span>{meta.schoolName}</span>
            </div>
          )}
          {wmMode === 'logo' && wmLogoUrl && (
            <div className="ds-watermark" aria-hidden>
              <img src={wmLogoUrl} alt="" />
            </div>
          )}
          <div className="sheet-print-inner">
            <div className="text-center border-b-2 border-slate-800 pb-3 mb-4">
              {logoUrl && <img src={logoUrl} alt="Logo" style={{ maxHeight: 64, margin: '0 auto 8px' }} />}
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
                {sorted
                  .filter((r) => r.subject || r.date)
                  .map((r, i) => (
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
            <p className="text-xs text-slate-500 mt-4 text-center">
              Students must reach the centre 30 minutes before the paper. Mobile phones are not allowed.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
