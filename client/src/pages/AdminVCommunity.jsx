import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import CommunicationCenter from './CommunicationCenter'
import { setPwaEntry } from '../utils/pwaEntry'
import { schedulePushPrompt } from '../services/pushNotifications'

/**
 * School-admin mobile PWA shell — messages only (no full ERP sidebar).
 * How to use:
 * 1. Log in as school on phone browser: https://vends-frontend.vercel.app/?admin=1
 * 2. Open https://vends-frontend.vercel.app/admin/v-community
 * 3. Chrome menu → Install app / Add to Home screen
 * 4. Open installed app → only V-Community chat (Parents/Teachers/Broadcast)
 * Desktop browser ERP stays separate at /dashboard etc.
 */
export default function AdminVCommunity() {
  const authed = !!localStorage.getItem('authToken') && !!localStorage.getItem('schoolId')

  useEffect(() => {
    if (!authed) return
    setPwaEntry('admin', localStorage.getItem('schoolId') || '')
    schedulePushPrompt('school')
  }, [authed])

  if (!authed) return <Navigate to="/?admin=1" replace />

  return <CommunicationCenter shell="mobile" />
}
