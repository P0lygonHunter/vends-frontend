import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import axios from 'axios'

export default function Sidebar({ schoolName }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [schoolInfo, setSchoolInfo] = useState(null)

  useEffect(() => {
    fetchSchoolInfo()
    const interval = setInterval(checkStatus, 15000)
    return () => clearInterval(interval)
  }, [])

  const fetchSchoolInfo = async () => {
    const schoolId = localStorage.getItem('schoolId')
    if (!schoolId) return
    try {
      const res = await axios.get(`http://localhost:5000/api/school/check/${schoolId}`)
      setSchoolInfo(res.data.school)
    } catch (err) {
      console.log(err)
    }
  }

  const checkStatus = async () => {
    const schoolId = localStorage.getItem('schoolId')
    if (!schoolId) return
    try {
      await axios.get(`http://localhost:5000/api/school/check/${schoolId}`)
    } catch (err) {
      if (err.response && err.response.status === 403) {
        localStorage.clear()
        navigate('/')
      }
    }
  }

  const getDaysLeft = () => {
    if (!schoolInfo?.expiryDate) return 7
    const diff = new Date(schoolInfo.expiryDate) - new Date()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days > 0 ? days : 0
  }

  const getPlanName = () => {
    if (!schoolInfo?.plan) return 'Free Trial'
    if (schoolInfo.plan === 'free_trial') return 'Free Trial'
    if (schoolInfo.plan === 'lite') return 'Lite Edition'
    if (schoolInfo.plan === 'zk') return 'ZK Edition'
    return schoolInfo.plan
  }

  const getBarWidth = () => {
    const days = getDaysLeft()
    if (schoolInfo?.plan === 'lite' || schoolInfo?.plan === 'zk') return '100%'
    return `${Math.min((days / 30) * 100, 100)}%`
  }

  // Added "Result Card Generator" entry inside navItems array
  const navItems = [
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/students', icon: '👨‍🎓', label: 'Students' },
    { path: '/teachers', icon: '👩‍🏫', label: 'Teachers' },
    { path: '/attendance', icon: '✅', label: 'Attendance' },
    { path: '/test-generator', icon: '📝', label: 'Test Generator' },
    { path: '/result-generator', icon: '📋', label: 'Result Card' },
    { path: '/subscription', icon: '💎', label: 'Subscription' },
    { path: '/settings', icon: '⚙️', label: 'Settings' },
  ]

  return (
    <aside className="fixed left-0 top-0 bottom-0 flex flex-col"
      style={{width:'260px', background:'#1e1b4b'}}>

      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-6"
        style={{borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
          style={{background:'#4f46e5'}}>🎓</div>
        <div>
          <div className="text-white font-bold text-base"
            style={{fontFamily:'Syne,sans-serif'}}>Vends EduCore</div>
          <div className="text-xs" style={{color:'rgba(255,255,255,0.45)'}}>
            {schoolName || 'Your School'}
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex flex-col gap-1 px-3 py-5 flex-1">
        <div className="text-xs font-bold px-3 mb-2"
          style={{color:'rgba(255,255,255,0.35)',letterSpacing:'1.5px'}}>MAIN</div>
        {navItems.slice(0,4).map(item => (
          <div key={item.path}
            onClick={() => navigate(item.path)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all text-sm font-medium"
            style={{
              background: location.pathname === item.path ? '#4f46e5' : 'transparent',
              color: location.pathname === item.path ? '#fff' : 'rgba(255,255,255,0.6)'
            }}>
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </div>
        ))}

        <div className="text-xs font-bold px-3 mb-2 mt-4"
          style={{color:'rgba(255,255,255,0.35)',letterSpacing:'1.5px'}}>MANAGEMENT</div>
        {navItems.slice(4).map(item => (
          <div key={item.path}
            onClick={() => navigate(item.path)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all text-sm font-medium"
            style={{
              background: location.pathname === item.path ? '#4f46e5' : 'transparent',
              color: location.pathname === item.path ? '#fff' : 'rgba(255,255,255,0.6)'
            }}>
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </div>
        ))}
      </div>

      {/* Plan Card */}
      <div className="px-3 pb-3">
        <div className="rounded-xl p-4 mb-3"
          style={{background:'rgba(99,102,241,0.2)', border:'1px solid rgba(99,102,241,0.3)'}}>
          <div className="text-white text-xs font-bold mb-1">
            🟡 {getPlanName()}
          </div>
          <div className="text-xs" style={{color:'rgba(255,255,255,0.55)'}}>
            {getDaysLeft()} days remaining · {schoolInfo?.studentLimit || 100} student limit
          </div>
          <div className="mt-3 h-1 rounded-full" style={{background:'rgba(255,255,255,0.15)'}}>
            <div className="h-full rounded-full transition-all"
              style={{
                background: getDaysLeft() <= 3 ? '#ef4444' : '#f59e0b',
                width: getBarWidth()
              }}>
            </div>
          </div>
        </div>

        {/* Logout */}
        <div onClick={() => { localStorage.clear(); navigate('/') }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer text-sm"
          style={{color:'#f87171'}}>
          <span>🚪</span> Logout
        </div>
      </div>
    </aside>
  )
}