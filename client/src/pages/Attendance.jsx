import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import TrialBadge from '../components/TrialBadge'
import axios from 'axios'
import API_BASE_URL from '../config/api'

const colors = ['#4f46e5','#ef4444','#10b981','#f59e0b','#7c3aed','#0ea5e9','#ec4899','#14b8a6']

const grades = [
  'All Grades','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5',
  'Grade 6','Grade 7','Grade 8','Matric (Pre-9th)',
  'Matric (9th)','Matric (10th)',
  'FSc Pre-Medical (11th)','FSc Pre-Medical (12th)',
  'FSc Pre-Engineering (11th)','FSc Pre-Engineering (12th)',
  'ICS (11th)','ICS (12th)',
]

export default function Attendance() {
  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState({})
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedGrade, setSelectedGrade] = useState('All Grades')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  const schoolName = localStorage.getItem('schoolName') || 'Your School'
  const schoolId = localStorage.getItem('schoolId')

  useEffect(() => { fetchStudents() }, [])
  useEffect(() => { fetchAttendance() }, [date])

  const fetchStudents = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/students/${schoolId}`)
      setStudents(res.data)

      const att = {}
      res.data.forEach(s => att[s._id] = 'P')
      setAttendance(att)
    } catch (err) {
      console.log(err)
    }

    setLoading(false)
  }

  const fetchAttendance = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/attendance/${schoolId}/${date}`)

      if (res.data.length > 0) {
        const att = {}
        res.data.forEach(r => att[r.studentId] = r.status)
        setAttendance(att)
      }
    } catch (err) {
      console.log(err)
    }
  }

  const filtered = students.filter(s =>
    selectedGrade === 'All Grades' ? true : s.grade === selectedGrade
  )

  const setStatus = (id, status) => {
    setAttendance({...attendance, [id]: status})
    setSaved(false)
  }

  const saveAttendance = async () => {
    try {
      const records = filtered.map(s => ({
        studentId: s._id,
        studentName: s.name,
        grade: s.grade,
        status: attendance[s._id] || 'P'
      }))

      await axios.post(`${API_BASE_URL}/attendance`, {
        schoolId,
        date,
        records
      })

      setSaved(true)

      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.log(err)
    }
  }

  const presentCount = filtered.filter(
    s => attendance[s._id] === 'P'
  ).length

  const absentCount = filtered.filter(
    s => attendance[s._id] === 'A'
  ).length

  return (
    <div className="flex min-h-screen" style={{background:'#f8fafc'}}>
      <Sidebar schoolName={schoolName} />

      <div style={{marginLeft:'260px', flex:1}}>
        <div className="flex items-center gap-4 px-8 bg-white"
          style={{height:'68px', borderBottom:'1px solid #e2e8f0', position:'sticky', top:0, zIndex:50}}>
          
          <h2 className="flex-1 font-bold text-xl"
            style={{fontFamily:'Syne,sans-serif'}}>
            Attendance System
          </h2>

          <TrialBadge />
        </div>

        <div className="p-8">
          {saved && (
            <div className="fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-white font-semibold text-sm flex items-center gap-2"
              style={{background:'#1e1b4b', boxShadow:'0 8px 32px rgba(0,0,0,0.2)'}}>
              ✅ Attendance saved to database!
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-5 mb-6">

            <div className="bg-white rounded-2xl p-5 border flex items-center gap-4"
              style={{borderColor:'#e2e8f0'}}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{background:'#ecfdf5'}}>
                ✅
              </div>

              <div>
                <div className="font-bold text-2xl"
                  style={{fontFamily:'Syne,sans-serif'}}>
                  {presentCount}
                </div>
                <div className="text-sm" style={{color:'#475569'}}>
                  Present Today
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border flex items-center gap-4"
              style={{borderColor:'#e2e8f0'}}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{background:'#fef2f2'}}>
                ❌
              </div>

              <div>
                <div className="font-bold text-2xl"
                  style={{fontFamily:'Syne,sans-serif'}}>
                  {absentCount}
                </div>
                <div className="text-sm" style={{color:'#475569'}}>
                  Absent Today
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border flex items-center gap-4"
              style={{borderColor:'#e2e8f0'}}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{background:'#eef2ff'}}>
                📊
              </div>

              <div>
                <div className="font-bold text-2xl"
                  style={{fontFamily:'Syne,sans-serif'}}>
                  {filtered.length > 0
                    ? Math.round((presentCount / filtered.length) * 100)
                    : 0}%
                </div>

                <div className="text-sm" style={{color:'#475569'}}>
                  Attendance Rate
                </div>
              </div>
            </div>

          </div>

          <div className="bg-white rounded-2xl border"
            style={{borderColor:'#e2e8f0'}}>

            <div className="flex items-center gap-4 px-6 py-4"
              style={{borderBottom:'1px solid #e2e8f0'}}>

              <span className="font-bold text-sm">
                📅 Date:
              </span>

              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="px-4 py-2 rounded-xl border-2 text-sm outline-none focus:border-indigo-500"
                style={{borderColor:'#e2e8f0'}}
              />

              <select
                value={selectedGrade}
                onChange={e => setSelectedGrade(e.target.value)}
                className="px-4 py-2 rounded-xl border-2 text-sm outline-none"
                style={{borderColor:'#e2e8f0'}}
              >
                {grades.map(g => (
                  <option key={g}>{g}</option>
                ))}
              </select>

              <button
                onClick={saveAttendance}
                className="ml-auto px-5 py-2 rounded-xl text-white text-sm font-bold"
                style={{background:'#4f46e5'}}>
                💾 Save Attendance
              </button>

            </div>

            {loading ? (
              <div className="text-center py-16 text-slate-400">
                Loading students...
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                No students found — add students first!
              </div>
            ) : (
              filtered.map((s,i) => (
                <div
                  key={s._id}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors"
                  style={{
                    borderBottom: i < filtered.length - 1
                      ? '1px solid #f1f5f9'
                      : 'none'
                  }}>

                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{background: colors[i % colors.length]}}>
                    {s.name.split(' ').map(x=>x[0]).join('').slice(0,2)}
                  </div>

                  <div className="flex-1 font-semibold text-sm">
                    {s.name}
                  </div>

                  <div className="text-sm w-32"
                    style={{color:'#94a3b8'}}>
                    {s.grade}
                  </div>

                  <div className="flex gap-2">

                    <button
                      onClick={() => setStatus(s._id, 'P')}
                      className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                      style={{
                        background: attendance[s._id] === 'P'
                          ? '#10b981'
                          : '#ecfdf5',
                        color: attendance[s._id] === 'P'
                          ? '#fff'
                          : '#059669'
                      }}>
                      ✓ Present
                    </button>

                    <button
                      onClick={() => setStatus(s._id, 'A')}
                      className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                      style={{
                        background: attendance[s._id] === 'A'
                          ? '#ef4444'
                          : '#fef2f2',
                        color: attendance[s._id] === 'A'
                          ? '#fff'
                          : '#dc2626'
                      }}>
                      ✗ Absent
                    </button>

                  </div>
                </div>
              ))
            )}

          </div>
        </div>
      </div>
    </div>
  )
}