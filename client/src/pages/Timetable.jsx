import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Printer } from 'lucide-react'
import axios from 'axios'
import PageLayout from '../components/PageLayout'
import API_BASE_URL from '../config/api'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DEFAULT_PERIODS = [
  { key: 'p1', label: 'Period 1', time: '08:00 - 08:45' },
  { key: 'p2', label: 'Period 2', time: '08:45 - 09:30' },
  { key: 'p3', label: 'Period 3', time: '09:30 - 10:15' },
  { key: 'break', label: 'BREAK', time: '10:15 - 10:45', isBreak: true },
  { key: 'p4', label: 'Period 4', time: '10:45 - 11:30' },
  { key: 'p5', label: 'Period 5', time: '11:30 - 12:15' },
]

const blank = {
  academicYearId: '',
  classSectionId: '',
  subjectId: '',
  teacherId: '',
  day: 'Monday',
  startTime: '08:00',
  endTime: '08:45',
  room: '',
}

function periodKeyFromTimes(start) {
  const s = String(start || '').slice(0, 5)
  const hit = DEFAULT_PERIODS.find((p) => !p.isBreak && p.time.startsWith(s))
  if (hit) return hit.key
  return s
}

export default function Timetable() {
  const schoolId = localStorage.getItem('schoolId')
  const schoolName = localStorage.getItem('schoolName') || 'School'
  const [entries, setEntries] = useState([])
  const [years, setYears] = useState([])
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [teachers, setTeachers] = useState([])
  const [form, setForm] = useState(blank)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [filterYear, setFilterYear] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [a, y, c, s, t] = await Promise.all([
          axios.get(`${API_BASE_URL}/timetable/${schoolId}`),
          axios.get(`${API_BASE_URL}/academic-years/${schoolId}`),
          axios.get(`${API_BASE_URL}/classes/${schoolId}`),
          axios.get(`${API_BASE_URL}/subjects/${schoolId}`),
          axios.get(`${API_BASE_URL}/teachers/${schoolId}`),
        ])
        setEntries(Array.isArray(a.data) ? a.data : [])
        setYears(Array.isArray(y.data) ? y.data : [])
        setClasses(Array.isArray(c.data) ? c.data : [])
        setSubjects(Array.isArray(s.data) ? s.data : [])
        setTeachers(Array.isArray(t.data) ? t.data : [])
        const current = (Array.isArray(y.data) ? y.data : []).find((x) => x.isCurrent)
        if (current) setFilterYear(current._id)
      } catch (e) {
        setError(e.response?.data?.error || 'Unable to load timetable.')
      }
    }
    if (schoolId) load()
  }, [schoolId])

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filterClass && String(e.classSectionId?._id || e.classSectionId) !== filterClass) return false
      if (filterYear && String(e.academicYearId?._id || e.academicYearId) !== filterYear) return false
      return true
    })
  }, [entries, filterClass, filterYear])

  const grid = useMemo(() => {
    const map = {}
    for (const e of filtered) {
      const day = e.day || 'Monday'
      const pk = periodKeyFromTimes(e.startTime)
      if (!map[pk]) map[pk] = {}
      map[pk][day] = e
    }
    return map
  }, [filtered])

  const save = async (event) => {
    event.preventDefault()
    try {
      const response = await axios.post(`${API_BASE_URL}/timetable`, { ...form, schoolId })
      setEntries((current) => [...current, response.data])
      setShowForm(false)
      setForm(blank)
    } catch (e) {
      setError(e.response?.data?.error || 'Unable to save timetable entry.')
    }
  }

  const remove = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/timetable/${id}`)
      setEntries((current) => current.filter((entry) => entry._id !== id))
    } catch (e) {
      setError(e.response?.data?.error || 'Unable to delete timetable entry.')
    }
  }

  const subjectName = (e) => e?.subjectId?.name || e?.subjectName || '—'
  const teacherName = (e) => e?.teacherId?.name || e?.teacherName || ''
  const classLabel = (id) => {
    const c = classes.find((x) => x._id === id)
    return c?.name || c?.displayName || 'Class'
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print, aside, .app-sidebar, header, nav, button, .tt-toolbar { display: none !important; }
          body { background: white !important; }
          .tt-print-root { margin: 0; padding: 0; }
          .tt-grid { page-break-inside: avoid; }
        }
      `}</style>
      <PageLayout
        title="Timetable Generator"
        subtitle="Create, manage, and export conflict-free weekly schedules for your school."
        action={
          <div className="no-print flex flex-wrap gap-2 items-center">
            <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="px-3 py-2 rounded-xl border text-sm bg-white" style={{ borderColor: '#e2e8f0' }}>
              <option value="">All classes</option>
              {classes.map((c) => (<option key={c._id} value={c._id}>{c.name}</option>))}
            </select>
            <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="px-3 py-2 rounded-xl border text-sm bg-white" style={{ borderColor: '#e2e8f0' }}>
              <option value="">All years</option>
              {years.map((y) => (<option key={y._id} value={y._id}>{y.name}</option>))}
            </select>
            <button type="button" onClick={() => window.print()} className="px-4 py-2 rounded-xl text-sm font-bold border bg-white flex items-center gap-2" style={{ borderColor: '#e2e8f0' }}>
              <Printer size={16} /> Export / Print
            </button>
            <button type="button" onClick={() => setShowForm(true)} className="px-4 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-2" style={{ background: '#0284c7' }}>
              <Plus size={16} /> Add Slot
            </button>
          </div>
        }
      >
        <div className="tt-print-root">
          {error && <div className="no-print mb-4 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{error}</div>}
          <div className="mb-4 text-center print:block hidden">
            <h1 className="text-xl font-bold">{schoolName}</h1>
            <p className="text-sm text-slate-600">Weekly Timetable{filterClass ? ` · ${classLabel(filterClass)}` : ''}</p>
          </div>
          <div className="tt-grid overflow-x-auto rounded-2xl border bg-white" style={{ borderColor: '#e2e8f0' }}>
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th className="p-3 text-left font-bold text-slate-600 border-b" style={{ borderColor: '#e2e8f0', width: 140 }}>TIME / PERIOD</th>
                  {DAYS.map((d) => (
                    <th key={d} className="p-3 text-center font-bold text-slate-700 border-b border-l" style={{ borderColor: '#e2e8f0' }}>{d.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DEFAULT_PERIODS.map((period) => (
                  <tr key={period.key} style={{ background: period.isBreak ? '#e0f2fe' : '#fff' }}>
                    <td className="p-3 align-top border-b font-semibold text-slate-700" style={{ borderColor: '#e2e8f0' }}>
                      <div>{period.label}</div>
                      <div className="text-xs font-normal text-slate-400">{period.time}</div>
                    </td>
                    {DAYS.map((day) => {
                      if (period.isBreak) {
                        return (
                          <td key={day} className="p-2 text-center text-sky-800 font-semibold border-b border-l align-middle" style={{ borderColor: '#e2e8f0', background: '#e0f2fe' }}>
                            {day === 'Monday' ? 'BREAK' : ''}
                          </td>
                        )
                      }
                      const entry = grid[period.key]?.[day]
                      return (
                        <td key={day} className="p-2 border-b border-l align-top" style={{ borderColor: '#e2e8f0' }}>
                          {entry ? (
                            <div className="rounded-xl border bg-white p-2 shadow-sm relative group" style={{ borderColor: '#e2e8f0' }}>
                              <div className="font-bold text-slate-800">{subjectName(entry)}</div>
                              {teacherName(entry) && <div className="text-xs text-slate-500 mt-0.5">{teacherName(entry)}</div>}
                              {entry.room && <div className="mt-1 inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700">{entry.room}</div>}
                              <button type="button" onClick={() => remove(entry._id)} className="no-print absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 rounded text-rose-600" title="Remove"><Trash2 size={14} /></button>
                            </div>
                          ) : (
                            <div className="h-14 rounded-xl border border-dashed flex items-center justify-center text-xs text-slate-300" style={{ borderColor: '#e2e8f0' }}>Free Period</div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!filtered.length && <p className="no-print text-center text-sm text-slate-400 mt-6">No timetable entries for this filter. Click Add Slot to create one.</p>}
        </div>
        {showForm && (
          <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,.55)' }}>
            <form onSubmit={save} className="bg-white rounded-2xl p-7 w-full max-w-xl">
              <h3 className="font-bold text-xl mb-5">Add Timetable Entry</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {[['academicYearId','Academic Year',years],['classSectionId','Class',classes],['subjectId','Subject',subjects],['teacherId','Teacher',teachers]].map(([key,label,options]) => (
                  <select key={key} required={key !== 'teacherId'} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="px-3 py-3 rounded-xl border-2" style={{ borderColor: '#e2e8f0' }}>
                    <option value="">Select {label}</option>
                    {options.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
                  </select>
                ))}
                <select value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })} className="px-3 py-3 rounded-xl border-2" style={{ borderColor: '#e2e8f0' }}>
                  {DAYS.map((day) => <option key={day}>{day}</option>)}
                </select>
                <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="px-3 py-3 rounded-xl border-2" style={{ borderColor: '#e2e8f0' }} />
                <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className="px-3 py-3 rounded-xl border-2" style={{ borderColor: '#e2e8f0' }} />
                <input placeholder="Room" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} className="px-3 py-3 rounded-xl border-2" style={{ borderColor: '#e2e8f0' }} />
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl" style={{ border: '1px solid #e2e8f0' }}>Cancel</button>
                <button className="flex-1 py-3 rounded-xl text-white font-bold" style={{ background: '#0284c7' }}>Save Entry</button>
              </div>
            </form>
          </div>
        )}
      </PageLayout>
    </>
  )
}
