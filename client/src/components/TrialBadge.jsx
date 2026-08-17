import { useEffect, useState } from 'react'
import { fetchSchoolInfo } from '../services/schoolApi'

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
  const isUrgent = daysLeft <= 7

  const planLabel =
    school.plan === 'free_trial'
      ? 'Free Trial'
      : school.plan === 'lite'
        ? 'Lite Edition'
        : school.plan === 'zk'
          ? 'ZK Edition'
          : school.plan

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
      style={{
        background: isExpired
          ? '#fef2f2'
          : isUrgent
            ? '#fffbeb'
            : '#ecfdf5',

        color: isExpired
          ? '#dc2626'
          : isUrgent
            ? '#d97706'
            : '#059669',

        border: `1px solid ${
          isExpired
            ? '#fecaca'
            : isUrgent
              ? '#fde68a'
              : '#a7f3d0'
        }`
      }}
    >
      <span>
        {isExpired
          ? '⚠'
          : isUrgent
            ? '⏳'
            : '✓'}
      </span>

      <span>
        {isExpired
          ? `${planLabel} Expired`
          : `${planLabel} · ${daysLeft} ${
              daysLeft === 1 ? 'day' : 'days'
            } left`}
      </span>
    </div>
  )
}
