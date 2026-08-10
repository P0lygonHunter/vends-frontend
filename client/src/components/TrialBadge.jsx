import { useEffect, useState } from 'react'
import axios from 'axios'

export default function TrialBadge() {
  const [schoolInfo, setSchoolInfo] = useState(null)

  useEffect(() => {
    const fetchSchoolInfo = async () => {
      const schoolId = localStorage.getItem('schoolId')
      if (!schoolId) return

      try {
        const res = await axios.get(
          `http://localhost:5000/api/school/check/${schoolId}`
        )
        setSchoolInfo(res.data.school)
      } catch (err) {
        console.log(err)
      }
    }

    fetchSchoolInfo()
  }, [])

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

  const plan = schoolInfo?.plan || 'free_trial'

  return (
    <div
      className="px-3 py-1 rounded-full text-white text-xs font-bold"
      style={{
        background: 'linear-gradient(135deg,#f59e0b,#ef4444)'
      }}
    >
      {plan === 'free_trial' ? (
        <>⏳ Trial: {getDaysLeft()} days left</>
      ) : (
        <>💎 {getPlanName()}</>
      )}
    </div>
  )
}