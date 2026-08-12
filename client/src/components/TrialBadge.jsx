import { useEffect, useState } from 'react'
import axios from 'axios'

export default function TrialBadge() {
  const schoolId = localStorage.getItem('schoolId')

  const [schoolInfo, setSchoolInfo] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchSchoolInfo = async () => {
    if (!schoolId) {
      setLoading(false)
      return
    }

    try {
      const res = await axios.get(
        `http://localhost:5000/api/school/check/${schoolId}`
      )

      setSchoolInfo(res.data.school)
    } catch (err) {
      console.log('TrialBadge:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSchoolInfo()

    // Real server data ko periodically refresh karega
    const interval = setInterval(fetchSchoolInfo, 15000)

    return () => clearInterval(interval)
  }, [])

  const getDaysLeft = () => {
    if (!schoolInfo?.expiryDate) return 0

    const diff =
      new Date(schoolInfo.expiryDate).getTime() - new Date().getTime()
      

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

  if (loading) {
    return (
      <div
        className="px-3 py-1 rounded-full text-white text-xs font-bold"
        style={{
          background: 'linear-gradient(135deg,#64748b,#475569)'
        }}
      >
        Loading...
      </div>
    )
  }

  const planName = getPlanName()
  const daysLeft = getDaysLeft()

  return (
    <div
      className="px-3 py-1 rounded-full text-white text-xs font-bold"
      style={{
        background:
          planName === 'Free Trial'
            ? 'linear-gradient(135deg,#f59e0b,#ef4444)'
            : planName === 'ZK Edition'
              ? 'linear-gradient(135deg,#7c3aed,#4f46e5)'
              : 'linear-gradient(135deg,#4f46e5,#6366f1)'
      }}
    >
      {planName === 'Free Trial'
        ? `⏳ Trial: ${daysLeft} days left`
        : `💎 ${planName}`}
    </div>
  )
}