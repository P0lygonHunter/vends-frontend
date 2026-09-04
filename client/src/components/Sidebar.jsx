import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import axios from 'axios'
import API_BASE_URL from '../config/api'
import { fetchSchoolInfo } from '../services/schoolApi'
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  ClipboardList,
  FileBarChart,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Library,
  ReceiptText,
  Settings,
  Sparkles,
  WalletCards,
  Users,
  PenLine
} from 'lucide-react'

const navIcons = {
  dashboard: LayoutDashboard,
  academicYears: CalendarDays,
  classes: Library,
  students: GraduationCap,
  teachers: Users,
  subjects: BookOpen,
  attendance: CheckSquare,
  exams: ClipboardCheck,
  assignments: ClipboardList,
  fees: WalletCards,
  financial: BarChart3,
  timetable: CalendarDays,
  reports: FileBarChart,
  documents: FileText,
  testGenerator: PenLine,
  resultCard: ReceiptText,
  subscription: Sparkles,
  settings: Settings
}

export default function Sidebar({ schoolName }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [schoolInfo, setSchoolInfo] = useState(null)

  useEffect(() => {
    const loadSchoolInfo = async () => {
      const schoolId = localStorage.getItem('schoolId')
      if (!schoolId) return
      try {
        const res = await fetchSchoolInfo(schoolId)
        setSchoolInfo(res.data.school)
      } catch (err) {
        console.log(err)
      }
    }

    const checkStatus = async () => {
      const schoolId = localStorage.getItem('schoolId')
      if (!schoolId) return
      try {
        await axios.get(`${API_BASE_URL}/school/check/${schoolId}`)
      } catch (err) {
        if (err.response && err.response.status === 403) {
          localStorage.clear()
          navigate('/')
        }
      }
    }

    loadSchoolInfo()
    const interval = setInterval(checkStatus, 15000)
    return () => clearInterval(interval)
  }, [navigate])

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

  const navItems = [
    { path: '/dashboard', icon: navIcons.dashboard, label: 'Dashboard' },
    { path: '/academic-years', icon: navIcons.academicYears, label: 'Academic Years' },
    { path: '/classes', icon: navIcons.classes, label: 'Classes' },
    { path: '/students', icon: navIcons.students, label: 'Students' },
    { path: '/teachers', icon: navIcons.teachers, label: 'Teachers' },
    { path: '/subjects', icon: navIcons.subjects, label: 'Subjects' },
    { path: '/attendance', icon: navIcons.attendance, label: 'Attendance' },
    { path: '/exams-results', icon: navIcons.exams, label: 'Exams & Results' },
    { path: '/assignments', icon: navIcons.assignments, label: 'Assignments' },
    { path: '/fees', icon: navIcons.fees, label: 'Fees' },
    { path: '/financial-management', icon: navIcons.financial, label: 'Financial Management' },
    { path: '/timetable', icon: navIcons.timetable, label: 'Timetable' },
    { path: '/reports', icon: navIcons.reports, label: 'Reports' },
    { path: '/documents', icon: navIcons.documents, label: 'Documents' },
    { path: '/test-generator', icon: navIcons.testGenerator, label: 'Test Generator' },
    { path: '/result-generator', icon: navIcons.resultCard, label: 'Result Card' },
    { path: '/subscription', icon: navIcons.subscription, label: 'Subscription' },
    { path: '/settings', icon: navIcons.settings, label: 'Settings' },
  ]

  return (
    <aside className="fixed left-0 top-0 bottom-0 flex flex-col overflow-y-auto"
      style={{width:'260px', height:'100vh', background:'#1e1b4b', scrollbarWidth:'thin', scrollbarColor:'rgba(255,255,255,0.35) transparent'}}>

      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-6"
        style={{borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{background:'#4f46e5'}}>
          <GraduationCap size={21} strokeWidth={2.2} aria-hidden="true" />
        </div>
        <div>
          <div className="text-white font-bold text-base"
            style={{fontFamily:'Syne,sans-serif'}}>Vends EduCore</div>
          <div className="text-xs" style={{color:'rgba(255,255,255,0.45)'}}>
            {schoolName || 'Your School'}
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex flex-col gap-1 px-3 py-5">
        <div className="text-xs font-bold px-3 mb-2"
          style={{color:'rgba(255,255,255,0.35)',letterSpacing:'1.5px'}}>MAIN</div>
        {navItems.slice(0,9).map(item => (
          <div key={item.path}
            onClick={() => navigate(item.path)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all text-sm font-medium"
            style={{
              background: location.pathname === item.path ? '#4f46e5' : 'transparent',
              color: location.pathname === item.path ? '#fff' : 'rgba(255,255,255,0.6)'
            }}>
            <item.icon size={18} strokeWidth={2} aria-hidden="true" />
            {item.label}
          </div>
        ))}

        <div className="text-xs font-bold px-3 mb-2 mt-4"
          style={{color:'rgba(255,255,255,0.35)',letterSpacing:'1.5px'}}>MANAGEMENT</div>
        {navItems.slice(9).map(item => (
          <div key={item.path}
            onClick={() => navigate(item.path)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all text-sm font-medium"
            style={{
              background: location.pathname === item.path ? '#4f46e5' : 'transparent',
              color: location.pathname === item.path ? '#fff' : 'rgba(255,255,255,0.6)'
            }}>
            <item.icon size={18} strokeWidth={2} aria-hidden="true" />
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
