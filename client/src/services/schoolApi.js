import axios from 'axios'
import API_BASE_URL from '../config/api'

let schoolInfoRequest = null

export const fetchSchoolInfo = (schoolId) => {
  if (!schoolInfoRequest) {
    schoolInfoRequest = axios
      .get(`${API_BASE_URL}/school/check/${schoolId}`)
      .finally(() => {
        schoolInfoRequest = null
      })
  }

  return schoolInfoRequest
}
