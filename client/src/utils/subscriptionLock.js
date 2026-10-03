import axios from 'axios'
import API_BASE_URL from '../config/api'

/** Session key: user dismissed the grace modal this browser tab session */
export const GRACE_MODAL_DISMISS_KEY = 'vends_grace_modal_dismissed'

/**
 * Fetch subscription lifecycle for the logged-in school (auth token required).
 */
export async function fetchSubscriptionLifecycle() {
  const schoolId = localStorage.getItem('schoolId')
  if (!schoolId) {
    return {
      expired: false,
      softLock: false,
      inGrace: false,
      pastGrace: false,
      graceDaysLeft: null,
      graceDays: 7,
      purgeDays: 10,
    }
  }
  try {
    const { data } = await axios.get(`${API_BASE_URL}/school/check/${schoolId}`)
    return {
      expired: Boolean(data.subscriptionExpired || data.pastGrace),
      softLock: Boolean(data.softLock || data.inGrace || data.subscriptionExpired),
      inGrace: Boolean(data.inGrace),
      pastGrace: Boolean(data.pastGrace),
      graceDaysLeft: data.graceDaysLeft,
      graceDays: data.graceDays ?? 7,
      purgeDays: data.purgeDays ?? 10,
      school: data.school,
    }
  } catch (err) {
    if (err.response?.status === 403) {
      return {
        expired: true,
        softLock: false,
        inGrace: false,
        pastGrace: true,
        graceDaysLeft: 0,
        graceDays: 7,
        purgeDays: 10,
        blocked: true,
        error: err.response?.data?.error,
      }
    }
    return {
      expired: false,
      softLock: false,
      inGrace: false,
      pastGrace: false,
      graceDaysLeft: null,
      graceDays: 7,
      purgeDays: 10,
    }
  }
}
