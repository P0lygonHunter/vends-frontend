import { useEffect, useState } from 'react'
import { fetchSchoolInfo } from '../services/schoolApi'

const PLAN_BADGE_STYLES = {
  free_trial: {
    icon: '⏳',
    label: 'Trial',
    background: '#fff7ed',
    color: '#c2410c',
    border: '#fdba74'
  },
  lite: {
    icon: '💎',
    label: 'Lite Edition',
    background: '#eef2ff',
    color: '#4f46e5',
    border: '#c7d2fe'
  },
  zk: {
    icon: '💎',
    label: 'ZK Edition',
    background: '#f5f3ff',
    color: '#7c3aed',
    border: '#ddd6fe'
  }
}

export default function TrialBadge() {
  const [school, setSchool] = useState(null)

  useEffect(() => {
    const loadSchool = async () => {
      try {
        const schoolId = localStorage.getItem('schoolId')

        if (!schoolId) return

        const res = await fetchSchoolInfo(schoolId)

        setSchool(res.data.school)
      } catch (err) {
        console.log('TrialBadge error:', err)
      }
    }

    loadSchool()
  }, [])

  if (!school) {
    return null
  }

  const expiryDate = new Date(school.expiryDate)
  const now = new Date()

  const diff = expiryDate - now
  const daysLeft = Math.max(
    0,
    Math.ceil(diff / (1000 * 60 * 60 * 24))
  )

  const isExpired = daysLeft <= 0
  const plan = school.plan || 'free_trial'

  const currentPlan = PLAN_BADGE_STYLES[plan] || PLAN_BADGE_STYLES.free_trial
  const label = isExpired ? `${currentPlan.label} Expired` : currentPlan.label
  const badgeText = isExpired
    ? label
    : `${label} : ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
      style={{
        background: isExpired ? '#fef2f2' : currentPlan.background,
        color: isExpired ? '#dc2626' : currentPlan.color,
        border: `1px solid ${isExpired ? '#fecaca' : currentPlan.border}`
      }}
    >
      <span>
        {isExpired ? '⚠' : currentPlan.icon}
      </span>

      <span>
        {badgeText}
      </span>
    </div>
  )
}
