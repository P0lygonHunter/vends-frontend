import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import axios from 'axios'
import API_BASE_URL from '../config/api'

export default function Dashboard() {
  const navigate = useNavigate()
  const schoolName = localStorage.getItem('schoolName') || 'Your School'
  const principal = localStorage.getItem('principalName') || 'Admin'
  const schoolId = localStorage.getItem('schoolId')

  const [stats, setStats] = useState({ students: 0, teachers: 0, attendanceRate: 0, present: 0, absent: 0 })
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [daysLeft, setDaysLeft] = useState(7)
  const [planName, setPlanName] = useState('Free Trial')

  useEffect(() => {
    fetchData()
    fetchPlanInfo()
  }, [])

  const fetchPlanInfo = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/school/check/${schoolId}`)
      const school = res.data.school
      const diff = new Date(school.expiryDate) - new Date()
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
      setDaysLeft(days > 0 ? days : 0)
      if (school.plan === 'free_trial') setPlanName('Free Trial')
      else if (school.plan === 'lite') setPlanName('Lite Edition')
      else if (school.plan === 'zk') setPlanName('ZK Edition')
    } catch (err) {
      console.log(err)
    }
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
      })
      setActivity(studentsRes.data.slice(-5).reverse())
    } catch (err) {
      console.log(err)
    }
    setLoading(false)
  }

  const statCards = [
    { num: stats.students, label: 'Total Students', icon: '👨‍🎓', color: '#eef2ff', change: `${stats.students} registered`, up: true },
    { num: stats.teachers, label: 'Total Teachers', icon: '👩‍🏫', color: '#ecfdf5', change: `${stats.teachers} registered`, up: true },
    { num: stats.present, label: 'Present Today', icon: '✅', color: '#f0fdf4', change: `${stats.absent} absent today`, up: true },
    { num: `${stats.attendanceRate}%`, label: 'Attendance Rate', icon: '📈', color: '#fffbeb', change: 'Based on today', up: true },
  ]

  const colors = ['#4f46e5','#ef4444','#10b981','#f59e0b','#7c3aed']

  return (
    <div className="flex min-h-screen" style={{background:'#f8fafc'}}>
      <Sidebar schoolName={schoolName} />

      <div style={{marginLeft:'260px', flex:1}}>
        {/* Topbar */}
        <div className="flex items-center gap-4 px-8 bg-white"
          style={{height:'68px', borderBottom:'1px solid #e2e8f0', position:'sticky', top:0, zIndex:50}}>
          <h2 className="flex-1 font-bold text-xl" style={{fontFamily:'Syne,sans-serif'}}>Dashboard</h2>
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl"
            style={{background:'#f1f5f9', border:'1.5px solid #e2e8f0'}}>
            <span>🔍</span>
            <input placeholder="Search students, teachers..."
              className="bg-transparent outline-none text-sm w-48"/>
          </div>
          <div className="px-3 py-1 rounded-full text-white text-xs font-bold"
            style={{background:'linear-gradient(135deg,#f59e0b,#ef4444)'}}>
            ⏳ {planName === 'Free Trial' ? `Trial: ${daysLeft} days left` : planName}
          </div>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm cursor-pointer"
            style={{background:'#4f46e5'}}>
            {principal.slice(0,2).toUpperCase()}
          </div>
        </div>

        <div className="p-8">
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
                      style={{background:'#ecfdf5', color:'#059669'}}>
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